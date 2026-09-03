export type QuestionType = "MCQ" | "MSQ" | "NAT";

export type OptionLetter = "A" | "B" | "C" | "D";

/**
 * Payload collected from the AddQuestion screen form
 */
export interface AddQuestionFormData {
  questionImageUri?: string | null;
  subject: string;
  topics: string[];
  subtopics: string[];
  solutionImageUri?: string | null;
  questionType: QuestionType;
  mcqAnswer?: OptionLetter | null;
  msqAnswer?: OptionLetter[] | null;
  natAnswer?: string | null;
  personalNote?: string | null;
}
