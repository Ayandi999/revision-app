import { Directory, File, Paths } from "expo-file-system";
import { toRelativePath } from "./imageHelpers";
import { upsertPendingImage } from "@/services/imageBackupRepo";
import { syncSingleImage } from "@/services/backupService";

// ─── Audio Sandbox Directory Management ──────────────────────────────────────

/**
 * Returns the permanent local audio storage directory under `Paths.document/revision-app/audio`.
 * Automatically creates the directory if it does not already exist.
 */
export function getAudioDirectory(): Directory {
  const dir = new Directory(Paths.document, "revision-app", "audio");
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

// ─── Path Resolution Utilities ────────────────────────────────────────────────

/**
 * Resolves a stored relative audio path (e.g. "revision-app/audio/note_123.m4a")
 * to an absolute `file://` URI at runtime using `Paths.document`.
 */
export function resolveAudioUri(pathOrUri: string | null | undefined): string | null {
  if (!pathOrUri) return null;

  // Already absolute URI
  if (pathOrUri.startsWith("file://") || pathOrUri.startsWith("http")) {
    return pathOrUri;
  }

  // Construct absolute URI from device's document directory
  return new File(Paths.document, pathOrUri).uri;
}

/**
 * Checks whether a given string is an audio file reference rather than legacy typed text.
 */
export function isAudioPath(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed.startsWith("revision-app/audio/") || trimmed.includes("/audio/")) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  return (
    lower.endsWith(".m4a") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".aac") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".3gp") ||
    lower.endsWith(".webm")
  );
}

// ─── Persistence & Cleanup ────────────────────────────────────────────────────

export interface PersistedAudioResult {
  absoluteUri: string;
  relativePath: string;
}

/**
 * Moves/copies a freshly recorded temporary audio file into permanent app sandbox storage
 * under `Paths.document/revision-app/audio/` and schedules it for cloud backup.
 */
export async function persistAudioRecording(
  cacheUri: string
): Promise<PersistedAudioResult> {
  const audioDir = getAudioDirectory();
  const ext = cacheUri.split(".").pop() || "m4a";
  const filename = `note_${Date.now()}.${ext}`;

  const sourceFile = new File(cacheUri);
  const destFile = new File(audioDir, filename);

  // Copy to permanent sandbox storage
  sourceFile.copy(destFile);

  // Delete cache file to prevent clutter
  try {
    sourceFile.delete();
  } catch {
    // Non-fatal cache cleanup
  }

  const absoluteUri = destFile.uri;
  const relativePath = toRelativePath(absoluteUri);

  // Queue into backup repository for Google Drive cloud sync
  upsertPendingImage(relativePath)
    .then(() => syncSingleImage(relativePath))
    .catch((err) => {
      console.warn("[audioHelpers] Auto audio backup trigger failed:", err);
    });

  return { absoluteUri, relativePath };
}

/**
 * Deletes a local audio file if it exists. Useful when re-recording or canceling.
 */
export async function deleteAudioFile(
  pathOrUri: string | null | undefined
): Promise<void> {
  if (!pathOrUri) return;
  try {
    const resolvedUri = resolveAudioUri(pathOrUri);
    if (!resolvedUri) return;
    const file = new File(resolvedUri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.warn("[audioHelpers] Failed to delete audio file:", pathOrUri, err);
  }
}
