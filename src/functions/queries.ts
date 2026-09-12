import { AddQuestionFormData } from "@/types/question";
import { db } from "../database/db";
import { questions, type Question } from "../database/schema";
import { extractTextFromQuestionImage } from "./extractText";
import { resolveImageUri } from "./imageHelpers";

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

    const qImages =
      Array.isArray(data.questionImageUris) && data.questionImageUris.length > 0
        ? data.questionImageUris
        : data.questionImageUri
          ? [data.questionImageUri]
          : [];

    const sImages =
      Array.isArray(data.solutionImageUris) && data.solutionImageUris.length > 0
        ? data.solutionImageUris
        : data.solutionImageUri
          ? [data.solutionImageUri]
          : [];

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
