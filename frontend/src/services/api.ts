// ============================================================
// NWIS API Client
// Centralized API communication layer.
// All components use this instead of direct fetch calls.
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    radius_m?: number;
    depth_range?: { start: number; end: number };
    wells_queried?: string[];
  };
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

class NWISApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);

    if (!response.ok) {
      const error: ApiErrorResponse = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // --- Health ---
  async getHealth() {
    return this.request<any>('/health');
  }

  async getDbHealth() {
    return this.request<any>('/health/db');
  }

  // --- Wells ---
  async getWells() {
    return this.request<any[]>('/wells');
  }

  async getWell(wellId: string) {
    return this.request<any>(`/wells/${encodeURIComponent(wellId)}`);
  }

  async getNearbyWells(wellId: string, radiusMeters: number = 10000) {
    return this.request<any[]>(`/wells/${encodeURIComponent(wellId)}/nearby?radius=${radiusMeters}`);
  }

  async getFormations(wellId: string) {
    return this.request<any[]>(`/wells/${encodeURIComponent(wellId)}/formations`);
  }

  async getTrajectory(wellId: string) {
    return this.request<any[]>(`/wells/${encodeURIComponent(wellId)}/trajectory`);
  }

  // --- Events ---
  async getEventsByWell(wellId: string) {
    return this.request<any[]>(`/events/well/${encodeURIComponent(wellId)}`);
  }

  async getEvent(eventId: string) {
    return this.request<any>(`/events/${encodeURIComponent(eventId)}`);
  }

  async getEventsByType(eventType: string) {
    return this.request<any[]>(`/events/type/${encodeURIComponent(eventType)}`);
  }

  async getLookaheadEvents(wellIds: string[], startDepth: number, endDepth: number) {
    const wells = wellIds.map(w => encodeURIComponent(w)).join(',');
    return this.request<any[]>(
      `/events/lookahead/search?wells=${wells}&start=${startDepth}&end=${endDepth}`
    );
  }

  // --- Correlation ---
  async getCorrelatedOffsets(wellId: string, radiusMeters: number = 10000, lookaheadWindowM: number = 150) {
    return this.request<any[]>(
      `/correlation/offsets/${encodeURIComponent(wellId)}?radius=${radiusMeters}&lookahead=${lookaheadWindowM}`
    );
  }

  // --- Documents ---
  async getDocumentsByWell(wellId: string) {
    return this.request<any[]>(`/documents/well/${encodeURIComponent(wellId)}`);
  }

  async getDocument(docId: string) {
    return this.request<any>(`/documents/${encodeURIComponent(docId)}`);
  }

  async getDocumentPages(docId: string) {
    return this.request<any[]>(`/documents/${encodeURIComponent(docId)}/pages`);
  }

  async getDocumentPage(docId: string, pageNumber: number) {
    return this.request<any>(`/documents/${encodeURIComponent(docId)}/pages/${pageNumber}`);
  }
}

export const api = new NWISApiClient(API_BASE);
export type { ApiResponse };
