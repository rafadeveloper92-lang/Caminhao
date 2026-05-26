
import Dexie, { Table } from 'dexie';
import { Work, Trip, WorkCompletion, Setting } from '../types';

export class TruckerDatabase extends Dexie {
  works!: Table<Work>;
  trips!: Table<Trip>;
  completions!: Table<WorkCompletion>;
  settings!: Table<Setting>;

  constructor() {
    super('TruckerDatabase');
    this.version(6).stores({
      works: '++id, name, created_at, is_finished, finished_at',
      trips: '++id, work_id, timestamp',
      completions: '++id, work_id, timestamp',
      settings: 'id'
    });
  }
}

export const db = new TruckerDatabase();
