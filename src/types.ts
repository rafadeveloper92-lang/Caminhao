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

export interface MonthlyStats {
  month: string;
  total_trips: number;
}

/** Formato de exportação/importação de backup local (versão 1). */
export interface RotacamExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  works: Work[];
  trips: Trip[];
  completions: WorkCompletion[];
  settings: Setting[];
}
