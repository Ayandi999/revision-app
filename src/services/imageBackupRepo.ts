import { and, count, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/database/db";
import { backupImages, type BackupImage } from "@/database/schema";
import { toRelativePath } from "@/functions/imageHelpers";

export const MAX_IMAGE_RETRIES = 5;

/**
 * Inserts a new pending image record or resets an existing non-uploaded image
 * to 'pending' state with retryCount reset to 0.
 * Ensures path is strictly stored as a portable relative path.
 */
export async function upsertPendingImage(rawPath: string): Promise<void> {
  const relativePath = toRelativePath(rawPath);
  if (!relativePath) {
    console.warn("[imageBackupRepo] upsertPendingImage received invalid or unparseable path:", rawPath);
    return;
  }

  await db
    .insert(backupImages)
    .values({
      relativePath,
      status: "pending",
      retryCount: 0,
    })
    .onConflictDoUpdate({
      target: backupImages.relativePath,
      set: {
        status: sql`CASE WHEN ${backupImages.status} = 'uploaded' THEN 'uploaded' ELSE 'pending' END`,
        retryCount: sql`CASE WHEN ${backupImages.status} = 'uploaded' THEN ${backupImages.retryCount} ELSE 0 END`,
      },
    });
}

/**
 * Marks an image as successfully uploaded to Google Drive.
 */
export async function markUploaded(
  rawPath: string,
  driveFileId: string
): Promise<void> {
  const relativePath = toRelativePath(rawPath);
  if (!relativePath) {
    console.warn("[imageBackupRepo] markUploaded received invalid path:", rawPath);
    return;
  }

  await db
    .update(backupImages)
    .set({
      status: "uploaded",
      driveFileId,
      uploadedAt: new Date().toISOString(),
      retryCount: 0,
    })
    .where(eq(backupImages.relativePath, relativePath));
}

/**
 * Directly seeds or updates an image as uploaded in a single atomic query (used during restore).
 */
export async function seedAsUploaded(
  rawPath: string,
  driveFileId: string
): Promise<void> {
  const relativePath = toRelativePath(rawPath);
  if (!relativePath) {
    console.warn("[imageBackupRepo] seedAsUploaded received invalid path:", rawPath);
    return;
  }

  await db
    .insert(backupImages)
    .values({
      relativePath,
      driveFileId,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
      retryCount: 0,
    })
    .onConflictDoUpdate({
      target: backupImages.relativePath,
      set: {
        status: "uploaded",
        driveFileId,
        uploadedAt: new Date().toISOString(),
        retryCount: 0,
      },
    });
}

/**
 * Records an upload failure, incrementing the retry count and timestamping the attempt.
 */
export async function markFailed(rawPath: string): Promise<void> {
  const relativePath = toRelativePath(rawPath);
  if (!relativePath) {
    console.warn("[imageBackupRepo] markFailed received invalid path:", rawPath);
    return;
  }

  await db
    .update(backupImages)
    .set({
      status: "failed",
      retryCount: sql`${backupImages.retryCount} + 1`,
      lastAttemptAt: new Date().toISOString(),
    })
    .where(eq(backupImages.relativePath, relativePath));
}

/**
 * Retrieves all images eligible for upload:
 * - status = 'pending'
 * - status = 'failed' AND retryCount < maxRetries (exact cap of maxRetries total attempts)
 */
export async function getPendingOrFailed(
  maxRetries = MAX_IMAGE_RETRIES
): Promise<BackupImage[]> {
  return db
    .select()
    .from(backupImages)
    .where(
      or(
        eq(backupImages.status, "pending"),
        and(
          eq(backupImages.status, "failed"),
          lt(backupImages.retryCount, maxRetries)
        )
      )
    )
    .all();
}

/**
 * Returns the total count of pending or retryable images.
 * Used for UI indicators and to verify that no images are pending before DB sync.
 */
export async function getPendingCount(
  maxRetries = MAX_IMAGE_RETRIES
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(backupImages)
    .where(
      or(
        eq(backupImages.status, "pending"),
        and(
          eq(backupImages.status, "failed"),
          lt(backupImages.retryCount, maxRetries)
        )
      )
    )
    .get();

  return result?.count ?? 0;
}

/**
 * One-time backfill helper: Seeds unindexed local images using single-query atomic onConflictDoNothing.
 */
export async function backfillExistingImages(
  rawPaths: string[]
): Promise<number> {
  let seeded = 0;
  for (const rawPath of rawPaths) {
    const relativePath = toRelativePath(rawPath);
    if (!relativePath) {
      console.warn("[imageBackupRepo] backfillExistingImages skipping invalid path:", rawPath);
      continue;
    }

    const result = await db
      .insert(backupImages)
      .values({
        relativePath,
        status: "pending",
        retryCount: 0,
      })
      .onConflictDoNothing()
      .run();

    if (result.changes > 0) {
      seeded++;
    }
  }
  return seeded;
}

/**
 * Returns all backup image records (for diagnostics/settings).
 */
export async function getAllBackupImages(): Promise<BackupImage[]> {
  return db.select().from(backupImages).all();
}
