import { expodb } from "@/database/db";
import migrations from "../../drizzle/migrations";
import { useCallback, useEffect, useState } from "react";

export interface MigrationState {
  success: boolean;
  error?: Error | null;
}

/**
 * Robust, self-healing migration hook for Expo SQLite.
 *
 * Prevents SQLite crashes from `duplicate column name` when an `ALTER TABLE`
 * migration has already been executed or interrupted.
 */
export function useAppMigrations() {
  const [state, setState] = useState<MigrationState>({
    success: false,
    error: null,
  });

  const runMigration = useCallback(async () => {
    try {
      setState({ success: false, error: null });

      // 1. Ensure __drizzle_migrations table exists
      expodb.execSync(`
        CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash text NOT NULL,
          created_at numeric
        );
      `);

      // 2. Check if 'questions' table exists
      const tables = expodb.getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='questions';"
      );

      if (tables.length === 0) {
        // Table does not exist at all -> execute 0000_far_scream.sql
        const initialSql = migrations.migrations.m0000;
        if (initialSql) {
          expodb.execSync(initialSql);
        }
      }

      // 3. Inspect existing columns on 'questions' table
      const columns = expodb.getAllSync<{ name: string }>(
        "PRAGMA table_info(questions);"
      );
      const columnNames = new Set(columns.map((c) => c.name));

      // 4. Safely add 'extracted_text' column if not present yet
      if (!columnNames.has("extracted_text")) {
        try {
          expodb.execSync(
            "ALTER TABLE questions ADD COLUMN extracted_text text;"
          );
        } catch (alterErr) {
          console.warn("[useAppMigrations] ALTER TABLE note:", alterErr);
        }
      }

      // 5. Reconcile __drizzle_migrations journal timestamps
      const existingEntries = expodb.getAllSync<{ created_at: number }>(
        "SELECT created_at FROM __drizzle_migrations;"
      );
      const existingSet = new Set(
        existingEntries.map((e) => Number(e.created_at))
      );

      for (const entry of migrations.journal.entries) {
        if (!existingSet.has(Number(entry.when))) {
          expodb.runSync(
            "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', ?);",
            [entry.when]
          );
        }
      }

      setState({ success: true, error: null });
    } catch (err) {
      console.error("[useAppMigrations] Migration error:", err);
      setState({
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, []);

  const resetDatabase = useCallback(async () => {
    try {
      expodb.execSync("DROP TABLE IF EXISTS questions;");
      expodb.execSync("DROP TABLE IF EXISTS __drizzle_migrations;");
      await runMigration();
    } catch (err) {
      setState({
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [runMigration]);

  useEffect(() => {
    runMigration();
  }, [runMigration]);

  return { ...state, retry: runMigration, resetDatabase };
}
