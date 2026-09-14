import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

/**
 * NOTE: expodb and db are exported as mutable live bindings.
 * Always access them directly from the module import (e.g. `import { db } from '@/database/db'`)
 * rather than destructuring at import time, ensuring you always reference the active open
 * connection across database reopenings.
 */
let _expodb: SQLiteDatabase = openDatabaseSync('revision.db');
let _db = drizzle(_expodb, { schema });

/**
 * Proxied expodb and db instances.
 * Using ES6 Proxies guarantees that any file importing `expodb` or `db` always forwards
 * queries to the currently active database connection, preventing stale closed-connection
 * errors when the database is closed and reopened during cloud restore.
 */
export const expodb: SQLiteDatabase = new Proxy({} as SQLiteDatabase, {
  get(_target, prop) {
    const val = (_expodb as any)[prop];
    return typeof val === 'function' ? val.bind(_expodb) : val;
  },
  set(_target, prop, value) {
    (_expodb as any)[prop] = value;
    return true;
  },
});

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop) {
      const val = (_db as any)[prop];
      return typeof val === 'function' ? val.bind(_db) : val;
    },
    set(_target, prop, value) {
      (_db as any)[prop] = value;
      return true;
    },
  }
);

/**
 * Executes a full WAL checkpoint to flush pending write transactions into the primary db file.
 * Throws if SQLite fails to flush so callers can catch and prevent backing up stale files.
 */
export function checkpointDatabaseSync(): void {
  _expodb.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/**
 * Closes the active database connection safely.
 * Throws if the close operation fails.
 */
export function closeDatabaseSync(): void {
  _expodb.closeSync();
}

/**
 * Re-opens the database and re-binds the Drizzle ORM client.
 * Throws if the database file cannot be opened.
 */
export function reopenDatabaseSync(): void {
  _expodb = openDatabaseSync('revision.db');
  _db = drizzle(_expodb, { schema });
}