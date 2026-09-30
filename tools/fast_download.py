import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HOST = os.environ.get("DATABRICKS_HOST", "https://dbc-f0324168-47d3.cloud.databricks.com")
TOKEN = os.environ["DATABRICKS_TOKEN"]  # set via environment variable
VOLUME_BASE = "/Volumes/equinor_asa_volve_data_village/public/volvezipfiles"

DEST_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "volve")
os.makedirs(DEST_DIR, exist_ok=True)

CHUNK_SIZE = 1 * 1024 * 1024  # 1 MB chunks to prevent Databricks gateway drops
WORKERS = 12

def download_chunk_with_retry(url, headers, start, end, filepath, max_retries=5):
    for attempt in range(max_retries):
        try:
            chunk_headers = dict(headers)
            chunk_headers["Range"] = f"bytes={start}-{end}"
            req = urllib.request.Request(url, headers=chunk_headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            expected_len = (end - start) + 1
            if len(data) == expected_len:
                with open(filepath, "r+b") as f:
                    f.seek(start)
                    f.write(data)
                return len(data)
        except Exception:
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Failed chunk {start}-{end} after {max_retries} attempts")

def download_file(filename):
    import urllib.parse
    encoded_filename = urllib.parse.quote(filename)
    url = f"{HOST}/api/2.0/fs/files{VOLUME_BASE}/{encoded_filename}"
    local_path = os.path.join(DEST_DIR, filename)
    headers = {"Authorization": f"Bearer {TOKEN}"}

    print(f"\n[+] Connecting to Databricks: {filename}...")
    head_req = urllib.request.Request(url, headers=headers, method="HEAD")
    with urllib.request.urlopen(head_req, timeout=30) as resp:
        total_size = int(resp.headers.get("Content-Length", 0))

    print(f"    Size: {total_size / (1024**2):.2f} MB")
    
    # Pre-allocate destination file
    with open(local_path, "wb") as f:
        f.seek(total_size - 1)
        f.write(b"\0")

    # Generate 1 MB chunk boundaries
    ranges = []
    curr = 0
    while curr < total_size:
        end = min(curr + CHUNK_SIZE - 1, total_size - 1)
        ranges.append((curr, end))
        curr = end + 1

    print(f"    Dispatching {len(ranges)} parallel 1-MB chunks with {WORKERS} concurrent connections...")
    start_time = time.time()
    downloaded = 0

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        future_map = {
            executor.submit(download_chunk_with_retry, url, headers, r[0], r[1], local_path): r
            for r in ranges
        }
        for future in as_completed(future_map):
            sz = future.result()
            downloaded += sz
            elapsed = max(0.1, time.time() - start_time)
            speed_mbs = (downloaded / (1024**2)) / elapsed
            pct = (downloaded / total_size) * 100
            sys.stdout.write(f"\r    [{pct:5.1f}%] {downloaded/(1024**2):6.1f} / {total_size/(1024**2):6.1f} MB @ {speed_mbs:5.2f} MB/s (Elapsed: {elapsed:.0f}s)")
            sys.stdout.flush()

    total_time = time.time() - start_time
    avg_speed = (total_size / (1024**2)) / total_time
    print(f"\n[SUCCESS] Saved: {local_path} in {total_time:.1f}s ({avg_speed:.2f} MB/s)")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "Volve_Geophysical_Interpretations.zip"
    download_file(target)
