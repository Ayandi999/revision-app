/**
 * Scoring engine for revision sessions.
 *
 * Reads the scoring weights from assets/scores/score.json and evaluates
 * user answers against the correct answers stored in each Question row.
 */

import type { Question } from "../database/schema";
import scoreConfig from "@/assets/scores/score.json";

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
  totalScore: number;
  maxPossibleScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  partialCount: number;
  questionResults: QuestionResult[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORRECT_POINTS = Number(scoreConfig.correct);
const INCORRECT_POINTS = Number(scoreConfig.incorrect);
const PARTIAL_POINTS = Number(scoreConfig.partially);

/** Case-insensitive string comparison for answer matching. */
function answersMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * For MSQ: checks how many of the user's selected options are in the correct set,
 * and whether any are outside it.
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
 * Scores all questions in a revision session.
 *
 * Also mutates each Question's `correct` / `incorrect` counts in-place
 * so the caller can persist the updated values.
 */
export function calculateScores(
  questionList: Question[],
  answers: (string | string[] | null)[],
): ScoreResult {
  let totalScore = 0;
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
        totalScore += CORRECT_POINTS;
        correctCount++;
        q.correct += 1;
      } else {
        totalScore += INCORRECT_POINTS; // negative
        incorrectCount++;
        q.incorrect += 1;
      }

      questionResults.push({
        questionIndex: i,
        isCorrect,
        isUnanswered: false,
        isPartial: false,
        pointsAwarded: isCorrect ? CORRECT_POINTS : INCORRECT_POINTS,
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
        totalScore += CORRECT_POINTS;
        correctCount++;
        q.correct += 1;
        questionResults.push({
          questionIndex: i,
          isCorrect: true,
          isUnanswered: false,
          isPartial: false,
          pointsAwarded: CORRECT_POINTS,
          userAnswer: userAns,
          correctAnswer: correctAns,
        });
      } else if (hasWrong) {
        // At least one option outside the correct set
        totalScore += INCORRECT_POINTS;
        incorrectCount++;
        q.incorrect += 1;
        questionResults.push({
          questionIndex: i,
          isCorrect: false,
          isUnanswered: false,
          isPartial: false,
          pointsAwarded: INCORRECT_POINTS,
          userAnswer: userAns,
          correctAnswer: correctAns,
        });
      } else {
        // Partial: some correct, none wrong
        const partialScore = correctHits * PARTIAL_POINTS;
        totalScore += partialScore;
        partialCount++;
        q.incorrect += 1; // per the plan: update incorrect field for partial
        questionResults.push({
          questionIndex: i,
          isCorrect: false,
          isUnanswered: false,
          isPartial: true,
          pointsAwarded: partialScore,
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
    totalScore,
    maxPossibleScore: questionList.length * CORRECT_POINTS,
    correctCount,
    incorrectCount,
    unansweredCount,
    partialCount,
    questionResults,
  };
}
