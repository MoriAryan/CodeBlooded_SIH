import { describe, it, expect } from 'vitest';

describe('NWIS Backend — Real Volve Field Verification Tests', () => {
  const API_BASE = 'http://localhost:3001/api';

  it('health endpoint responds', async () => {
    const res = await fetch(`${API_BASE}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.service).toBe('nwis-backend');
  });

  it('database health shows table counts for Volve dataset', async () => {
    const res = await fetch(`${API_BASE}/health/db`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.tables).toBeDefined();
    expect(data.data.tables.wells).toBe(26);
    expect(data.data.tables.trajectory_points).toBeGreaterThanOrEqual(4000);
    expect(data.data.tables.drilling_events).toBeGreaterThanOrEqual(50);
  });

  it('returns all 26 official Volve wells', async () => {
    const res = await fetch(`${API_BASE}/wells`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBe(26);
  });

  it('returns active Volve platform well NO 15/9-F-11', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-F-11')}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.well_id).toBe('NO 15/9-F-11');
    expect(data.data.status).toBe('active');
    expect(data.data.current_depth_md).toBe(2650);
    expect(data.data.field_name).toBe('Volve');
  });

  it('returns nearby offsets for NO 15/9-F-11 via PostGIS', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-F-11')}/nearby?radius=15000`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBe(25);
    // Should have distance values
    expect(data.data[0].distance_m).toBeDefined();
  });

  it('returns official formation picks for NO 15/9-19 A', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-19 A')}/formations`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(10);
    const names = data.data.map((f: any) => f.formation_name);
    expect(names.some((n: string) => n.includes('Hod'))).toBe(true);
  });

  it('returns real trajectory survey stations for NO 15/9-19 A', async () => {
    const res = await fetch(`${API_BASE}/wells/${encodeURIComponent('NO 15/9-19 A')}/trajectory`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBe(313);
  });

  it('returns real drilling events for NO 15/9-19 A', async () => {
    const res = await fetch(`${API_BASE}/events/well/${encodeURIComponent('NO 15/9-19 A')}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('returns event with real actions and outcome', async () => {
    const eventsRes = await fetch(`${API_BASE}/events/well/${encodeURIComponent('NO 15/9-19 A')}`);
    const eventsData = await eventsRes.json();
    const eventId = eventsData.data[0].id;

    const res = await fetch(`${API_BASE}/events/${eventId}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.actions).toBeDefined();
    expect(data.data.actions.length).toBeGreaterThan(0);
  });

  it('look-ahead search finds real events in lookahead depth interval', async () => {
    const res = await fetch(
      `${API_BASE}/events/lookahead/search?wells=${encodeURIComponent('NO 15/9-19 A')}&start=3500&end=4100`
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('returns real Daily Drilling Reports (DDRs) for a well', async () => {
    const res = await fetch(`${API_BASE}/documents/well/${encodeURIComponent('NO 15/9-19 A')}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('returns specific DDR page with PyMuPDF extracted text', async () => {
    const docsRes = await fetch(`${API_BASE}/documents/well/${encodeURIComponent('NO 15/9-19 A')}`);
    const docsData = await docsRes.json();
    const docId = docsData.data[0].document_id;

    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}/pages/1`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.data.page_number).toBe(1);
    expect(data.data.extracted_text).toBeDefined();
    expect(data.data.extracted_text.length).toBeGreaterThan(20);
  });

  it('returns 404 for non-existent well', async () => {
    const res = await fetch(`${API_BASE}/wells/WELL-999`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
