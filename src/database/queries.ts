import { AddQuestionFormData } from "@/types/question";
import { db } from "./db";
import { questions, type Question } from "./schema";

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

    // 2. Validate required fields
    if (
      !data.subject ||
      typeof data.subject !== "string" ||
      !data.subject.trim()
    ) {
      return { success: false, error: "Subject is required." };
    }

    if (!Array.isArray(data.topics) || data.topics.length === 0) {
      return { success: false, error: "At least one topic must be selected." };
    }

    if (!Array.isArray(data.subtopics) || data.subtopics.length === 0) {
      return {
        success: false,
        error: "At least one subtopic must be selected.",
      };
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

    // 4. Insert into database
    const insertedRows = await db
      .insert(questions)
      .values({
        questionImageUri: data.questionImageUri ?? null,
        subject: data.subject.trim(),
        topics: data.topics,
        subtopics: data.subtopics,
        solutionImageUri: data.solutionImageUri ?? null,
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
