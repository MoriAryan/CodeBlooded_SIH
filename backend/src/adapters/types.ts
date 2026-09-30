// ============================================================
// Data Adapter Interface
// All data importers (dummy, CSV, PDF, WITSML, eRTMAC)
// must implement this contract.
// ============================================================

export interface ImportedWell {
  well_id: string;
  name: string;
  status: string;
  spud_date?: string;
  total_depth_md?: number;
  total_depth_tvd?: number;
  current_depth_md?: number;
  current_formation?: string;
  field_name?: string;
  operator?: string;
  well_type?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
}

export interface ImportedFormation {
  well_id: string;
  formation_name: string;
  top_depth_md: number;
  base_depth_md: number;
  top_depth_tvd?: number;
  base_depth_tvd?: number;
  lithology?: string;
  description?: string;
}

export interface ImportedEvent {
  well_id: string;
  event_type: string;
  start_depth_md?: number;
  end_depth_md?: number;
  formation?: string;
  severity?: string;
  description?: string;
  event_date?: string;
  duration_hours?: number;
  npt_hours?: number;
  actions?: Array<{ description: string; type?: string; outcome?: string }>;
  source_document_id?: string;
  source_page?: number;
  confidence?: number;
}

export interface ImportedDocument {
  document_id: string;
  well_id: string;
  document_type?: string;
  title?: string;
  total_pages?: number;
  source?: string;
}

/**
 * All data adapters must implement this interface.
 * The application never knows the original source format.
 */
export interface DataAdapter {
  readonly name: string;
  readonly description: string;

  /** Import wells from the source */
  importWells(): Promise<ImportedWell[]>;

  /** Import formation intervals */
  importFormations(): Promise<ImportedFormation[]>;

  /** Import drilling events */
  importEvents(): Promise<ImportedEvent[]>;

  /** Import documents */
  importDocuments(): Promise<ImportedDocument[]>;

  /** Validate connectivity / source availability */
  validate(): Promise<{ valid: boolean; errors: string[] }>;
}
