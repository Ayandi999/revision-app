import JSZip from "jszip";

/**
 * WATCH-ITEM: JSZip operates in-memory.
 * While well-suited for current revision volumes (where images are downscaled to 720p),
 * if the question image bank grows exceptionally large (e.g. hundreds of megabytes),
 * consider migrating to a native streaming zip engine (e.g. react-native-zip-archive).
 */

export interface BackupImageEntry {
  relativePath: string; // e.g. "questions/171234567.jpg"
  bytes: Uint8Array;
}

export interface ExtractedBackup {
  dbBytes: Uint8Array;
  images: BackupImageEntry[];
  metadata: Record<string, any> | null;
}

/**
 * Compresses database snapshot, images, and revision metadata into a single zip archive.
 */
export async function createBackupArchive(
  dbBytes: Uint8Array,
  images: BackupImageEntry[],
  metadata: Record<string, any>
): Promise<Uint8Array> {
  const zip = new JSZip();

  // 1. Add database
  zip.file("revision.db", dbBytes);

  // 2. Add metadata manifest
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  // 3. Add images inside an "images" directory
  const imagesFolder = zip.folder("images");
  if (imagesFolder) {
    for (const img of images) {
      // img.relativePath is like "questions/filename.jpg" or "solutions/filename.jpg"
      imagesFolder.file(img.relativePath, img.bytes);
    }
  }

  // 4. Generate compressed binary
  const compressed = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return compressed;
}

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
 * Validates that a path is safe to extract and does not attempt directory traversal (Zip Slip protection).
 */
export function isSafeRelativePath(p: string): boolean {
  return !p.startsWith("/") && !p.split("/").includes("..");
}

/**
 * Decompresses and extracts a downloaded backup zip archive.
 */
export async function extractBackupArchive(
  zipBytes: Uint8Array
): Promise<ExtractedBackup> {
  const zip = await JSZip.loadAsync(zipBytes);

  // 1. Extract database
  const dbFile = zip.file("revision.db");
  if (!dbFile) {
    throw new Error("Invalid backup archive: missing 'revision.db'.");
  }
  const dbBytes = await dbFile.async("uint8array");
  if (!isValidSqliteFile(dbBytes)) {
    throw new Error(
      "Invalid backup archive: 'revision.db' is not a valid SQLite database file."
    );
  }

  // 2. Extract metadata if present
  let metadata: Record<string, any> | null = null;
  const metaFile = zip.file("metadata.json");
  if (metaFile) {
    try {
      const text = await metaFile.async("text");
      metadata = JSON.parse(text);
    } catch {
      metadata = null;
    }
  }

  // 3. Extract images with directory traversal protection
  const images: BackupImageEntry[] = [];
  const imageFiles = zip.file(/^images\/.+/);

  for (const file of imageFiles) {
    if (file.dir) continue;
    // Strip "images/" prefix to get relative path (e.g. "questions/123.jpg")
    const relativePath = file.name.replace(/^images\//, "");
    if (!isSafeRelativePath(relativePath)) {
      console.warn(`Skipping unsafe path in backup: ${relativePath}`);
      continue;
    }
    const bytes = await file.async("uint8array");
    images.push({ relativePath, bytes });
  }

  return {
    dbBytes,
    images,
    metadata,
  };
}

/**
 * Utility to format byte sizes into human readable strings.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
