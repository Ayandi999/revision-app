import { requireOptionalNativeModule } from "expo";

/**
 * Checks if on-device OCR text extraction is supported in the current runtime/device.
 *
 * Uses `requireOptionalNativeModule` so in Expo Go or devices without the compiled
 * native module, it safely returns `false` without throwing an uncaught native module error.
 */
export async function isOcrSupported(): Promise<boolean> {
  try {
    const nativeModule = requireOptionalNativeModule("ExpoTextExtractor");
    if (!nativeModule) {
      return false;
    }
    return Boolean(nativeModule.isSupported);
  } catch {
    return false;
  }
}

/**
 * Extracts text strictly from the question image using on-device OCR.
 * Does NOT extract from solution images.
 * Failure or lack of support will safely resolve to null without throwing.
 */
export async function extractTextFromQuestionImage(
  questionImageUri: string | null | undefined
): Promise<string | null> {
  if (!questionImageUri) {
    return null;
  }

  try {
    const nativeModule = requireOptionalNativeModule("ExpoTextExtractor");
    if (!nativeModule || !nativeModule.isSupported) {
      return null;
    }

    // Only import the package when the native module is actually registered
    const extractor = await import("@zhanziyang/expo-text-extractor");
    const lines = await extractor.extractTextFromImage(questionImageUri);
    if (Array.isArray(lines) && lines.length > 0) {
      const textContent = lines
        .map((l) => (typeof l === "string" ? l.trim() : ""))
        .filter(Boolean)
        .join("\n");
      return textContent.trim() || null;
    }
    return null;
  } catch (err) {
    console.warn("[OCR] Could not extract text from question image:", err);
    return null;
  }
}
