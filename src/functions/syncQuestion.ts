/**
 * syncQuestion.ts
 *
 * Flushes a completed revision session (stored in AsyncStorage) back into
 * the SQLite database.  For every question in the cache it:
 *
 *   1. Determines whether the user's answer was correct, incorrect, or unanswered.
 *   2. Increments the `correct` / `incorrect` counter by 1 (skipped for unanswered).
 *   3. Advances (or resets) the spaced-repetition stage (`nextRevision`).
 *   4. Calculates the new `nextRevisionDate` based on the stage.
 *   5. Marks the cache as synced so it isn't processed again.
 *
 * Revision schedule
 * ─────────────────
 * The first revision happens automatically because new questions default to
 * `nextRevision = 1` with `nextRevisionDate = tomorrow`.  After that first
 * session the progression is:
 *
 *   correct  → advance:  1 → 3 → 7 → 14 → 30 (capped at 30)
 *   incorrect → reset :  back to 1 (review again tomorrow)
 *   unanswered         :  just reschedule to tomorrow, keep current stage
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../database/db";
import { questions, type Question } from "../database/schema";
import { writeCache, type RevisionCache } from "./revisionQuestionFetch";

// ─── Revision Pattern ────────────────────────────────────────────────────────

/**
 * Ordered progression of revision intervals (in days).
 *
 * Stage 1 is the default for new / reset questions (= tomorrow).
 * After a correct answer we advance through: 3 → 7 → 14 → 30.
 * Once at 30 the question stays at 30-day intervals indefinitely.
 */
const REVISION_STAGES = [1, 3, 7, 14, 30] as const;

// ─── Answer-checking helpers ─────────────────────────────────────────────────
// These mirror the logic in scoreCalculator.ts so we stay consistent.

/** Case-insensitive, trimmed string comparison. */
function answersMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Checks whether the user's answer for a single question is correct.
 *
 * Returns:
 *   `"correct"`    – fully correct answer
 *   `"incorrect"`  – wrong / partially wrong answer
 *   `"unanswered"` – user didn't provide an answer
 */
function evaluateAnswer(
  question: Question,
  userAnswer: string | string[] | null,
): "correct" | "incorrect" | "unanswered" {
  // ── Unanswered ──────────────────────────────────────────────────────────
  if (
    userAnswer === null ||
    userAnswer === undefined ||
    (typeof userAnswer === "string" && userAnswer.trim() === "") ||
    (Array.isArray(userAnswer) && userAnswer.length === 0)
  ) {
    return "unanswered";
  }

  // ── MCQ / NAT — single-value exact match ────────────────────────────────
  if (question.questionType === "MCQ" || question.questionType === "NAT") {
    const correctAns =
      question.questionType === "MCQ"
        ? question.mcqAnswer
        : question.natAnswer;

    if (
      typeof userAnswer === "string" &&
      typeof correctAns === "string" &&
      answersMatch(userAnswer, correctAns)
    ) {
      return "correct";
    }
    return "incorrect";
  }

  // ── MSQ — multi-select ──────────────────────────────────────────────────
  if (
    question.questionType === "MSQ" &&
    Array.isArray(userAnswer) &&
    Array.isArray(question.msqAnswer)
  ) {
    const correctSet = new Set(
      question.msqAnswer.map((s) => s.trim().toLowerCase()),
    );
    let correctHits = 0;
    let hasWrong = false;

    for (const opt of userAnswer) {
      if (correctSet.has(opt.trim().toLowerCase())) {
        correctHits++;
      } else {
        hasWrong = true;
      }
    }

    // Fully correct only if every correct option was picked and nothing extra
    if (correctHits === correctSet.size && !hasWrong) {
      return "correct";
    }
    return "incorrect";
  }

  // Fallback — treat unknown cases as unanswered
  return "unanswered";
}

// ─── Stage advancement helpers ───────────────────────────────────────────────

/**
 * Advances `nextRevision` to the next stage in the pattern.
 * If already at the last stage (30), stays at 30.
 */
function advanceStage(currentStage: number): number {
  const idx = REVISION_STAGES.indexOf(currentStage as (typeof REVISION_STAGES)[number]);

  if (idx === -1) {
    // Unknown stage (shouldn't happen) — start at the first progression stage
    return REVISION_STAGES[1]; // 3
  }

  // Move to the next stage, or stay at the last one
  return REVISION_STAGES[Math.min(idx + 1, REVISION_STAGES.length - 1)];
}

/** Resets `nextRevision` back to stage 1 (review again tomorrow). */
function resetStage(): number {
  return REVISION_STAGES[0]; // 1
}

/**
 * Returns a Date that is `days` days from now (midnight-aligned isn't
 * required — the fetch query uses `< tomorrowMidnight`).
 */
function dateFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Synchronises a completed revision session from the cache back into SQLite.
 *
 * For each question the function:
 *   • Evaluates the user's answer (correct / incorrect / unanswered).
 *   • Updates `correct` or `incorrect` count (+1) — skipped for unanswered.
 *   • Advances or resets the spaced-repetition stage (`nextRevision`).
 *   • Sets `nextRevisionDate` based on the new stage.
 *   • Stamps `updatedAt` with the current time.
 *
 * Once all rows are updated the cache is marked `syncedWithDb = true` so the
 * sync won't run again for this session.
 */
export async function syncQuestionsToDB(
  cache: RevisionCache,
): Promise<void> {
  const { questions: cachedQuestions, answers } = cache;

  // Process each question individually so we can set per-row values
  for (let i = 0; i < cachedQuestions.length; i++) {
    const question = cachedQuestions[i];
    const userAnswer = answers[i];
    const verdict = evaluateAnswer(question, userAnswer);

    // ── Determine new stage + next revision date ──────────────────────────
    let newStage: number;
    let newDate: Date;

    switch (verdict) {
      case "correct":
        // Advance to the next spaced-repetition stage
        newStage = advanceStage(question.nextRevision);
        newDate = dateFromNow(newStage);
        break;

      case "incorrect":
        // Reset back to stage 1 — review again tomorrow
        newStage = resetStage();
        newDate = dateFromNow(newStage);
        break;

      case "unanswered":
        // Don't touch the stage — just reschedule for tomorrow
        newStage = question.nextRevision;
        newDate = dateFromNow(1);
        break;
    }

    // ── Build the update payload ──────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      nextRevision: newStage,
      nextRevisionDate: newDate,
      updatedAt: new Date(),
    };

    // Only bump correct/incorrect for answered questions
    if (verdict === "correct") {
      updatePayload.correct = sql`${questions.correct} + 1`;
    } else if (verdict === "incorrect") {
      updatePayload.incorrect = sql`${questions.incorrect} + 1`;
    }

    // ── Execute the update ────────────────────────────────────────────────
    await db
      .update(questions)
      .set(updatePayload)
      .where(eq(questions.id, question.id));
  }

  // ── Mark cache as synced ────────────────────────────────────────────────
  const syncedCache: RevisionCache = {
    ...cache,
    syncedWithDb: true,
  };
  await writeCache(syncedCache);

  console.log(
    `[syncQuestionsToDB] Synced ${cachedQuestions.length} questions to DB.`,
  );
}
