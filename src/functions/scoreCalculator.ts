/**
 * Scoring engine for revision sessions.
 *
 * Reads the scoring weights from assets/scores/score.json and evaluates
 * user answers against the correct answers stored in each Question row.
 */

import type { Question } from "../database/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionResult = {
  questionIndex: number;
  isCorrect: boolean;
  isUnanswered: boolean;
  isPartial: boolean;
  pointsAwarded: number;
  userAnswer: string | string[] | null;
  correctAnswer: string | string[] | null;
};

export type ScoreResult = {
  totalScore: number; // Equals correctCount
  maxPossibleScore: number; // Equals total questions
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  partialCount: number;
  questionResults: QuestionResult[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Case-insensitive string comparison for answer matching. */
function answersMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * For MSQ: checks whether all correct options were selected and no wrong ones were picked.
 */
function evaluateMSQ(
  userAnswer: string[],
  correctAnswer: string[],
): { allCorrect: boolean; hasWrong: boolean; correctHits: number } {
  const correctSet = new Set(correctAnswer.map((s) => s.trim().toLowerCase()));
  let correctHits = 0;
  let hasWrong = false;

  for (const opt of userAnswer) {
    if (correctSet.has(opt.trim().toLowerCase())) {
      correctHits++;
    } else {
      hasWrong = true;
    }
  }

  return {
    allCorrect: correctHits === correctSet.size && !hasWrong,
    hasWrong,
    correctHits,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Evaluates all questions in a revision session.
 *
 * Pure count of correct vs incorrect answers — no negative points or weighted scores.
 */
export function calculateScores(
  questionList: Question[],
  answers: (string | string[] | null)[],
): ScoreResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let partialCount = 0;
  const questionResults: QuestionResult[] = [];

  for (let i = 0; i < questionList.length; i++) {
    const q = questionList[i];
    const userAns = answers[i];

    // Determine the correct answer for this question type
    let correctAns: string | string[] | null = null;
    if (q.questionType === "MCQ") correctAns = q.mcqAnswer;
    else if (q.questionType === "MSQ") correctAns = q.msqAnswer;
    else if (q.questionType === "NAT") correctAns = q.natAnswer;

    // ── Unanswered ──────────────────────────────────────────────────────
    if (
      userAns === null ||
      userAns === undefined ||
      (typeof userAns === "string" && userAns.trim() === "") ||
      (Array.isArray(userAns) && userAns.length === 0)
    ) {
      unansweredCount++;
      questionResults.push({
        questionIndex: i,
        isCorrect: false,
        isUnanswered: true,
        isPartial: false,
        pointsAwarded: 0,
        userAnswer: userAns,
        correctAnswer: correctAns,
      });
      continue;
    }

    // ── MCQ or NAT — exact match ────────────────────────────────────────
    if (q.questionType === "MCQ" || q.questionType === "NAT") {
      const isCorrect =
        typeof userAns === "string" &&
        typeof correctAns === "string" &&
        answersMatch(userAns, correctAns);

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      questionResults.push({
        questionIndex: i,
        isCorrect,
        isUnanswered: false,
        isPartial: false,
        pointsAwarded: isCorrect ? 1 : 0,
        userAnswer: userAns,
        correctAnswer: correctAns,
      });
      continue;
    }

    // ── MSQ — multi-select ──────────────────────────────────────────────
    if (
      q.questionType === "MSQ" &&
      Array.isArray(userAns) &&
      Array.isArray(correctAns)
    ) {
      const { allCorrect, hasWrong, correctHits } = evaluateMSQ(
        userAns,
        correctAns,
      );

      if (allCorrect) {
        // All options match exactly
        correctCount++;
        questionResults.push({
          questionIndex: i,
          isCorrect: true,
          isUnanswered: false,
          isPartial: false,
          pointsAwarded: 1,
          userAnswer: userAns,
          correctAnswer: correctAns,
        });
      } else if (hasWrong) {
        // At least one option outside the correct set
        incorrectCount++;
        questionResults.push({
          questionIndex: i,
          isCorrect: false,
          isUnanswered: false,
          isPartial: false,
          pointsAwarded: 0,
          userAnswer: userAns,
          correctAnswer: correctAns,
        });
      } else {
        // Partial: some correct, none wrong (treated as incorrect in strict count)
        incorrectCount++;
        partialCount++;
        questionResults.push({
          questionIndex: i,
          isCorrect: false,
          isUnanswered: false,
          isPartial: true,
          pointsAwarded: 0,
          userAnswer: userAns,
          correctAnswer: correctAns,
        });
      }
      continue;
    }

    // Fallback — shouldn't happen, treat as unanswered
    unansweredCount++;
    questionResults.push({
      questionIndex: i,
      isCorrect: false,
      isUnanswered: true,
      isPartial: false,
      pointsAwarded: 0,
      userAnswer: userAns,
      correctAnswer: correctAns,
    });
  }

  return {
    totalScore: correctCount,
    maxPossibleScore: questionList.length,
    correctCount,
    incorrectCount,
    unansweredCount,
    partialCount,
    questionResults,
  };
}
