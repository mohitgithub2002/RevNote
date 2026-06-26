import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Singleton — Next.js hot-reload can re-require this module; keep one pool
// per process via the global object.
const globalForDb = globalThis as unknown as {
  _db?: ReturnType<typeof drizzle<typeof schema>>;
};

// Lazy initializer — called only on the first real request, not at module
// parse time. This prevents Next.js build from failing when DATABASE_URL
// is not present as a build-time env var on the CI/Vercel host.
function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (globalForDb._db) return globalForDb._db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');

  const client = postgres(url, {
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  globalForDb._db = drizzle(client, { schema });
  return globalForDb._db;
}

// Proxy so callers write `db.select()...` as before while init stays lazy.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});
