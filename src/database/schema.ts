import { customType, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Robust JSON string-array column that safely parses valid JSON arrays
 * and gracefully falls back to wrapping raw strings or empty arrays
 * to prevent SyntaxError crashes on legacy or unquoted database values.
 */
export const jsonStringArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: string[] | null | undefined): string {
    if (!value || !Array.isArray(value)) return "[]";
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
        if (parsed !== null && parsed !== undefined) return [String(parsed)];
        return [];
      } catch {
        // Fallback for raw unquoted strings (prevents SyntaxError JSON Parse error crashes)
        return [trimmed];
      }
    }
    return [String(value)];
  },
});

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  questionImageUri: text("question_image_uri"), // legacy single image path
  questionImageUris: jsonStringArray("question_image_uris"), // JSON array of image URIs
  extractedText: text("extracted_text"), // OCR extracted text from question images

  // Syllabus taxonomy
  subject: text("subject").notNull(),
  topics: jsonStringArray("topics").notNull(), // JSON array of selected topics
  subtopics: jsonStringArray("subtopics").notNull(), // JSON array of selected subtopics

  // Solution details & Media
  solutionImageUri: text("solution_image_uri"), // legacy single image path
  solutionImageUris: jsonStringArray("solution_image_uris"), // JSON array of solution image URIs
  questionType: text("question_type", {
    enum: ["MCQ", "MSQ", "NAT"],
  }).notNull(),

  // Answers based on questionType:
  // - MCQ: "A" | "B" | "C" | "D"
  // - MSQ: ["A", "C"] etc. stored as JSON array
  // - NAT: numerical/text answer string
  mcqAnswer: text("mcq_answer"),
  msqAnswer: jsonStringArray("msq_answer"),
  natAnswer: text("nat_answer"),

  // Personal notes & explanations
  personalNote: text("personal_note"),

  // Spaced repetition & revision statistics
  nextRevision: integer("next_revision").notNull().default(1), // revision stage / interval (defaults to 1)
  correct: integer("correct").notNull().default(0), // correct attempts count
  incorrect: integer("incorrect").notNull().default(0), // incorrect attempts count
  nextRevisionDate: integer("next_revision_date", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
