/**
 * Main goal here is to fetch the questions for revision
 *
 * Idea is to check if there is any cached test in the key value pair
 * Check if the question Db exist
 * check if the image directory exist
 * if a cached test is found
 *      check if this test is of today or yesterday
 *          if today
 *               return the cached test as this was made today
 *          else
 *              i need to check if it's already synced with DB [ensure progress is saved]
 *              then delete/empty the test / store new data
 *              run DB query to fetch the data based on todays date matching revision date
 *              take the fetched data and return that
 *
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { lt } from "drizzle-orm";
import { db } from "../database/db";
import { questions, type Question } from "../database/schema";
import { syncQuestionsToDB } from "./syncQuestion";

// ─── Constants ───────────────────────────────────────────────────────────────

/** The AsyncStorage key under which today's revision session is cached. */
const REVISION_DATA_KEY = "revision-data";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The shape of the value stored under {@link REVISION_DATA_KEY}.
 *
 * - `questions`    — the array of Question rows for this revision session.
 * - `cachedAt`     — Unix timestamp (ms) of when the cache was written.
 * - `syncedWithDb` — whether yesterday's session results were flushed back to
 *                    the DB before the cache was replaced. Defaults to `false`
 *                    on fresh writes; set to `true` after a sync step.
 */
export type RevisionCache = {
  questions: Question[];
  cachedAt: number;
  syncedWithDb: boolean;
  expiresAt: number;
  lastQuestionVisited: number;
  status: "completed" | "not-started" | "in-progress";
  /** User answers — indexed by question position. null = unanswered. */
  answers: (string | string[] | null)[];
  /** Seconds spent on each question — indexed by question position. */
  timeTaken: number[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns `true` if the given timestamp falls on today's calendar date. */
function isToday(timestampMs: number): boolean {
  const cached = new Date(timestampMs);
  const now = new Date();
  return (
    cached.getFullYear() === now.getFullYear() &&
    cached.getMonth() === now.getMonth() &&
    cached.getDate() === now.getDate()
  );
}

/** Returns midnight (00:00:00.000) of **tomorrow** — the exclusive upper bound. */
function tomorrowMidnight(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function readCache(): Promise<RevisionCache | null> {
  const raw = await AsyncStorage.getItem(REVISION_DATA_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as RevisionCache;
}

export async function writeCache(cache: RevisionCache): Promise<void> {
  await AsyncStorage.setItem(REVISION_DATA_KEY, JSON.stringify(cache));
}

async function clearCache(): Promise<void> {
  await AsyncStorage.removeItem(REVISION_DATA_KEY);
}

// ─── DB query ─────────────────────────────────────────────────────────────────

/**
 * Fetches all questions due for revision on or before today.
 *
 * The window is: nextRevisionDate < tomorrowMidnight (exclusive)
 * This includes today's scheduled questions as well as any overdue questions.
 */
async function fetchDueQuestions(): Promise<Question[]> {
  return db
    .select()
    .from(questions)  
    .where(lt(questions.nextRevisionDate, tomorrowMidnight()));
}

// ─── Main export ─────────────────────────────────────────────────────────────

export type RevisionFetchResult =
  | { success: true; questions: Question[]; fromCache: boolean }
  | { success: false; error: string };

/**
 * Returns today's revision questions, using a cached value where possible.
 *
 * Flow:
 *  1. Read `"revision-data"` from AsyncStorage.
 *  2. If the cache exists and was written **today** with questions (or completed) → return it.
 *  3. If the cache is empty or stale → clear it and query fresh questions.
 *  4. Run a fresh Drizzle query for all due questions.
 *  5. Persist the result under `"revision-data"` and return it.
 */
export async function getRevisionQuestions(): Promise<RevisionFetchResult> {
  try {
    // ── 1. Check cache ──────────────────────────────────────────────────────
    const cache = await readCache();

    if (cache) {
      // ── 2. Cache is fresh (today) ─────────────────────────────────────────
      if (
        isToday(cache.cachedAt) &&
        (cache.questions.length > 0 || cache.status === "completed")
      ) {
        return { success: true, questions: cache.questions, fromCache: true };
      }

      // ── 3. Cache is stale ─────────────────────────────────────────────────
      if (!cache.syncedWithDb && cache.status === "completed") {
        // Flush yesterday's completed session results into the DB before
        // discarding the stale cache and fetching fresh questions.
        await syncQuestionsToDB(cache);
      }

      await clearCache();
    }

    // ── 4. Fresh DB fetch ───────────────────────────────────────────────────
    const dueQuestions = await fetchDueQuestions();

    // ── 5. Persist and return ───────────────────────────────────────────────
    // const newCache: RevisionCache = {
    //   questions: dueQuestions,
    //   cachedAt: Date.now(),
    //   syncedWithDb: false,
    // };
    const newCache: RevisionCache = {
      questions: dueQuestions,
      cachedAt: Date.now(),
      syncedWithDb: false,
      expiresAt: tomorrowMidnight().getTime(),
      lastQuestionVisited: -1,
      status: "not-started",
      answers: new Array(dueQuestions.length).fill(null),
      timeTaken: new Array(dueQuestions.length).fill(0),
    }
    await writeCache(newCache);

    return { success: true, questions: dueQuestions, fromCache: false };
  } catch (error) {
    console.error("[getRevisionQuestions] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch revision questions.",
    };
  }
}
