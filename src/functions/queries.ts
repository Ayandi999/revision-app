import { AddQuestionFormData } from "@/types/question";
import { eq } from "drizzle-orm";
import { File } from "expo-file-system";
import { db } from "../database/db";
import { backupImages, questions, type Question } from "../database/schema";
import { extractTextFromQuestionImage } from "./extractText";
import { resolveImageUri, toRelativePath } from "./imageHelpers";

export type InsertResult =
  | { success: true; data: Question }
  | { success: false; error: string };

export async function insertIntoLocalDb(
  data: AddQuestionFormData,
): Promise<InsertResult> {
  try {
    // 1. Check if data is null, undefined, or empty object
    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return { success: false, error: "Question data cannot be empty." };
    }

    // 2. Validate question type
    if (
      !data.questionType ||
      !["MCQ", "MSQ", "NAT"].includes(data.questionType)
    ) {
      return {
        success: false,
        error: "Valid question type (MCQ, MSQ, NAT) is required.",
      };
    }

    // 3. Validate answer depending on question type
    if (data.questionType === "MCQ" && !data.mcqAnswer) {
      return {
        success: false,
        error: "Please select an answer for the MCQ question.",
      };
    }

    if (
      data.questionType === "MSQ" &&
      (!Array.isArray(data.msqAnswer) || data.msqAnswer.length === 0)
    ) {
      return {
        success: false,
        error: "Please select at least one option for the MSQ question.",
      };
    }

    if (
      data.questionType === "NAT" &&
      (!data.natAnswer || !data.natAnswer.trim())
    ) {
      return {
        success: false,
        error: "Please provide a numerical answer for NAT.",
      };
    }

    const rawQImages =
      Array.isArray(data.questionImageUris) && data.questionImageUris.length > 0
        ? data.questionImageUris
        : data.questionImageUri
          ? [data.questionImageUri]
          : [];

    const rawSImages =
      Array.isArray(data.solutionImageUris) && data.solutionImageUris.length > 0
        ? data.solutionImageUris
        : data.solutionImageUri
          ? [data.solutionImageUri]
          : [];

    // Ensure portable relative paths are stored in the database
    const qImages = rawQImages.map(toRelativePath);
    const sImages = rawSImages.map(toRelativePath);

    // 3.5. Extract text from all question images using OCR
    let extractedText: string | null = null;
    if (qImages.length > 0) {
      try {
        const textParts: string[] = [];
        for (const imgUri of qImages) {
          // Resolve relative path to absolute URI for OCR file access
          const text = await extractTextFromQuestionImage(resolveImageUri(imgUri));
          if (text && text.trim()) {
            textParts.push(text.trim());
          }
        }
        if (textParts.length > 0) {
          extractedText = textParts.join("\n\n");
        }
      } catch (err) {
        console.warn("[insertIntoLocalDb] OCR extraction failed:", err);
      }
    }

    // 4. Insert into database
    const insertedRows = await db
      .insert(questions)
      .values({
        questionImageUri: qImages[0] ?? null,
        questionImageUris: qImages,
        extractedText,
        subject: data.subject?.trim() ?? "",
        topics: Array.isArray(data.topics) ? data.topics : [],
        subtopics: Array.isArray(data.subtopics) ? data.subtopics : [],
        solutionImageUri: sImages[0] ?? null,
        solutionImageUris: sImages,
        questionType: data.questionType,
        mcqAnswer:
          data.questionType === "MCQ" ? (data.mcqAnswer ?? null) : null,
        msqAnswer:
          data.questionType === "MSQ" ? (data.msqAnswer ?? null) : null,
        natAnswer:
          data.questionType === "NAT" ? (data.natAnswer?.trim() ?? null) : null,
        personalNote: data.personalNote?.trim()
          ? data.personalNote.trim()
          : null,
      })
      .returning();

    // 5. Return success with inserted row
    return {
      success: true,
      data: insertedRows[0],
    };
  } catch (error) {
    console.error("[insertIntoLocalDb] Insertion error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to insert question into database.",
    };
  }
}

export async function deleteQuestionFromLocalDb(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch question before deletion to retrieve images
    const existing = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .get();

    if (!existing) {
      return { success: false, error: "Question not found." };
    }

    // 2. Delete the question row from SQLite
    await db.delete(questions).where(eq(questions.id, id));

    // 3. Delete local image files (best effort)
    const imagesToDelete = [
      ...(Array.isArray(existing.questionImageUris)
        ? existing.questionImageUris
        : []),
      ...(existing.questionImageUri ? [existing.questionImageUri] : []),
      ...(Array.isArray(existing.solutionImageUris)
        ? existing.solutionImageUris
        : []),
      ...(existing.solutionImageUri ? [existing.solutionImageUri] : []),
    ];

    for (const relPath of imagesToDelete) {
      if (!relPath) continue;

      // 3a. Remove from pending backup queue so it never blocks cloud database sync
      try {
        await db
          .delete(backupImages)
          .where(eq(backupImages.relativePath, relPath));
      } catch (backupErr) {
        console.warn(
          "[deleteQuestionFromLocalDb] Could not clean up backup_images:",
          backupErr,
        );
      }

      // 3b. Delete local physical image file
      try {
        const fullUri = resolveImageUri(relPath);
        if (fullUri) {
          const file = new File(fullUri);
          if (file.exists) {
            file.delete();
          }
        }
      } catch (err) {
        console.warn(
          "[deleteQuestionFromLocalDb] Could not delete image file:",
          err,
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteQuestionFromLocalDb] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete question.",
    };
  }
}

export interface UpdateQuestionFormData extends AddQuestionFormData {
  extractedText?: string | null;
}

export async function updateQuestionInLocalDb(
  id: number,
  data: UpdateQuestionFormData,
): Promise<{ success: boolean; data?: Question; error?: string }> {
  try {
    if (!data || typeof data !== "object") {
      return { success: false, error: "Question data cannot be empty." };
    }

    if (
      !data.questionType ||
      !["MCQ", "MSQ", "NAT"].includes(data.questionType)
    ) {
      return {
        success: false,
        error: "Valid question type (MCQ, MSQ, NAT) is required.",
      };
    }

    if (data.questionType === "MCQ" && !data.mcqAnswer) {
      return {
        success: false,
        error: "Please select an answer for the MCQ question.",
      };
    }

    if (
      data.questionType === "MSQ" &&
      (!Array.isArray(data.msqAnswer) || data.msqAnswer.length === 0)
    ) {
      return {
        success: false,
        error: "Please select at least one option for the MSQ question.",
      };
    }

    if (
      data.questionType === "NAT" &&
      (!data.natAnswer || !data.natAnswer.trim())
    ) {
      return {
        success: false,
        error: "Please provide a numerical answer for NAT.",
      };
    }

    const rawQImages =
      Array.isArray(data.questionImageUris) && data.questionImageUris.length > 0
        ? data.questionImageUris
        : data.questionImageUri
          ? [data.questionImageUri]
          : [];

    const rawSImages =
      Array.isArray(data.solutionImageUris) && data.solutionImageUris.length > 0
        ? data.solutionImageUris
        : data.solutionImageUri
          ? [data.solutionImageUri]
          : [];

    const qImages = rawQImages.map(toRelativePath);
    const sImages = rawSImages.map(toRelativePath);

    // If explicit extractedText is provided, use it; otherwise extract if images exist
    let extractedText = data.extractedText !== undefined ? data.extractedText : null;
    if (extractedText === null && qImages.length > 0) {
      try {
        const textParts: string[] = [];
        for (const imgUri of qImages) {
          const text = await extractTextFromQuestionImage(resolveImageUri(imgUri));
          if (text && text.trim()) {
            textParts.push(text.trim());
          }
        }
        if (textParts.length > 0) {
          extractedText = textParts.join("\n\n");
        }
      } catch (err) {
        console.warn("[updateQuestionInLocalDb] OCR extraction failed:", err);
      }
    }

    const updatedRows = await db
      .update(questions)
      .set({
        questionImageUri: qImages[0] ?? null,
        questionImageUris: qImages,
        extractedText,
        subject: data.subject?.trim() ?? "",
        topics: Array.isArray(data.topics) ? data.topics : [],
        subtopics: Array.isArray(data.subtopics) ? data.subtopics : [],
        solutionImageUri: sImages[0] ?? null,
        solutionImageUris: sImages,
        questionType: data.questionType,
        mcqAnswer:
          data.questionType === "MCQ" ? (data.mcqAnswer ?? null) : null,
        msqAnswer:
          data.questionType === "MSQ" ? (data.msqAnswer ?? null) : null,
        natAnswer:
          data.questionType === "NAT" ? (data.natAnswer?.trim() ?? null) : null,
        personalNote: data.personalNote?.trim()
          ? data.personalNote.trim()
          : null,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id))
      .returning();

    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: "Question not found or update failed." };
    }

    return {
      success: true,
      data: updatedRows[0],
    };
  } catch (error) {
    console.error("[updateQuestionInLocalDb] Update error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update question.",
    };
  }
}
