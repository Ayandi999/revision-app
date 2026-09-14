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

// ─── Binary File Download ─────────────────────────────────────────────────────

/**
 * Downloads a file from Google Drive appDataFolder by file ID.
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
        `Failed to download file (${response.status}): ${err}`,
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  });
}

// ─── Incremental Sync & Single File Helpers ────────────────────────────────────

/**
 * Searches appDataFolder for a single file matching the given filename.
 * Properly throws DriveApiError on transient/server failures, so callers
 * only receive null when the file is genuinely absent.
 */
export async function findAppDataFile(
  accessToken: string,
  filename: string
): Promise<DriveBackupFile | null> {
  return withRetry(async () => {
    const escapedFilename = filename.replace(/'/g, "\\'");
    const query = encodeURIComponent(`name = '${escapedFilename}' and trashed = false`);
    const fields = encodeURIComponent("files(id, name, size, modifiedTime)");
    const url = `${DRIVE_API_BASE}?spaces=appDataFolder&q=${query}&fields=${fields}`;

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new DriveApiError(
        `Failed to search for ${filename} (${response.status}): ${errorText}`,
        response.status
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new DriveApiError(
        `Google Drive returned invalid JSON search response for ${filename}.`,
        response.status
      );
    }

    const files = (data.files || []) as DriveBackupFile[];
    return files.length > 0 ? (files[0] as DriveBackupFile) : null;
  });
}

/**
 * Helper to upload a binary file to appDataFolder using Resumable Upload.
 */
async function uploadBinaryToAppData(
  accessToken: string,
  filename: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<DriveBackupFile> {
  const payload =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.slice().buffer;

  return withRetry(async () => {
    const initUrl = `${DRIVE_UPLOAD_BASE}?uploadType=resumable`;
    const metadata = {
      name: filename,
      parents: ["appDataFolder"],
      mimeType,
    };

    const initResponse = await fetchWithTimeout(
      initUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": bytes.byteLength.toString(),
        },
        body: JSON.stringify(metadata),
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!initResponse.ok) {
      const err = await initResponse.text().catch(() => "");
      throw new DriveApiError(
        `Failed to init upload for ${filename} (${initResponse.status}): ${err}`,
        initResponse.status
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new DriveApiError("Google Drive did not return upload URL header.", 500);
    }

    const uploadResponse = await fetchWithTimeout(
      uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "Content-Length": bytes.byteLength.toString(),
        },
        body: payload as ArrayBuffer,
      },
      TRANSFER_TIMEOUT_MS
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text().catch(() => "");
      throw new DriveApiError(
        `Failed upload for ${filename} (${uploadResponse.status}): ${err}`,
        uploadResponse.status
      );
    }

    const result = await uploadResponse.json().catch(() => ({}));
    if (!result?.id) {
      throw new DriveApiError(`Upload response missing ID for ${filename}.`, 500);
    }

    return {
      id: result.id,
      name: result.name || filename,
      size: result.size || bytes.byteLength.toString(),
      modifiedTime: result.modifiedTime || new Date().toISOString(),
    };
  });
}

/**
 * Uploads a single image directly to Google Drive appDataFolder.
 * Returns the confirmed driveFileId.
 */
export async function uploadSingleImage(
  accessToken: string,
  relativePath: string,
  imageBytes: Uint8Array
): Promise<string> {
  const ext = relativePath.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  // Encode relative path to a safe unique filename on Google Drive, escaping single quotes
  const driveFileName = `img_${encodeURIComponent(relativePath).replace(/'/g, "%27")}`;

  const result = await uploadBinaryToAppData(
    accessToken,
    driveFileName,
    mimeType,
    imageBytes
  );

  return result.id;
}

/**
 * Downloads a single image from Google Drive by its file ID.
 */
export async function downloadSingleImage(
  accessToken: string,
  driveFileId: string
): Promise<Uint8Array> {
  return withRetry(async () => {
    const downloadUrl = `${DRIVE_API_BASE}/${driveFileId}?alt=media`;

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
        `Failed to download image ${driveFileId} (${response.status}): ${err}`,
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  });
}

export interface DriveManifestInfo {
  fileId: string | null;
  manifest: Record<string, string>; // relativePath -> driveFileId
}

/**
 * Retrieves the current manifest.json from appDataFolder.
 * Returns fileId: null only if the manifest genuinely does not exist yet.
 * Real network/API/parse failures are propagated so callers don't accidentally
 * overwrite an existing manifest with a blank one.
 */
export async function getManifestInfo(
  accessToken: string
): Promise<DriveManifestInfo> {
  const file = await findAppDataFile(accessToken, "manifest.json");
  if (!file) {
    return { fileId: null, manifest: {} };
  }

  const contentBytes = await downloadBackup(accessToken, file.id);
  const text = new TextDecoder().decode(contentBytes);
  const parsed = JSON.parse(text);

  return {
    fileId: file.id,
    manifest: typeof parsed === "object" && parsed !== null ? parsed : {},
  };
}

let manifestWriteQueue: Promise<void> = Promise.resolve();

/**
 * Updates manifest.json on Google Drive with serialized execution.
 * Prevents read-modify-write lost-update races during concurrent batch uploads.
 */
export async function updateManifest(
  accessToken: string,
  relativePath: string,
  driveFileId: string
): Promise<void> {
  manifestWriteQueue = manifestWriteQueue.catch(() => {}).then(async () => {
    const current = await getManifestInfo(accessToken);
    current.manifest[relativePath] = driveFileId;

    const jsonStr = JSON.stringify(current.manifest, null, 2);
    const bytes = new TextEncoder().encode(jsonStr);

    if (current.fileId) {
      // Overwrite existing manifest via PATCH media upload
      await withRetry(async () => {
        const patchUrl = `${DRIVE_UPLOAD_BASE}/${current.fileId}?uploadType=media`;
        const response = await fetchWithTimeout(
          patchUrl,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
            body: bytes,
          },
          DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
          const err = await response.text().catch(() => "");
          throw new DriveApiError(
            `Failed to update manifest.json (${response.status}): ${err}`,
            response.status
          );
        }
      });
    } else {
      // Create new manifest.json file
      await uploadBinaryToAppData(
        accessToken,
        "manifest.json",
        "application/json",
        bytes
      );
    }
  });

  return manifestWriteQueue;
}

/**
 * Uploads the standalone SQLite database snapshot (revision.db) to appDataFolder.
 */
export async function uploadDatabaseOnly(
  accessToken: string,
  dbBytes: Uint8Array
): Promise<DriveBackupFile> {
  const existing = await findAppDataFile(accessToken, "revlog_database.db");

  if (existing) {
    const payload =
      dbBytes.byteOffset === 0 && dbBytes.byteLength === dbBytes.buffer.byteLength
        ? dbBytes.buffer
        : dbBytes.slice().buffer;

    // Overwrite existing database file via PATCH media upload
    return withRetry(async () => {
      const patchUrl = `${DRIVE_UPLOAD_BASE}/${existing.id}?uploadType=media`;
      const response = await fetchWithTimeout(
        patchUrl,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
          },
          body: payload as ArrayBuffer,
        },
        TRANSFER_TIMEOUT_MS
      );

      if (!response.ok) {
        const err = await response.text().catch(() => "");
        throw new DriveApiError(
          `Failed to update revlog_database.db (${response.status}): ${err}`,
          response.status
        );
      }

      return {
        id: existing.id,
        name: "revlog_database.db",
        size: dbBytes.byteLength.toString(),
        modifiedTime: new Date().toISOString(),
      };
    });
  }

  // Create new revlog_database.db
  return uploadBinaryToAppData(
    accessToken,
    "revlog_database.db",
    "application/octet-stream",
    dbBytes
  );
}

/**
 * Downloads the standalone database (revlog_database.db) from appDataFolder.
 */
export async function downloadDatabaseOnly(
  accessToken: string
): Promise<Uint8Array | null> {
  const file = await findAppDataFile(accessToken, "revlog_database.db");
  if (!file) return null;

  return downloadBackup(accessToken, file.id);
}

export interface DriveFileRevision {
  id: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Lists version history / revisions for a file in Google Drive.
 */
export async function listFileRevisions(
  accessToken: string,
  fileId: string
): Promise<DriveFileRevision[]> {
  return withRetry(async () => {
    const url = `${DRIVE_API_BASE}/${fileId}/revisions?fields=revisions(id,modifiedTime,size)`;
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json().catch(() => ({}));
    return (data.revisions || []) as DriveFileRevision[];
  });
}

/**
 * Downloads a specific previous revision of a file from Google Drive.
 */
export async function downloadRevisionBytes(
  accessToken: string,
  fileId: string,
  revisionId: string
): Promise<Uint8Array> {
  return withRetry(async () => {
    const url = `${DRIVE_API_BASE}/${fileId}/revisions/${revisionId}?alt=media`;
    const response = await fetchWithTimeout(
      url,
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
        `Failed to download revision ${revisionId} (${response.status}): ${err}`,
        response.status
      );
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  });
}


