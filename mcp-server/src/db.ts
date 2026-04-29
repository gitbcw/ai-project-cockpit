import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CockpitStateSnapshot } from './types.js';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const dataDir = process.env.COCKPIT_DATA_DIR || path.join(projectRoot, 'data');
const dbPath = process.env.COCKPIT_DB_PATH || path.join(dataDir, 'cockpit.sqlite');

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  mkdirSync(dataDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    create table if not exists cockpit_state (
      id text primary key,
      json text not null,
      updated_at text not null
    )
  `);
  return db;
}

export function getDatabasePath() {
  return dbPath;
}

export function hasDatabase() {
  return existsSync(dbPath);
}

export function readState(): CockpitStateSnapshot {
  const row = getDb()
    .prepare('select json from cockpit_state where id = ?')
    .get('main') as { json: string } | undefined;

  if (!row) {
    const timestamp = new Date().toISOString();
    const empty: CockpitStateSnapshot = {
      projects: [],
      tasks: [],
      contexts: [],
      aiRecords: [],
      decisions: [],
      selectedProjectId: null,
    };
    writeState(empty, timestamp);
    return empty;
  }

  return JSON.parse(row.json) as CockpitStateSnapshot;
}

export function writeState(snapshot: CockpitStateSnapshot, updatedAt = new Date().toISOString()) {
  getDb()
    .prepare(`
      insert into cockpit_state (id, json, updated_at)
      values (?, ?, ?)
      on conflict(id) do update set json = excluded.json, updated_at = excluded.updated_at
    `)
    .run('main', JSON.stringify(snapshot), updatedAt);
}

export function mutateState<T>(mutator: (snapshot: CockpitStateSnapshot, timestamp: string) => T): T {
  const snapshot = readState();
  const timestamp = new Date().toISOString();
  const result = mutator(snapshot, timestamp);
  writeState(snapshot, timestamp);
  return result;
}
