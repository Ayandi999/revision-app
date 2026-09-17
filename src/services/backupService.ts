import * as Network from "expo-network";
import { Directory, File, Paths } from "expo-file-system";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { sql } from "drizzle-orm";
import {
  checkpointDatabaseSync,
  closeDatabaseSync,
  reopenDatabaseSync,
  expodb,
  db,
} from "@/database/db";
import { questions } from "@/database/schema";
import {
  uploadSingleImage,
  downloadSingleImage,
  getManifestInfo,
  updateManifest,
  uploadDatabaseOnly,
  downloadDatabaseOnly,
  findAppDataFile,
  listFileRevisions,
  downloadRevisionBytes,
} from "./googleDrive";
import { getValidAccessToken, saveSyncMetadata } from "./googleAuth";
import {
  getPendingOrFailed,
  getPendingCount,
  markUploaded,
  markFailed,
  seedAsUploaded,
} from "./imageBackupRepo";
import { getBackupSettings } from "./backupSettingsRepo";
import { toRelativePath } from "@/functions/imageHelpers";
import { getDeviceMediaStorageSize } from "@/functions/mediaStorage";

// ─── Concurrency Guard ────────────────────────────────────────────────────────

let isOperationInProgress = false;

// ─── Format Utilities ─────────────────────────────────────────────────────────

export function formatBytes(bytes: number, decimals = 0): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (dm === 0) {
    return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
  }
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ─── Path & Header Safety Helpers ─────────────────────────────────────────────

const SQLITE_HEADER = "SQLite format 3\0";

/**
 * Validates that the binary data begins with the standard SQLite database file magic header.
 */
export function isValidSqliteFile(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 16));
  return header === SQLITE_HEADER;
}

/**
 * Validates that a relative path from the manifest does not attempt path traversal attacks.
 */
export function isSafeRelativePath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path)) return false;
  if (path.split("/").some((part) => part === ".." || part === "." || part === "")) return false;
  if (path.includes("\\")) return false;
  return true;
}

/**
 * Safely wraps a directory path into an expo-file-system Directory with a guaranteed
 * 'file://' scheme so native Android Java URI parsing never fails with "URI is not absolute".
 */
function getSqliteDirectory(): Directory {
  if (defaultDatabaseDirectory && typeof defaultDatabaseDirectory === "string") {
    if (defaultDatabaseDirectory.startsWith("file://")) {
      return new Directory(defaultDatabaseDirectory);
    }
    const clean = defaultDatabaseDirectory.startsWith("/")
      ? defaultDatabaseDirectory
      : `/${defaultDatabaseDirectory}`;
    return new Directory(`file://${clean}`);
  }
  return new Directory(Paths.document, "SQLite");
}

// ─── Safe Database Snapshot ───────────────────────────────────────────────────

/**
 * Safely flushes WAL, temporarily closes SQLite to make an atomic staging copy,
 * and immediately reopens SQLite so the UI is not blocked.
 */
async function createDatabaseSnapshot(): Promise<Uint8Array> {
  checkpointDatabaseSync();

  const sqliteDir = getSqliteDirectory();
  let originalDb = new File(sqliteDir, "revision.db");
  if (!originalDb.exists) {
    const fallbackDb = new File(Paths.document, "SQLite", "revision.db");
    if (fallbackDb.exists) {
      originalDb = fallbackDb;
    } else {
      throw new Error(`SQLite database file not found at ${sqliteDir.uri}/revision.db`);
    }
  }

  const stagingFile = new File(Paths.cache, `revision_staging_${Date.now()}.db`);

  try {
    // Briefly close DB to ensure Android file locks are released for copy
    closeDatabaseSync();
    originalDb.copy(stagingFile);
  } finally {
    // Immediately reopen database so app queries continue without interruption
    try {
      reopenDatabaseSync();
    } catch (reopenErr) {
      console.error(
        "[backupService] CRITICAL: Failed to reopen database after snapshot:",
        reopenErr
      );
      throw new Error(
        "Database snapshot created but the database could not be reconnected. Please restart the app."
      );
    }
  }

  const dbBytes = await stagingFile.bytes();

  try {
    stagingFile.delete();
  } catch {
    // Non-fatal cache cleanup
  }

  return dbBytes;
}

// ─── Incremental Backup Check ─────────────────────────────────────────────────

/**
 * Checks whether backup can proceed based on user settings and current network status.
 */
export async function canSyncNow(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const settings = await getBackupSettings();
    if (!settings.backupEnabled) {
      return { allowed: false, reason: "Backup is disabled in settings." };
    }

    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      return { allowed: false, reason: "No internet connection." };
    }

    if (settings.wifiOnly && net.type !== Network.NetworkStateType.WIFI) {
      return { allowed: false, reason: "Waiting for Wi-Fi (Wi-Fi only enabled)" };
    }

    return { allowed: true };
  } catch (err) {
    console.warn("[backupService] canSyncNow check failed:", err);
    return { allowed: false, reason: "Network check failed." };
  }
}

// ─── Incremental Image Sync ───────────────────────────────────────────────────

/**
 * Uploads a single image to Google Drive appDataFolder and updates manifest.json.
 * Bails early if a restore or DB snapshot is in progress.
 */
export async function syncSingleImage(
  rawPath: string,
  accessToken?: string,
  isInternalBatch = false
): Promise<boolean> {
  if (isOperationInProgress && !isInternalBatch) {
    // Avoid operating against a closed or locked database during restore
    return false;
  }

  const relativePath = toRelativePath(rawPath);
  if (!relativePath) return false;

  const allowed = await canSyncNow();
  if (!allowed.allowed) {
    // Remains pending in backup_images table for next network window
    return false;
  }

  let token = accessToken;
  if (!token) {
    try {
      token = await getValidAccessToken();
    } catch {
      return false;
    }
  }

  try {
    const imgFile = new File(Paths.document, relativePath);
    if (!imgFile.exists) {
      console.warn(`[backupService] Local image file does not exist: ${relativePath}`);
      await markFailed(relativePath);
      return false;
    }

    const bytes = await imgFile.bytes();
    const driveFileId = await uploadSingleImage(token, relativePath, bytes);
    await updateManifest(token, relativePath, driveFileId);
    await markUploaded(relativePath, driveFileId);
    return true;
  } catch (err) {
    console.warn(`[backupService] Failed to sync single image ${relativePath}:`, err);
    try {
      await markFailed(relativePath);
    } catch {
      // Non-fatal if database is temporarily closed during concurrent restore
    }
    return false;
  }
}

/**
 * Sweeps and uploads all pending or retryable images in batches.
 * Fully claims isOperationInProgress guard to prevent overlapping sweeps or conflicts.
 */
export async function syncPendingImages(
  accessToken?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ uploaded: number; failed: number }> {
  if (isOperationInProgress) {
    return { uploaded: 0, failed: 0 };
  }

  isOperationInProgress = true;
  try {
    const allowed = await canSyncNow();
    if (!allowed.allowed) {
      return { uploaded: 0, failed: 0 };
    }

    let token = accessToken;
    if (!token) {
      try {
        token = await getValidAccessToken();
      } catch {
        return { uploaded: 0, failed: 0 };
      }
    }

    const pending = await getPendingOrFailed();
    if (pending.length === 0) {
      return { uploaded: 0, failed: 0 };
    }

    let uploaded = 0;
    let failed = 0;
    const CONCURRENCY = 3;

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      // Re-verify network state before each batch in case connection dropped
      const recheck = await canSyncNow();
      if (!recheck.allowed) {
        break;
      }

      const batch = pending.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (item) => {
          const success = await syncSingleImage(item.relativePath, token, true);
          if (success) uploaded++;
          else failed++;
          onProgress?.(uploaded + failed, pending.length);
        })
      );
    }

    return { uploaded, failed };
  } finally {
    isOperationInProgress = false;
  }
}

// ─── Standalone Database Sync ─────────────────────────────────────────────────

/**
 * Uploads only the SQLite database snapshot after all pending images are uploaded.
 * Synchronously claims isOperationInProgress immediately before any await.
 */
export async function syncDatabaseOnly(
  accessToken?: string
): Promise<boolean> {
  if (isOperationInProgress) {
    return false;
  }
  isOperationInProgress = true;

  try {
    const allowed = await canSyncNow();
    if (!allowed.allowed) {
      return false;
    }

    // Ensure no images are pending before DB sync to maintain referential integrity
    const pendingCount = await getPendingCount();
    if (pendingCount > 0) {
      console.log(`[backupService] Skipping DB sync: ${pendingCount} images still pending.`);
      return false;
    }

    let token = accessToken;
    if (!token) {
      try {
        token = await getValidAccessToken();
      } catch {
        return false;
      }
    }

    // Safety check: Never overwrite an existing remote cloud backup with an empty local database
    try {
      const [{ count: localQuestionCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions);

      if (localQuestionCount === 0) {
        const remoteDbFile = await findAppDataFile(token, "revlog_database.db");
        if (remoteDbFile) {
          console.warn(
            "[backupService] Safety abort: local database has 0 questions, but Google Drive has an existing backup. Skipping DB overwrite."
          );
          return false;
        }
      }
    } catch (countErr) {
      console.warn("[backupService] Pre-backup question count check error:", countErr);
    }

    const dbBytes = await createDatabaseSnapshot();
    const uploadedFile = await uploadDatabaseOnly(token, dbBytes);

    const syncedAt = new Date().toISOString();
    const mediaStorage = getDeviceMediaStorageSize();
    const sizeFormatted = mediaStorage.formattedTotal;

    await saveSyncMetadata({
      lastSyncAt: syncedAt,
      lastBackupSize: sizeFormatted,
      lastBackupId: uploadedFile.id,
    });

    return true;
  } catch (err) {
    console.error("[backupService] syncDatabaseOnly failed:", err);
    return false;
  } finally {
    isOperationInProgress = false;
  }
}

// ─── Incremental Restore from Manifest ────────────────────────────────────────

export interface RestoreResult {
  restoredAt: string;
  imageCount: number;
  questionCount: number;
  metadata: Record<string, any> | null;
}

/**
 * Restores database from revlog_database.db and synchronizes missing images via manifest.json.
 * Validates SQLite magic header before filesystem operations to prevent corrupt/truncated overwrites.
 * Automatically checks Google Drive version history if the restored database snapshot has 0 questions.
 */
export async function restoreFromManifest(
  accessToken: string,
  onProgress?: (status: string) => void
): Promise<RestoreResult> {
  if (isOperationInProgress) {
    throw new Error("A backup or restore operation is already in progress.");
  }

  isOperationInProgress = true;

  try {
    onProgress?.("Checking for cloud backup...");

    // 1. Download standalone database snapshot
    const dbBytes = await downloadDatabaseOnly(accessToken);
    if (!dbBytes) {
      throw new Error("No RevLog backup database found in your Google Drive.");
    }

    // 2. Validate SQLite magic header to prevent writing truncated/corrupt downloads
    if (!isValidSqliteFile(dbBytes)) {
      throw new Error(
        "The downloaded backup database appears corrupted or incomplete. Restore aborted — your local data was not affected."
      );
    }

    onProgress?.("Fetching cloud image manifest...");
    const manifestInfo = await getManifestInfo(accessToken);

    onProgress?.("Restoring database & images...");

    const sqliteDir = getSqliteDirectory();
    if (!sqliteDir.exists) {
      sqliteDir.create({ intermediates: true, idempotent: true });
    }

    const targetDb = new File(sqliteDir, "revision.db");
    const preRestoreDb = new File(Paths.cache, `pre_restore_${Date.now()}.db`);

    // Safety snapshot before touching local db
    if (targetDb.exists) {
      try {
        targetDb.copy(preRestoreDb);
      } catch (snapErr) {
        console.error("[backupService] Pre-restore snapshot failed:", snapErr);
        throw new Error(
          "Could not create a safety snapshot before restoring — aborting to protect your existing data."
        );
      }
    }

    // Safely close database connection
    closeDatabaseSync();

    try {
      targetDb.write(dbBytes);

      // Clean up stale WAL / SHM files if present
      const walFile = new File(sqliteDir, "revision.db-wal");
      if (walFile.exists) walFile.delete();

      const shmFile = new File(sqliteDir, "revision.db-shm");
      if (shmFile.exists) shmFile.delete();

      // Download any images from manifest that aren't present locally
      const baseImagesDir = new Directory(Paths.document, "revision-app", "images");
      if (!baseImagesDir.exists) {
        baseImagesDir.create({ intermediates: true, idempotent: true });
      }

      const entries = Object.entries(manifestInfo.manifest);

      for (let i = 0; i < entries.length; i++) {
        const [relativePath, driveFileId] = entries[i];
        if (!isSafeRelativePath(relativePath)) {
          console.warn(`[backupService] Skipping unsafe relative path in manifest: ${relativePath}`);
          continue;
        }

        const localFile = new File(Paths.document, relativePath);
        if (!localFile.exists) {
          onProgress?.(`Downloading image ${i + 1} of ${entries.length}...`);
          try {
            const imgBytes = await downloadSingleImage(accessToken, driveFileId);
            const parts = relativePath.split("/");
            const filename = parts.pop()!;
            const folderDir = new Directory(Paths.document, parts.join("/"));
            if (!folderDir.exists) {
              folderDir.create({ intermediates: true, idempotent: true });
            }
            const f = new File(folderDir, filename);
            f.write(imgBytes);
          } catch (imgErr) {
            console.warn(`[backupService] Failed to download image ${relativePath}:`, imgErr);
          }
        }
      }

      // Successful restore: discard pre-restore snapshot
      if (preRestoreDb.exists) {
        try {
          preRestoreDb.delete();
        } catch {
          // Non-fatal cleanup
        }
      }
    } catch (restoreErr) {
      console.error("[backupService] Restore failed, rolling back database:", restoreErr);
      if (preRestoreDb.exists) {
        try {
          const preBytes = await preRestoreDb.bytes();
          targetDb.write(preBytes);
          preRestoreDb.delete();
        } catch (rollbackErr) {
          console.error("[backupService] Rollback failed:", rollbackErr);
        }
      }
      throw restoreErr;
    } finally {
      // Always reopen database
      try {
        reopenDatabaseSync();
      } catch (reopenErr) {
        console.error(
          "[backupService] CRITICAL: Failed to reopen database after restore:",
          reopenErr
        );
        throw new Error(
          "Backup restored but the database could not be reconnected. Please restart the app."
        );
      }
    }

    // 4. Inspect restored question count
    let questionCount = 0;
    try {
      const rows = expodb.getAllSync<{ count: number }>(
        "SELECT count(*) as count FROM questions;"
      );
      questionCount = rows[0]?.count ?? 0;
    } catch (countErr) {
      console.warn("[backupService] Failed to query restored question count:", countErr);
    }

    // 5. Automatic revision recovery:
    // If the restored DB has 0 questions but manifest has images, the database was likely
    // overwritten by an empty auto-sync on a fresh reinstall. Check previous Drive revisions!
    if (questionCount === 0 && Object.keys(manifestInfo.manifest).length > 0) {
      try {
        onProgress?.("Checking cloud history for previous database version...");
        const remoteDbFile = await findAppDataFile(accessToken, "revlog_database.db");
        if (remoteDbFile) {
          const revisions = await listFileRevisions(accessToken, remoteDbFile.id);
          // Revisions are oldest to newest. Sort in reverse to test newest revisions first
          const previousRevs = revisions.slice(0, -1).reverse();
          for (const rev of previousRevs) {
            try {
              onProgress?.("Recovering previous database backup...");
              const revBytes = await downloadRevisionBytes(accessToken, remoteDbFile.id, rev.id);
              if (isValidSqliteFile(revBytes)) {
                closeDatabaseSync();
                targetDb.write(revBytes);
                reopenDatabaseSync();

                const testRows = expodb.getAllSync<{ count: number }>(
                  "SELECT count(*) as count FROM questions;"
                );
                const recoveredCount = testRows[0]?.count ?? 0;
                if (recoveredCount > 0) {
                  questionCount = recoveredCount;
                  console.log(
                    `[backupService] Successfully recovered ${recoveredCount} questions from previous Drive revision ${rev.id}!`
                  );
                  // Repair latest revision on Google Drive so future restores work immediately
                  uploadDatabaseOnly(accessToken, revBytes).catch(() => {});
                  break;
                }
              }
            } catch (revErr) {
              console.warn(`[backupService] Revision ${rev.id} recovery attempt failed:`, revErr);
            }
          }
        }
      } catch (historyErr) {
        console.warn("[backupService] Revision history check failed:", historyErr);
      }
    }

    // Seed all manifest images in backup_images table using single-query atomic upsert
    try {
      for (const [relPath, driveFileId] of Object.entries(manifestInfo.manifest)) {
        if (isSafeRelativePath(relPath)) {
          await seedAsUploaded(relPath, driveFileId);
        }
      }
    } catch (repoErr) {
      console.warn("[backupService] Failed to seed backup_images after restore:", repoErr);
    }

    const restoredAt = new Date().toISOString();
    const mediaStorage = getDeviceMediaStorageSize();
    const sizeFormatted = mediaStorage.formattedTotal;

    await saveSyncMetadata({
      lastSyncAt: restoredAt,
      lastBackupSize: sizeFormatted,
      lastBackupId: "manifest_restore",
    });

    return {
      restoredAt,
      imageCount: Object.keys(manifestInfo.manifest).length,
      questionCount,
      metadata: { type: "incremental_manifest" },
    };
  } finally {
    isOperationInProgress = false;
  }
}
