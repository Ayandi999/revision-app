import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export const TARGET_IMAGE_RESOLUTION = 720;

export interface ImageDimensions {
  width?: number;
  height?: number;
}

/**
 * Downgrades an image to a fixed 720 resolution (width: 720, preserving aspect ratio).
 * Any image that is below or equal to 720 in resolution is skipped (untouched).
 *
 * @param uri Local or cached URI of the image to inspect/resize.
 * @param dimensions Optional known width/height (e.g. from ImagePicker asset).
 * @param targetResolution Resolution limit in pixels (default: 720).
 * @returns The URI of the resized image, or original URI if skipped or on error.
 */
export async function downgradeImageTo720(
  uri: string,
  dimensions?: ImageDimensions,
  targetResolution: number = TARGET_IMAGE_RESOLUTION
): Promise<string> {
  try {
    let width = dimensions?.width;
    let height = dimensions?.height;

    // If dimensions were not supplied, probe the image directly
    if (!width || !height) {
      const probeContext = ImageManipulator.manipulate(uri);
      const probeRef = await probeContext.renderAsync();
      width = probeRef.width;
      height = probeRef.height;
    }

    // If the image is already at or below the target resolution, skip manipulation
    if (width <= targetResolution) {
      return uri;
    }

    // Downgrade image to fixed 720 resolution (aspect ratio automatically preserved)
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: targetResolution });
    const renderedImage = await context.renderAsync();
    const result = await renderedImage.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.85,
    });

    return result.uri;
  } catch (error) {
    console.warn(
      "[downgradeImageTo720] Failed to resize image, falling back to original:",
      error
    );
    return uri;
  }
}

/** Alias for downgradeImageTo720 */
export const resizeImage = downgradeImageTo720;
