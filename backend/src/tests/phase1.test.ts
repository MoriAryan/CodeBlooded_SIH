import { describe, it, expect } from 'vitest';

describe('NWIS Backend — Real Volve Field End-to-End Slice Tests', () => {
  const API_BASE = 'http://localhost:3001/api';

  it('1. Fetches active well NO 15/9-F-11 with current depth and formation', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-F-11')}`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    const well = json.data;
    expect(well.well_id).toBe('NO 15/9-F-11');
    expect(well.status).toBe('active');
    expect(well.current_depth_md).toBe(2650);
    expect(well.current_formation).toBe('Hod Fm');
    expect(well.field_name).toBe('Volve');
    expect(well.operator).toBe('Statoil (Equinor)');
    expect(well.latitude).toBeDefined();
    expect(well.longitude).toBeDefined();
  });

  it('2. PostGIS returns nearby offset wells within radius', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-F-11')}/nearby?radius=15000`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(25);
    // Verified sorted by distance ascending
    for (let i = 1; i < json.data.length; i++) {
      expect(json.data[i].distance_m).toBeGreaterThanOrEqual(json.data[i - 1].distance_m);
    }
  });

  it('3. Correlation endpoint provides multi-factor relevance ranking across 25 offsets', async () => {
    const res = await fetch(`${API_BASE}/correlation/offsets/${encodeURIComponent('NO 15/9-F-11')}?radius=15000&lookahead=150`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    const offsets = json.data;
    expect(offsets.length).toBe(25);

    // Verify top offset is highly relevant
    const top = offsets[0];
    expect(top.overall_score).toBeGreaterThanOrEqual(80);
    expect(top.relevance_level).toBe('HIGH');
    expect(top.depth_overlap.covers_lookahead).toBe(true);
    expect(top.relevance_reasons.length).toBeGreaterThan(0);
  });

  it('4. Look-ahead search detects real upcoming incidents in lookahead window (2650m - 2800m)', async () => {
    const offsetIds = ['NO 15/9-F-4', 'NO 15/9-19 S', 'NO 15/9-19 BT2'];
    const wellsParam = offsetIds.map(w => encodeURIComponent(w)).join(',');
    const res = await fetch(
      `${API_BASE}/events/lookahead/search?wells=${wellsParam}&start=2650&end=2850`
    );
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    const events = json.data;
    expect(events.length).toBeGreaterThan(0);

    // Verify events have real operational remarks and document citations
    const sampleEvent = events[0];
    expect(sampleEvent.description).toBeDefined();
    expect(sampleEvent.source_document_ref).toBeDefined();
    expect(sampleEvent.source_page).toBeDefined();
  });

  it('5. Traceable Evidence Reader returns exact DDR page with PyMuPDF extracted text', async () => {
    // Get real DDR from database
    const docsRes = await fetch(`${API_BASE}/documents/well/${encodeURIComponent('NO 15/9-19 A')}`);
    const docsJson = await docsRes.json();
    const docId = docsJson.data[0].document_id;

    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}/pages/1`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    const page = json.data;
    expect(page.document_id).toBe(docId);
    expect(page.page_number).toBe(1);
    expect(page.ocr_applied).toBe(true);
    expect(page.ocr_confidence).toBeGreaterThan(0.9);
    expect(page.extracted_text.length).toBeGreaterThan(50);
  });
});
