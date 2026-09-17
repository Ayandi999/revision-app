import { Directory, File, Paths } from "expo-file-system";
import { formatBytes } from "@/services/backupService";

export interface DeviceMediaStorage {
  imageBytes: number;
  audioBytes: number;
  totalBytes: number;
  formattedTotal: string;
  formattedImages: string;
  formattedAudio: string;
}

/**
 * Recursively calculates the byte size of a directory on the device.
 * Tries the fast native directory.size first, and falls back to
 * recursively walking files via directory.list() if native size is unavailable.
 */
export function getDirectorySizeBytes(dir: Directory): number {
  try {
    if (!dir.exists) return 0;
    if (typeof dir.size === "number" && !isNaN(dir.size) && dir.size >= 0) {
      return dir.size;
    }
  } catch {
    // Native size property might throw if directory cannot be read directly
  }

  return calculateDirectorySizeManual(dir);
}

function calculateDirectorySizeManual(dir: Directory): number {
  try {
    if (!dir.exists) return 0;
    let total = 0;
    const items = dir.list();
    for (const item of items) {
      if (item instanceof Directory) {
        total += calculateDirectorySizeManual(item);
      } else if (item instanceof File) {
        try {
          if (typeof item.size === "number" && !isNaN(item.size)) {
            total += item.size;
          }
        } catch {
          // Ignore individual unreadable file
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Calculates total space occupied on device by images and audio combined.
 * Images are located at Paths.document/revision-app/images (and subfolders)
 * Audio files are located at Paths.document/revision-app/audio
 */
export function getDeviceMediaStorageSize(): DeviceMediaStorage {
  try {
    const baseAppDir = new Directory(Paths.document, "revision-app");
    const imagesDir = new Directory(Paths.document, "revision-app", "images");
    const audioDir = new Directory(Paths.document, "revision-app", "audio");

    const imageBytes = getDirectorySizeBytes(imagesDir);
    const audioBytes = getDirectorySizeBytes(audioDir);

    let totalBytes = imageBytes + audioBytes;

    // Safety check: if any media was saved directly in revision-app root
    if (baseAppDir.exists) {
      const baseBytes = getDirectorySizeBytes(baseAppDir);
      if (baseBytes > totalBytes) {
        totalBytes = baseBytes;
      }
    }

    return {
      imageBytes,
      audioBytes,
      totalBytes,
      formattedTotal: formatBytes(totalBytes, 0),
      formattedImages: formatBytes(imageBytes, 0),
      formattedAudio: formatBytes(audioBytes, 0),
    };
  } catch (err) {
    console.warn("[mediaStorage] Error calculating device media storage size:", err);
    return {
      imageBytes: 0,
      audioBytes: 0,
      totalBytes: 0,
      formattedTotal: "0 B",
      formattedImages: "0 B",
      formattedAudio: "0 B",
    };
  }
}

export async function getDeviceMediaStorageSizeAsync(): Promise<DeviceMediaStorage> {
  return getDeviceMediaStorageSize();
}
