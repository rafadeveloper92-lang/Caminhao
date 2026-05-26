import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { defineCustomElements } from 'jeep-sqlite/loader';
import type {
  RotacamBackup,
  RotacamExportV1,
  RotacamExportV2,
  Setting,
  Store,
  Trip,
  Work,
  WorkCompletion,
} from '../types';

defineCustomElements(window);

const DB_NAME = 'controle_viagens';

let sqlite: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

function getDb(): SQLiteDBConnection {
  if (!db) {
    throw new Error('Banco ainda não inicializado. Chame initDatabase() antes.');
  }
  return db;
}

function rows<T>(res: { values?: unknown[][] } | undefined, map: (row: unknown[]) => T): T[] {
  const v = res?.values;
  if (!v?.length) return [];
  return v.map(map);
}

function mapWork(r: unknown[]): Work {
  return {
    id: r[0] as number,
    name: r[1] as string,
    created_at: r[2] as string,
    is_finished: Boolean(r[3]),
    finished_at: (r[4] as string | null) ?? undefined,
    lat: r[5] != null ? (r[5] as number) : undefined,
    lng: r[6] != null ? (r[6] as number) : undefined,
    gate_password: (r[7] as string | null) ?? undefined,
  };
}

function mapTrip(r: unknown[]): Trip {
  return {
    id: r[0] as number,
    work_id: r[1] as number,
    timestamp: r[2] as string,
    type: r[3] as Trip['type'],
    notes: (r[4] as string | null) ?? undefined,
  };
}

function mapCompletion(r: unknown[]): WorkCompletion {
  return {
    id: r[0] as number,
    work_id: r[1] as number,
    timestamp: r[2] as string,
  };
}

function mapSetting(r: unknown[]): Setting {
  return {
    id: r[0] as string,
    lat: r[1] as number,
    lng: r[2] as number,
    updated_at: r[3] as string,
  };
}

function mapStore(r: unknown[]): Store {
  return {
    id: r[0] as number,
    name: r[1] as string,
    notes: (r[2] as string | null) ?? undefined,
    lat: r[3] != null ? (r[3] as number) : undefined,
    lng: r[4] != null ? (r[4] as number) : undefined,
    created_at: r[5] as string,
    updated_at: r[6] as string,
  };
}

async function ensureSchema(connection: SQLiteDBConnection): Promise<void> {
  await connection.execute('PRAGMA foreign_keys = ON;', false);

  const statements = [
    `CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_finished INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT,
      lat REAL,
      lng REAL,
      gate_password TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (work_id) REFERENCES works (id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (work_id) REFERENCES works (id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notes TEXT,
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  ];

  for (const sql of statements) {
    await connection.execute(sql, false);
  }
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  sqlite = new SQLiteConnection(CapacitorSQLite);

  if (Capacitor.getPlatform() === 'web') {
    const jeepEl = document.createElement('jeep-sqlite');
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    jeepEl.setAttribute('wasmPath', `${base}assets`);
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  await sqlite.checkConnectionsConsistency();
  const existing = await sqlite.isConnection(DB_NAME, false);
  if (existing.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await db.open();
  await ensureSchema(db);
}

export async function getAllWorks(): Promise<Work[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, name, created_at, is_finished, finished_at, lat, lng, gate_password FROM works ORDER BY id DESC',
  );
  return rows(res, mapWork);
}

export async function getWorkById(id: number | null): Promise<Work | null> {
  if (id == null) return null;
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, name, created_at, is_finished, finished_at, lat, lng, gate_password FROM works WHERE id = ?',
    [id],
  );
  const list = rows(res, mapWork);
  return list[0] ?? null;
}

export async function addWork(input: Omit<Work, 'id'>): Promise<number> {
  const connection = getDb();
  const gate = input.gate_password ?? null;
  const res = await connection.run(
    'INSERT INTO works (name, created_at, is_finished, gate_password) VALUES (?,?,?,?)',
    [input.name, input.created_at, input.is_finished ? 1 : 0, gate],
    true,
    'no',
  );
  const lastId = res.changes?.lastId;
  if (typeof lastId === 'number') return lastId;
  const q = await connection.query('SELECT last_insert_rowid() AS id');
  const idRow = q.values?.[0]?.[0];
  return Number(idRow ?? 0);
}

export async function updateWork(id: number, patch: Partial<Work>): Promise<void> {
  const connection = getDb();
  const fields: string[] = [];
  const vals: unknown[] = [];

  if (patch.name !== undefined) {
    fields.push('name = ?');
    vals.push(patch.name);
  }
  if (patch.created_at !== undefined) {
    fields.push('created_at = ?');
    vals.push(patch.created_at);
  }
  if (patch.is_finished !== undefined) {
    fields.push('is_finished = ?');
    vals.push(patch.is_finished ? 1 : 0);
  }
  if (patch.finished_at !== undefined) {
    fields.push('finished_at = ?');
    vals.push(patch.finished_at ?? null);
  }
  if (patch.lat !== undefined) {
    fields.push('lat = ?');
    vals.push(patch.lat ?? null);
  }
  if (patch.lng !== undefined) {
    fields.push('lng = ?');
    vals.push(patch.lng ?? null);
  }
  if (patch.gate_password !== undefined) {
    fields.push('gate_password = ?');
    vals.push(patch.gate_password ?? null);
  }
  if (!fields.length) return;
  vals.push(id);
  await connection.run(`UPDATE works SET ${fields.join(', ')} WHERE id = ?`, vals, true, 'no');
}

export async function deleteWorkCascade(id: number): Promise<void> {
  const connection = getDb();
  await connection.run('DELETE FROM works WHERE id = ?', [id], true, 'no');
}

export async function getAllTrips(): Promise<Trip[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, work_id, timestamp, type, notes FROM trips ORDER BY id ASC',
  );
  return rows(res, mapTrip);
}

export async function getTripsForWork(workId: number): Promise<Trip[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, work_id, timestamp, type, notes FROM trips WHERE work_id = ? ORDER BY timestamp DESC',
    [workId],
  );
  return rows(res, mapTrip);
}

export async function addTrip(input: Omit<Trip, 'id'>): Promise<void> {
  const connection = getDb();
  await connection.run(
    'INSERT INTO trips (work_id, timestamp, type, notes) VALUES (?,?,?,?)',
    [input.work_id, input.timestamp, input.type, input.notes ?? null],
    true,
    'no',
  );
}

export async function clearTripsAndCompletions(): Promise<void> {
  const connection = getDb();
  await connection.execute('DELETE FROM trips;', false);
  await connection.execute('DELETE FROM completions;', false);
}

export async function clearAllData(): Promise<void> {
  const connection = getDb();
  await connection.execute('DELETE FROM trips;', false);
  await connection.execute('DELETE FROM completions;', false);
  await connection.execute('DELETE FROM works;', false);
}

export async function getCompletionsForWork(workId: number): Promise<WorkCompletion[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, work_id, timestamp FROM completions WHERE work_id = ? ORDER BY timestamp DESC',
    [workId],
  );
  return rows(res, mapCompletion);
}

export async function addCompletion(input: Omit<WorkCompletion, 'id'>): Promise<void> {
  const connection = getDb();
  await connection.run(
    'INSERT INTO completions (work_id, timestamp) VALUES (?,?)',
    [input.work_id, input.timestamp],
    true,
    'no',
  );
}

export async function getSetting(id: string): Promise<Setting | null> {
  const connection = getDb();
  const res = await connection.query('SELECT id, lat, lng, updated_at FROM settings WHERE id = ?', [id]);
  const list = rows(res, mapSetting);
  return list[0] ?? null;
}

export async function putSetting(setting: Setting): Promise<void> {
  const connection = getDb();
  await connection.run(
    'INSERT OR REPLACE INTO settings (id, lat, lng, updated_at) VALUES (?,?,?,?)',
    [setting.id, setting.lat, setting.lng, setting.updated_at],
    true,
    'no',
  );
}

export async function getAllStores(): Promise<Store[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, name, notes, lat, lng, created_at, updated_at FROM stores ORDER BY name COLLATE NOCASE ASC, id ASC',
  );
  return rows(res, mapStore);
}

export async function addStore(input: Pick<Store, 'name' | 'notes'>): Promise<number> {
  const connection = getDb();
  const now = new Date().toISOString();
  const res = await connection.run(
    'INSERT INTO stores (name, notes, lat, lng, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [input.name, input.notes ?? null, null, null, now, now],
    true,
    'no',
  );
  const lastId = res.changes?.lastId;
  if (typeof lastId === 'number') return lastId;
  const q = await connection.query('SELECT last_insert_rowid() AS id');
  const idRow = q.values?.[0]?.[0];
  return Number(idRow ?? 0);
}

export async function updateStore(id: number, patch: Partial<Pick<Store, 'name' | 'notes' | 'lat' | 'lng'>>): Promise<void> {
  const connection = getDb();
  const fields: string[] = [];
  const vals: unknown[] = [];

  if (patch.name !== undefined) {
    fields.push('name = ?');
    vals.push(patch.name);
  }
  if (patch.notes !== undefined) {
    fields.push('notes = ?');
    vals.push(patch.notes ?? null);
  }
  if (patch.lat !== undefined) {
    fields.push('lat = ?');
    vals.push(patch.lat ?? null);
  }
  if (patch.lng !== undefined) {
    fields.push('lng = ?');
    vals.push(patch.lng ?? null);
  }
  if (fields.length) {
    fields.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await connection.run(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, vals, true, 'no');
  }
}

export async function deleteStore(id: number): Promise<void> {
  const connection = getDb();
  await connection.run('DELETE FROM stores WHERE id = ?', [id], true, 'no');
}


export async function getAllCompletions(): Promise<WorkCompletion[]> {
  const connection = getDb();
  const res = await connection.query(
    'SELECT id, work_id, timestamp FROM completions ORDER BY id ASC',
  );
  return rows(res, mapCompletion);
}

export async function getAllSettings(): Promise<Setting[]> {
  const connection = getDb();
  const res = await connection.query('SELECT id, lat, lng, updated_at FROM settings ORDER BY id ASC');
  return rows(res, mapSetting);
}

export async function exportAllData(): Promise<RotacamExportV2> {
  const works = (await getAllWorks()).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const trips = await getAllTrips();
  const completions = await getAllCompletions();
  const settings = await getAllSettings();
  const stores = (await getAllStores()).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    works,
    trips,
    completions,
    settings,
    stores,
  };
}

function isRotacamExportV1(value: unknown): value is RotacamExportV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1) return false;
  if (typeof v.exportedAt !== 'string') return false;
  if (!Array.isArray(v.works) || !Array.isArray(v.trips) || !Array.isArray(v.completions) || !Array.isArray(v.settings)) {
    return false;
  }
  return true;
}

function isRotacamExportV2(value: unknown): value is RotacamExportV2 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 2) return false;
  if (typeof v.exportedAt !== 'string') return false;
  if (!Array.isArray(v.works) || !Array.isArray(v.trips) || !Array.isArray(v.completions) || !Array.isArray(v.settings) || !Array.isArray(v.stores)) {
    return false;
  }
  return true;
}

function isRotacamBackup(value: unknown): value is RotacamBackup {
  return isRotacamExportV1(value) || isRotacamExportV2(value);
}

export async function importAllData(payload: unknown): Promise<void> {
  if (!isRotacamBackup(payload)) {
    throw new Error('Formato de backup inválido.');
  }

  const connection = getDb();
  await connection.beginTransaction();
  try {
    await connection.execute('DELETE FROM trips;', false);
    await connection.execute('DELETE FROM completions;', false);
    await connection.execute('DELETE FROM works;', false);
    await connection.execute('DELETE FROM settings;', false);
    await connection.execute('DELETE FROM stores;', false);

    const worksSorted = payload.works.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const w of worksSorted) {
      await connection.run(
        'INSERT INTO works (id, name, created_at, is_finished, finished_at, lat, lng, gate_password) VALUES (?,?,?,?,?,?,?,?)',
        [
          w.id,
          w.name,
          w.created_at,
          w.is_finished ? 1 : 0,
          w.finished_at ?? null,
          w.lat ?? null,
          w.lng ?? null,
          w.gate_password ?? null,
        ],
        false,
        'no',
      );
    }

    const tripsSorted = payload.trips.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const tr of tripsSorted) {
      await connection.run(
        'INSERT INTO trips (id, work_id, timestamp, type, notes) VALUES (?,?,?,?,?)',
        [tr.id, tr.work_id, tr.timestamp, tr.type, tr.notes ?? null],
        false,
        'no',
      );
    }

    const compSorted = payload.completions.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const c of compSorted) {
      await connection.run(
        'INSERT INTO completions (id, work_id, timestamp) VALUES (?,?,?)',
        [c.id, c.work_id, c.timestamp],
        false,
        'no',
      );
    }

    for (const s of payload.settings) {
      await connection.run(
        'INSERT INTO settings (id, lat, lng, updated_at) VALUES (?,?,?,?)',
        [s.id, s.lat, s.lng, s.updated_at],
        false,
        'no',
      );
    }

    if (isRotacamExportV2(payload)) {
      const storesSorted = payload.stores.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      for (const st of storesSorted) {
        await connection.run(
          'INSERT INTO stores (id, name, notes, lat, lng, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
          [st.id, st.name, st.notes ?? null, st.lat ?? null, st.lng ?? null, st.created_at, st.updated_at],
          false,
          'no',
        );
      }
    }

    await connection.commitTransaction();
  } catch (e) {
    await connection.rollbackTransaction();
    throw e;
  }
}
