import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CockpitStateSnapshot } from '@/types/cockpit';
import { sampleSnapshot } from '@/lib/sampleData';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'cockpit.sqlite');

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

export function readCockpitState(): CockpitStateSnapshot {
  return readCockpitStateWithVersion().snapshot;
}

export function readCockpitStateWithVersion(): { snapshot: CockpitStateSnapshot; version: string } {
  const row = getDb()
    .prepare('select json, updated_at from cockpit_state where id = ?')
    .get('main') as { json: string; updated_at: string } | undefined;

  if (!row) {
    const version = writeCockpitState(sampleSnapshot);
    return { snapshot: sampleSnapshot, version };
  }

  return { snapshot: JSON.parse(row.json) as CockpitStateSnapshot, version: row.updated_at };
}

export function writeCockpitState(snapshot: CockpitStateSnapshot) {
  const version = new Date().toISOString();
  getDb()
    .prepare(`
      insert into cockpit_state (id, json, updated_at)
      values (?, ?, ?)
      on conflict(id) do update set json = excluded.json, updated_at = excluded.updated_at
    `)
    .run('main', JSON.stringify(snapshot), version);
  return version;
}
