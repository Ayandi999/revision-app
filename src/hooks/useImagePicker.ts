import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImagePickerResult =
  | { success: true; uri: string }
  | { success: false; error: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  quality: 0.85,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Copy a temporary cache URI to permanent storage, return the new URI */
function persistImage(cacheUri: string, folder: string): string {
  const dir = new Directory(Paths.document, "revision-app", "images", folder);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const ext = cacheUri.split(".").pop() || "jpg";
  const filename = `${Date.now()}.${ext}`;

  const sourceFile = new File(cacheUri);
  const destFile = new File(dir, filename);
  sourceFile.copy(destFile);

  return destFile.uri;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseImagePickerOptions {
  /** Sub-folder inside documentDirectory/revision-app/images/ (e.g. "questions", "solutions") */
  folder?: string;
}

export function useImagePicker({
  folder = "general",
}: UseImagePickerOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Launch gallery ────────────────────────────────────────────────────
  const launchGallery = useCallback(async (): Promise<ImagePickerResult> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library in Settings.",
      );
      return { success: false, error: "Media library permission denied." };
    }

    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]) {
      return { success: false, error: "Picker cancelled." };
    }

    try {
      setIsProcessing(true);
      const uri = persistImage(result.assets[0].uri, folder);
      return { success: true, uri };
    } catch (err) {
      console.error("[useImagePicker] Failed to persist image:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save image.",
      };
    } finally {
      setIsProcessing(false);
    }
  }, [folder]);

  // ── Launch camera ─────────────────────────────────────────────────────
  const launchCamera = useCallback(async (): Promise<ImagePickerResult> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow camera access in Settings to take photos.",
      );
      return { success: false, error: "Camera permission denied." };
    }

    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]) {
      return { success: false, error: "Camera cancelled." };
    }

    try {
      setIsProcessing(true);
      const uri = persistImage(result.assets[0].uri, folder);
      return { success: true, uri };
    } catch (err) {
      console.error("[useImagePicker] Failed to persist image:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save image.",
      };
    } finally {
      setIsProcessing(false);
    }
  }, [folder]);

  // ── Prompt user to choose source ──────────────────────────────────────
  const pickImage = useCallback((): Promise<ImagePickerResult> => {
    return new Promise((resolve) => {
      Alert.alert("Add Image", "Choose a source", [
        {
          text: "Camera",
          onPress: async () => resolve(await launchCamera()),
        },
        {
          text: "Gallery",
          onPress: async () => resolve(await launchGallery()),
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve({ success: false, error: "User cancelled." }),
        },
      ]);
    });
  }, [launchCamera, launchGallery]);

  return { pickImage, launchCamera, launchGallery, isProcessing };
}
