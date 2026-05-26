export interface Work {
  id?: number;
  name: string;
  created_at: string;
  is_finished?: boolean;
  finished_at?: string;
  lat?: number;
  lng?: number;
  gate_password?: string;
}

export interface Setting {
  id: string; // 'warehouse' or 'home'
  lat: number;
  lng: number;
  updated_at: string;
}

export interface WorkCompletion {
  id?: number;
  work_id: number;
  timestamp: string;
}

export interface Trip {
  id?: number;
  work_id: number;
  timestamp: string;
  type: 'cleaning' | 'delivery';
  notes?: string;
}

/** Loja onde compras materiais para as obras (com localização opcional). */
export interface Store {
  id?: number;
  name: string;
  notes?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyStats {
  month: string;
  total_trips: number;
}

/** Backup legado (sem lojas). */
export interface RotacamExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  works: Work[];
  trips: Trip[];
  completions: WorkCompletion[];
  settings: Setting[];
}

/** Backup atual (inclui lojas). */
export interface RotacamExportV2 {
  schemaVersion: 2;
  exportedAt: string;
  works: Work[];
  trips: Trip[];
  completions: WorkCompletion[];
  settings: Setting[];
  stores: Store[];
}

export type RotacamBackup = RotacamExportV1 | RotacamExportV2;
