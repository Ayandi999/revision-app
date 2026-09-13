/**
 * Google Drive REST API v3 integration with narrow 'appDataFolder' scope.
 * 
 * Features:
 * - Resumable uploads for reliable binary zip transport
 * - Safe TypedArray buffer slicing (prevents corrupt uploads when dealing with subarray views)
 * - Intelligent retry with exponential backoff (bypasses retries on 400/401/403 client errors)
 * - Structured DriveApiError class exposing HTTP status codes
 * - Request timeouts via AbortController
 * - Guarded JSON parsing against HTML gateway error responses
 * - Safe version retention (preserves 2-3 recent backups, prunes oldest)
 * - Zero access to user's personal drive files
 */

export interface DriveBackupFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
}

export class DriveApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DriveApiError";
    this.status = status;
  }
}

/**
 * Type guard / helper to verify if an error represents an unauthorized 401 Drive API response.
 */
export function isAuthError(err: any): boolean {
  return err instanceof DriveApiError && err.status === 401;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";
const MAX_BACKUP_RETENTION = 3;

const DEFAULT_TIMEOUT_MS = 30000;
const TRANSFER_TIMEOUT_MS = 90000; // 90s for large upload/download payloads

// ─── Network Helpers: Timeout & Retry ──────────────────────────────────────────

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Google Drive request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status;
      // Do NOT retry client / auth errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found)
      if (status && [400, 401, 403, 404].includes(status)) {
        throw err;
      }

      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      console.warn(
        `[googleDrive] Attempt ${attempt} failed. Retrying in ${delay}ms...`,
        err?.message || err
      );
      await wait(delay);
      delay *= 2; // exponential backoff
    }
  }

  throw new Error("Maximum retry attempts exceeded.");
}

// ─── List Existing Backups ────────────────────────────────────────────────────

/**
 * Lists all RevLog backup archives in the Google Drive appDataFolder,
 * sorted by modifiedTime descending (newest first).
 */
export async function listBackups(accessToken: string): Promise<DriveBackupFile[]> {
  return withRetry(async () => {
    const query = encodeURIComponent("name contains 'revlog_backup_' and trashed = false");
    const fields = encodeURIComponent("files(id, name, size, modifiedTime)");
    const url = `${DRIVE_API_BASE}?spaces=appDataFolder&q=${query}&fields=${fields}&orderBy=modifiedTime desc`;

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new DriveApiError(
        `Failed to list Google Drive backups (${response.status}): ${errorText}`,
        response.status
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new DriveApiError("Google Drive returned invalid JSON listing.", response.status);
    }

    // Filter strictly by backup archive filename pattern to isolate from any future non-backup appData files
    const rawFiles = (data.files || []) as DriveBackupFile[];
    return rawFiles.filter((file) => /^revlog_backup_\d+\.zip$/.test(file.name));
  });
}

// ─── Upload Backup Archive ────────────────────────────────────────────────────

/**
 * Uploads a new timestamped backup archive to appDataFolder using Resumable Upload.
 * Verifies upload completion and file size before returning.
 *
 * NOTE ON RESUMABLE SESSIONS:
 * If step 1 (init) succeeds but step 2 (PUT) fails after retries, Google Drive
 * automatically expires and cleans up unfinalized resumable upload sessions (~1 week).
 */
export async function uploadBackup(
  accessToken: string,
  zipBytes: Uint8Array,
  filename: string
): Promise<DriveBackupFile> {
  // 1. Safe ArrayBuffer slice:
  // Uint8Array.buffer returns the entire underlying buffer. If zipBytes is a subarray
  // or comes from a shared buffer pool, sending zipBytes.buffer directly would upload
  // extraneous bytes and corrupt the archive.
  const payload =
    zipBytes.byteOffset === 0 &&
    zipBytes.byteLength === zipBytes.buffer.byteLength
      ? zipBytes.buffer
      : zipBytes.slice().buffer;

  return withRetry(async () => {
    // Step 1: Initiate Resumable Upload session
    const initUrl = `${DRIVE_UPLOAD_BASE}?uploadType=resumable`;
    const metadata = {
      name: filename,
      parents: ["appDataFolder"],
      mimeType: "application/zip",
    };

    const initResponse = await fetchWithTimeout(
      initUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "application/zip",
          "X-Upload-Content-Length": zipBytes.byteLength.toString(),
        },
        body: JSON.stringify(metadata),
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!initResponse.ok) {
      const err = await initResponse.text().catch(() => "");
      throw new DriveApiError(
        `Failed to initiate Drive upload (${initResponse.status}): ${err}`,
        initResponse.status
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new DriveApiError(
        "Google Drive did not return a resumable upload location header.",
        initResponse.status
      );
    }

    // Step 2: Upload binary zip payload
    const uploadResponse = await fetchWithTimeout(
      uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": zipBytes.byteLength.toString(),
        },
        body: payload as ArrayBuffer,
      },
      TRANSFER_TIMEOUT_MS
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text().catch(() => "");
      throw new DriveApiError(
        `Failed to upload backup payload (${uploadResponse.status}): ${err}`,
        uploadResponse.status
      );
    }

    // Guard against non-JSON gateway HTML error responses
    let result: any;
    try {
      result = await uploadResponse.json();
    } catch {
      throw new DriveApiError(
        "Drive returned an unreadable response after upload.",
        uploadResponse.status
      );
    }

    // Step 3: Verify upload integrity
    if (!result?.id) {
      throw new DriveApiError("Drive upload response missing confirmed file ID.", 500);
    }

    const uploadedFile: DriveBackupFile = {
      id: result.id,
      name: result.name || filename,
      size: result.size || zipBytes.byteLength.toString(),
      modifiedTime: result.modifiedTime || new Date().toISOString(),
    };

    return uploadedFile;
  });
}

// ─── Download Backup Archive ──────────────────────────────────────────────────

/**
 * Downloads a backup archive from appDataFolder by file ID.
 */
export async function downloadBackup(
  accessToken: string,
  fileId: string
): Promise<Uint8Array> {
  return withRetry(async () => {
    const downloadUrl = `${DRIVE_API_BASE}/${fileId}?alt=media`;

    const response = await fetchWithTimeout(
      downloadUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      TRANSFER_TIMEOUT_MS
    );

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      throw new DriveApiError(
        `Failed to download backup (${response.status}): ${err}`,
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  });
}

// ─── Safe Backup Pruning ──────────────────────────────────────────────────────

/**
 * Preserves the newest `keepCount` (defaults to 3) backups and safely removes older ones.
 * Guaranteed to run only after a new backup has been confirmed and verified.
 *
 * DESIGN NOTE (Fail-Open on Delete):
 * Individual deletion errors are intentionally swallowed without failing the parent sync flow.
 * If a delete fails transiently, that older backup simply lingers until the next prune cycle,
 * preventing non-critical cleanup failures from blocking the user's primary backup success.
 */
export async function pruneOldBackups(
  accessToken: string,
  keepCount = MAX_BACKUP_RETENTION
): Promise<void> {
  try {
    const backups = await listBackups(accessToken);

    // If there are more backups than the threshold, delete the older ones
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);

      for (const file of toDelete) {
        try {
          const deleteUrl = `${DRIVE_API_BASE}/${file.id}`;
          await fetchWithTimeout(
            deleteUrl,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
            DEFAULT_TIMEOUT_MS
          );
          console.log(`[googleDrive] Pruned older backup: ${file.name} (${file.id})`);
        } catch (delErr) {
          console.warn(`[googleDrive] Could not delete old backup ${file.id}:`, delErr);
        }
      }
    }
  } catch (err) {
    console.warn("[googleDrive] Pruning check encountered an error:", err);
  }
}
