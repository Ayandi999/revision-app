import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  questionImageUri: text("question_image_uri"), // relative path in documentDirectory

  // Syllabus taxonomy
  subject: text("subject").notNull(),
  topics: text("topics", { mode: "json" }).$type<string[]>().notNull(), // JSON array of selected topics
  subtopics: text("subtopics", { mode: "json" }).$type<string[]>().notNull(), // JSON array of selected subtopics

  // Solution details & Media
  solutionImageUri: text("solution_image_uri"), // relative path in documentDirectory
  questionType: text("question_type", {
    enum: ["MCQ", "MSQ", "NAT"],
  }).notNull(),

  // Answers based on questionType:
  // - MCQ: "A" | "B" | "C" | "D"
  // - MSQ: ["A", "C"] etc. stored as JSON array
  // - NAT: numerical/text answer string
  mcqAnswer: text("mcq_answer"),
  msqAnswer: text("msq_answer", { mode: "json" }).$type<string[]>(),
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
