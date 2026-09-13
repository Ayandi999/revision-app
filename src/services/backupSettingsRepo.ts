import { eq } from "drizzle-orm";
import { db } from "@/database/db";
import { backupSettings } from "@/database/schema";

export interface BackupSettingsState {
  backupEnabled: boolean;
  wifiOnly: boolean;
}

const SETTINGS_ROW_ID = 1;

/**
 * Retrieves the current backup settings (singleton row).
 * Falls back to safe defaults (enabled: true, wifiOnly: true) if missing.
 */
export async function getBackupSettings(): Promise<BackupSettingsState> {
  try {
    const row = await db
      .select()
      .from(backupSettings)
      .where(eq(backupSettings.id, SETTINGS_ROW_ID))
      .get();

    if (!row) {
      // Auto-initialize if row does not exist with race-safe onConflictDoNothing
      await db
        .insert(backupSettings)
        .values({
          id: SETTINGS_ROW_ID,
          backupEnabled: true,
          wifiOnly: true,
        })
        .onConflictDoNothing();
      return { backupEnabled: true, wifiOnly: true };
    }

    return {
      backupEnabled: row.backupEnabled,
      wifiOnly: row.wifiOnly,
    };
  } catch (err) {
    console.warn("[backupSettingsRepo] Error reading settings, using defaults:", err);
    return { backupEnabled: true, wifiOnly: true };
  }
}

/**
 * Toggles or sets automatic cloud backup enabled state.
 * Queries current state first to ensure no sibling fields are clobbered on the insert path.
 */
export async function setBackupEnabled(enabled: boolean): Promise<void> {
  const current = await getBackupSettings();
  await db
    .insert(backupSettings)
    .values({
      id: SETTINGS_ROW_ID,
      backupEnabled: enabled,
      wifiOnly: current.wifiOnly,
    })
    .onConflictDoUpdate({
      target: backupSettings.id,
      set: { backupEnabled: enabled },
    });
}

/**
 * Toggles or sets Wi-Fi only constraint for automatic uploads.
 * Queries current state first to ensure no sibling fields are clobbered on the insert path.
 */
export async function setWifiOnly(wifiOnly: boolean): Promise<void> {
  const current = await getBackupSettings();
  await db
    .insert(backupSettings)
    .values({
      id: SETTINGS_ROW_ID,
      backupEnabled: current.backupEnabled,
      wifiOnly,
    })
    .onConflictDoUpdate({
      target: backupSettings.id,
      set: { wifiOnly },
    });
}
