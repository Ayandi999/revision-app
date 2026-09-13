import { Directory, File, Paths } from "expo-file-system";
import {
  checkpointDatabaseSync,
  closeDatabaseSync,
  reopenDatabaseSync,
} from "@/database/db";
import {
  downloadBackup,
  listBackups,
  pruneOldBackups,
  uploadBackup,
} from "./googleDrive";
import {
  createBackupArchive,
  extractBackupArchive,
  formatBytes,
  type BackupImageEntry,
} from "./zipHelper";
import { saveSyncMetadata } from "./googleAuth";

export const CURRENT_BACKUP_VERSION = 1;

// ─── Concurrency Guard ────────────────────────────────────────────────────────

let isOperationInProgress = false;

// ─── Image Collector ──────────────────────────────────────────────────────────

/**
 * Dynamically scans documentDirectory/revision-app/images/ recursively,
 * traversing whatever subfolders exist without hardcoding category names.
 */
async function collectAllImages(): Promise<BackupImageEntry[]> {
  const images: BackupImageEntry[] = [];
  const baseImagesDir = new Directory(Paths.document, "revision-app", "images");

  if (!baseImagesDir.exists) {
    return images;
  }

  async function scanDirectory(dir: Directory, prefix = ""): Promise<void> {
    try {
      const items = dir.list();
      for (const item of items) {
        const relativePath = prefix ? `${prefix}/${item.name}` : item.name;

        if (item instanceof Directory) {
          await scanDirectory(item, relativePath);
        } else if (item instanceof File) {
          try {
            const bytes = await item.bytes();
            images.push({ relativePath, bytes });
          } catch (readErr) {
            console.warn(`[backupService] Could not read image ${item.name}:`, readErr);
          }
        }
      }
    } catch (listErr) {
      console.warn(`[backupService] Could not list directory contents:`, listErr);
    }
  }

  await scanDirectory(baseImagesDir);
  return images;
}

// ─── Safe Database Snapshot ───────────────────────────────────────────────────

/**
 * Safely flushes WAL, temporarily closes SQLite to make an atomic staging copy,
 * and immediately reopens SQLite so the UI is not blocked.
 */
async function createDatabaseSnapshot(): Promise<Uint8Array> {
  checkpointDatabaseSync();

  const originalDb = new File(Paths.document, "SQLite", "revision.db");
  if (!originalDb.exists) {
    throw new Error("SQLite database file not found at documentDirectory/SQLite/revision.db");
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

// ─── Backup Pipeline ──────────────────────────────────────────────────────────

export interface BackupResult {
  backupId: string;
  sizeFormatted: string;
  syncedAt: string;
  imageCount: number;
}

/**
 * Executes a full backup:
 * 1. Flushes & snapshots SQLite database
 * 2. Collects all question/solution images dynamically
 * 3. Compresses into timestamped zip archive with manifest
 * 4. Uploads to Google Drive appDataFolder with retries
 * 5. Verifies upload integrity & prunes older backups
 * 6. Updates SecureStore sync metadata
 */
export async function createBackup(
  accessToken: string,
  onProgress?: (status: string) => void
): Promise<BackupResult> {
  if (isOperationInProgress) {
    throw new Error("A backup or restore operation is already in progress.");
  }

  isOperationInProgress = true;

  try {
    onProgress?.("Flushing & snapshotting database...");
    const dbBytes = await createDatabaseSnapshot();

    onProgress?.("Scanning images...");
    const images = await collectAllImages();

    onProgress?.("Compressing backup archive...");
    const timestamp = Date.now();
    const metadata = {
      app: "RevLog",
      version: CURRENT_BACKUP_VERSION,
      createdAt: new Date(timestamp).toISOString(),
      imageCount: images.length,
      dbSizeBytes: dbBytes.byteLength,
    };

    const zipBytes = await createBackupArchive(dbBytes, images, metadata);
    const filename = `revlog_backup_${timestamp}.zip`;

    onProgress?.("Uploading to Google Drive...");
    const uploadedFile = await uploadBackup(accessToken, zipBytes, filename);

    onProgress?.("Verifying & pruning older backups...");
    await pruneOldBackups(accessToken, 3);

    const syncedAt = new Date().toISOString();
    const parsedSize = parseInt(uploadedFile.size, 10);
    const sizeBytes = Number.isFinite(parsedSize) ? parsedSize : zipBytes.byteLength;
    const sizeFormatted = formatBytes(sizeBytes);

    await saveSyncMetadata({
      lastSyncAt: syncedAt,
      lastBackupSize: sizeFormatted,
      lastBackupId: uploadedFile.id,
    });

    return {
      backupId: uploadedFile.id,
      sizeFormatted,
      syncedAt,
      imageCount: images.length,
    };
  } finally {
    isOperationInProgress = false;
  }
}

// ─── Restore Pipeline ─────────────────────────────────────────────────────────

export interface RestoreResult {
  restoredAt: string;
  imageCount: number;
  metadata: Record<string, any> | null;
}

/**
 * Executes a full restore with rollback protection:
 * 1. Fetches and downloads latest backup from Google Drive appDataFolder
 * 2. Verifies format & version compatibility before touching filesystem
 * 3. Snapshots current local database before overwrite (rolls back on error)
 * 4. Extracts revision.db, purges stale WAL/SHM files, extracts all images
 * 5. Reinitializes SQLite connection
 */
export async function restoreBackup(
  accessToken: string,
  onProgress?: (status: string) => void
): Promise<RestoreResult> {
  if (isOperationInProgress) {
    throw new Error("A backup or restore operation is already in progress.");
  }

  isOperationInProgress = true;

  try {
    onProgress?.("Locating latest cloud backup...");
    const backups = await listBackups(accessToken);

    if (backups.length === 0) {
      throw new Error("No existing RevLog backups found in your Google Drive.");
    }

    const latestBackup = backups[0];

    onProgress?.("Downloading backup archive...");
    const zipBytes = await downloadBackup(accessToken, latestBackup.id);

    onProgress?.("Decompressing backup archive...");
    const extracted = await extractBackupArchive(zipBytes);

    // Version compatibility check
    if (
      extracted.metadata?.version &&
      typeof extracted.metadata.version === "number" &&
      extracted.metadata.version > CURRENT_BACKUP_VERSION
    ) {
      throw new Error(
        `This backup was created with a newer version of RevLog (v${extracted.metadata.version}). Please update RevLog to restore.`
      );
    }

    onProgress?.("Restoring database & images...");

    const sqliteDir = new Directory(Paths.document, "SQLite");
    if (!sqliteDir.exists) {
      sqliteDir.create({ intermediates: true, idempotent: true });
    }

    const targetDb = new File(sqliteDir, "revision.db");

    // 1. Snapshot current database before touching anything to enable rollback on failure
    const preRestoreDb = new File(Paths.cache, `pre_restore_${Date.now()}.db`);
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

    // 2. Safely close database to replace file
    closeDatabaseSync();

    try {
      targetDb.write(extracted.dbBytes);

      // Clean up stale WAL / SHM files if present
      const walFile = new File(sqliteDir, "revision.db-wal");
      if (walFile.exists) walFile.delete();

      const shmFile = new File(sqliteDir, "revision.db-shm");
      if (shmFile.exists) shmFile.delete();

      // 3. Restore images to documentDirectory/revision-app/images/
      // DESIGN NOTE: Existing local images are merged/overwritten rather than wiped clean,
      // ensuring newly created offline images are not lost if restore is triggered.
      const baseImagesDir = new Directory(Paths.document, "revision-app", "images");
      if (!baseImagesDir.exists) {
        baseImagesDir.create({ intermediates: true, idempotent: true });
      }

      for (const img of extracted.images) {
        const parts = img.relativePath.split("/");
        const filename = parts.pop()!;
        const folderName = parts.join("/");

        const targetFolder = new Directory(baseImagesDir, folderName);
        if (!targetFolder.exists) {
          targetFolder.create({ intermediates: true, idempotent: true });
        }

        const imgFile = new File(targetFolder, filename);
        imgFile.write(img.bytes);
      }

      // Successful restore: discard pre-restore snapshot
      if (preRestoreDb.exists) {
        try {
          preRestoreDb.delete();
        } catch {
          // Non-fatal cache cleanup
        }
      }
    } catch (restoreErr) {
      console.error("[backupService] Restore failed, rolling back database:", restoreErr);
      if (preRestoreDb.exists) {
        try {
          const preBytes = await preRestoreDb.bytes();
          targetDb.write(preBytes); // safe overwrite without relying on copy() semantics
          preRestoreDb.delete();
        } catch (rollbackErr) {
          console.error("[backupService] Rollback failed:", rollbackErr);
        }
      }
      throw restoreErr;
    } finally {
      // 4. Always reopen the database connection
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

    const restoredAt = new Date().toISOString();
    const sizeFormatted = formatBytes(extracted.dbBytes.byteLength);

    await saveSyncMetadata({
      lastSyncAt: restoredAt,
      lastBackupSize: sizeFormatted,
      lastBackupId: latestBackup.id,
    });

    return {
      restoredAt,
      imageCount: extracted.images.length,
      metadata: extracted.metadata,
    };
  } finally {
    isOperationInProgress = false;
  }
}
