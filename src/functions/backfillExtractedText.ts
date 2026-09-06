import AsyncStorage from "@react-native-async-storage/async-storage";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../database/db";
import { questions } from "../database/schema";
import { extractTextFromQuestionImage, isOcrSupported } from "./extractText";

const BACKFILL_FLAG_KEY = "@search/backfill_extracted_text_v1";

/**
 * Runs a background backfill for existing questions that have a question image
 * but no extracted OCR text yet.
 *
 * - Skips immediately if OCR is not supported in the current environment (e.g. Expo Go or older Android).
 * - Skips if already flagged as completed in AsyncStorage.
 * - Processes up to batchSize items per pass to avoid blocking the UI thread.
 */
export async function backfillExtractedText(batchSize: number = 5): Promise<{
  processed: number;
  skipped: boolean;
  reason?: string;
}> {
  try {
    const supported = await isOcrSupported();
    if (!supported) {
      return {
        processed: 0,
        skipped: true,
        reason: "OCR not supported in current environment",
      };
    }

    const alreadyCompleted = await AsyncStorage.getItem(BACKFILL_FLAG_KEY);
    if (alreadyCompleted === "true") {
      return {
        processed: 0,
        skipped: true,
        reason: "Backfill already completed previously",
      };
    }

    // Find questions with an image but no extracted text
    const missingRows = await db
      .select({
        id: questions.id,
        questionImageUri: questions.questionImageUri,
      })
      .from(questions)
      .where(
        and(
          isNotNull(questions.questionImageUri),
          isNull(questions.extractedText)
        )
      )
      .limit(batchSize);

    if (missingRows.length === 0) {
      // Mark as completed
      await AsyncStorage.setItem(BACKFILL_FLAG_KEY, "true");
      return { processed: 0, skipped: false };
    }

    let processedCount = 0;
    for (const row of missingRows) {
      if (row.questionImageUri) {
        const text = await extractTextFromQuestionImage(row.questionImageUri);
        if (text) {
          await db
            .update(questions)
            .set({ extractedText: text, updatedAt: new Date() })
            .where(eq(questions.id, row.id));
          processedCount++;
        }
      }
    }

    if (missingRows.length < batchSize) {
      await AsyncStorage.setItem(BACKFILL_FLAG_KEY, "true");
    }

    return { processed: processedCount, skipped: false };
  } catch (error) {
    console.warn("[backfillExtractedText] Error during backfill:", error);
    return {
      processed: 0,
      skipped: true,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
