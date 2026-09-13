import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

/**
 * NOTE: expodb and db are exported as mutable live bindings.
 * Always access them directly from the module import (e.g. `import { db } from '@/database/db'`)
 * rather than destructuring at import time, ensuring you always reference the active open
 * connection across database reopenings.
 */
export let expodb: SQLiteDatabase = openDatabaseSync('revision.db');
export let db = drizzle(expodb, { schema });

/**
 * Executes a full WAL checkpoint to flush pending write transactions into the primary db file.
 * Throws if SQLite fails to flush so callers can catch and prevent backing up stale files.
 */
export function checkpointDatabaseSync(): void {
  expodb.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/**
 * Closes the active database connection safely.
 * Throws if the close operation fails.
 */
export function closeDatabaseSync(): void {
  expodb.closeSync();
}

/**
 * Re-opens the database and re-binds the Drizzle ORM client.
 * Throws if the database file cannot be opened.
 */
export function reopenDatabaseSync(): void {
  expodb = openDatabaseSync('revision.db');
  db = drizzle(expodb, { schema });
}