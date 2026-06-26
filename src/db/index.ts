import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Singleton — Next.js hot-reload can re-require this module; keep one pool
// per process via the global object.
const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
  _db?: ReturnType<typeof drizzle>;
};

function createDb() {
  const client = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { client, db: drizzle(client, { schema }) };
}

if (!globalForDb._db) {
  const { client, db } = createDb();
  globalForDb._pgClient = client;
  globalForDb._db = db;
}

export const db = globalForDb._db!;
