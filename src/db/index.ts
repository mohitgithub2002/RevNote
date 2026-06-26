import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'revnote.db');

// Singleton — Next.js hot-reload can re-require this module; we keep one
// connection alive per process via the global object.
const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> };

function createDb() {
  const sqlite = new Database(DB_PATH);

  // WAL mode: allows concurrent reads + writes, much faster for frequent saves.
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables if they don't exist yet (idempotent bootstrap — no migration
  // tooling needed for this schema version).
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL DEFAULT '',
      content     TEXT NOT NULL DEFAULT '',
      plain_text  TEXT NOT NULL DEFAULT '',
      icon        TEXT NOT NULL DEFAULT '📄',
      parent_id   TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id         TEXT PRIMARY KEY,
      page_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      content    TEXT NOT NULL,
      html       TEXT NOT NULL,
      position   INTEGER NOT NULL,
      metadata   TEXT NOT NULL DEFAULT '{}',
      embedding  TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pages_parent_id  ON pages(parent_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_page_id   ON blocks(page_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_position  ON blocks(page_id, position);
  `);

  return drizzle(sqlite, { schema });
}

export const db = globalForDb._db ?? (globalForDb._db = createDb());
