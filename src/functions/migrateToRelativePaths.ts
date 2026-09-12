import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../database/db";
import { questions } from "../database/schema";
import { toRelativePath } from "./imageHelpers";

const MIGRATION_FLAG_KEY = "@migration/relative_image_paths_v1";

/**
 * One-time migration that converts all existing absolute file:// image URIs
 * stored in the questions table to portable relative paths.
 *
 * - Guarded by an AsyncStorage flag so it only runs once.
 * - Updates: questionImageUri, questionImageUris, solutionImageUri, solutionImageUris
 * - Runs silently in the background on app startup.
 */
export async function migrateToRelativePaths(): Promise<{
  migrated: number;
  skipped: boolean;
  reason?: string;
}> {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (alreadyMigrated === "true") {
      return { migrated: 0, skipped: true, reason: "Migration already completed" };
    }

    // Fetch all questions
    const allRows = await db.select().from(questions);

    if (allRows.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return { migrated: 0, skipped: false };
    }

    let migratedCount = 0;

    for (const row of allRows) {
      let needsUpdate = false;

      // Convert single question image URI
      const newQuestionImageUri = row.questionImageUri
        ? toRelativePath(row.questionImageUri)
        : null;
      if (newQuestionImageUri !== row.questionImageUri) {
        needsUpdate = true;
      }

      // Convert question image URIs array
      const newQuestionImageUris = Array.isArray(row.questionImageUris)
        ? row.questionImageUris.map(toRelativePath)
        : [];
      if (
        Array.isArray(row.questionImageUris) &&
        row.questionImageUris.some((uri, i) => uri !== newQuestionImageUris[i])
      ) {
        needsUpdate = true;
      }

      // Convert single solution image URI
      const newSolutionImageUri = row.solutionImageUri
        ? toRelativePath(row.solutionImageUri)
        : null;
      if (newSolutionImageUri !== row.solutionImageUri) {
        needsUpdate = true;
      }

      // Convert solution image URIs array
      const newSolutionImageUris = Array.isArray(row.solutionImageUris)
        ? row.solutionImageUris.map(toRelativePath)
        : [];
      if (
        Array.isArray(row.solutionImageUris) &&
        row.solutionImageUris.some((uri, i) => uri !== newSolutionImageUris[i])
      ) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { eq } = await import("drizzle-orm");
        await db
          .update(questions)
          .set({
            questionImageUri: newQuestionImageUri,
            questionImageUris: newQuestionImageUris,
            solutionImageUri: newSolutionImageUri,
            solutionImageUris: newSolutionImageUris,
            updatedAt: new Date(),
          })
          .where(eq(questions.id, row.id));
        migratedCount++;
      }
    }

    // Mark migration as complete
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");

    console.log(
      `[migrateToRelativePaths] Migrated ${migratedCount}/${allRows.length} rows to relative paths.`
    );

    return { migrated: migratedCount, skipped: false };
  } catch (error) {
    console.warn("[migrateToRelativePaths] Migration error:", error);
    return {
      migrated: 0,
      skipped: true,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
