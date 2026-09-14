import { getSyllabusForStream, DEFAULT_STREAM_ID } from "@/config/exams";
import { getSubjects, getSubtopics, type SyllabusSchema } from "@/types/syllabus";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../database/db";
import { questions, type Question } from "../database/schema";
import type { RevisionCache } from "./revisionQuestionFetch";

const REVISION_DATA_KEY = "revision-data";

export interface SubtopicStat {
  name: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0 to 100
}

export interface TopicStat {
  name: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0 to 100
  subtopics: SubtopicStat[];
}

export interface SubjectStat {
  name: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0 to 100
  topics: TopicStat[];
}

export interface DashboardStats {
  totalQuestions: number;
  dueTodayCount: number;
  overdueCount: number;
  sessionStatus: "completed" | "in-progress" | "not-started" | "empty";
  sessionCompletedCount: number;
  sessionTotalCount: number;
  accuracyRate: number; // percentage 0-100
  masteredCount: number; // long-term recall (>= 30-day interval)
  stageDistribution: Record<number, number>;
  subjectStats: SubjectStat[];
}

function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTomorrowMidnight(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(timestampMs: number): boolean {
  const cached = new Date(timestampMs);
  const now = new Date();
  return (
    cached.getFullYear() === now.getFullYear() &&
    cached.getMonth() === now.getMonth() &&
    cached.getDate() === now.getDate()
  );
}

export async function fetchDashboardStats(customSyllabus?: SyllabusSchema): Promise<DashboardStats> {
  let activeSyllabus = customSyllabus;
  if (!activeSyllabus) {
    try {
      const raw = await AsyncStorage.getItem("@revision_app_user_exam");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.streamId) {
          activeSyllabus = getSyllabusForStream(parsed.streamId);
        }
      }
    } catch {}
    if (!activeSyllabus) {
      activeSyllabus = getSyllabusForStream(DEFAULT_STREAM_ID);
    }
  }

  let allQuestions: Question[] = [];
  try {
    allQuestions = await db.select().from(questions);
  } catch (dbErr) {
    console.warn(
      "[fetchDashboardStats] db.select failed, returning empty stats:",
      dbErr,
    );
    return {
      totalQuestions: 0,
      dueTodayCount: 0,
      overdueCount: 0,
      sessionStatus: "empty",
      sessionCompletedCount: 0,
      sessionTotalCount: 0,
      accuracyRate: 0,
      masteredCount: 0,
      stageDistribution: { 1: 0, 3: 0, 7: 0, 15: 0, 30: 0, 60: 0, 120: 0, 240: 0, 365: 0 },
      subjectStats: [],
    };
  }

  // Active stream syllabus subjects
  const streamSubjects = getSubjects(activeSyllabus);
  const streamSubjectMap = new Map<string, string>();
  for (const s of streamSubjects) {
    streamSubjectMap.set(s.trim().toLowerCase(), s.trim());
  }

  // If the active stream has defined syllabus subjects, isolate statistics
  // strictly to questions belonging to this stream's syllabus.
  if (streamSubjects.length > 0) {
    allQuestions = allQuestions.filter((q) =>
      streamSubjectMap.has((q.subject || "").trim().toLowerCase()),
    );
  }

  if (allQuestions.length === 0) {
    return {
      totalQuestions: 0,
      dueTodayCount: 0,
      overdueCount: 0,
      sessionStatus: "empty",
      sessionCompletedCount: 0,
      sessionTotalCount: 0,
      accuracyRate: 0,
      masteredCount: 0,
      stageDistribution: { 1: 0, 3: 0, 7: 0, 15: 0, 30: 0, 60: 0, 120: 0, 240: 0, 365: 0 },
      subjectStats: [],
    };
  }

  const todayMid = getTodayMidnight();
  const tomorrowMid = getTomorrowMidnight();

  let dueCount = 0;
  let overdueCount = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let masteredCount = 0;
  const stageDistribution: Record<number, number> = {
    1: 0,
    3: 0,
    7: 0,
    15: 0,
    30: 0,
    60: 0,
    120: 0,
    240: 0,
    365: 0,
  };

  // Aggregation map for Subject -> Topic -> Subtopic
  const subjectMap = new Map<
    string,
    {
      questionCount: number;
      correct: number;
      incorrect: number;
      topics: Map<
        string,
        {
          questionCount: number;
          correct: number;
          incorrect: number;
          subtopics: Map<
            string,
            {
              questionCount: number;
              correct: number;
              incorrect: number;
            }
          >;
        }
      >;
    }
  >();

  for (const q of allQuestions) {
    const revDate = new Date(q.nextRevisionDate);
    if (revDate < tomorrowMid) {
      dueCount++;
    }
    if (revDate < todayMid) {
      overdueCount++;
    }

    const totalTries = q.correct + q.incorrect;

    // Track stage distribution & mastery only if attempted
    if (totalTries > 0) {
      totalCorrect += q.correct;
      totalIncorrect += q.incorrect;

      const stage = q.nextRevision;
      if (stageDistribution[stage] !== undefined) {
        stageDistribution[stage]++;
      } else if (stage >= 365) {
        stageDistribution[365]++;
      } else if (stage === 14) {
        stageDistribution[15]++;
      } else {
        stageDistribution[1]++;
      }

      if (q.nextRevision >= 30) {
        masteredCount++;
      }
    }

    // Process taxonomy
    const rawSubj = (q.subject || "General").trim();
    const subjName = streamSubjectMap.get(rawSubj.toLowerCase()) || rawSubj;
    if (!subjectMap.has(subjName)) {
      subjectMap.set(subjName, {
        questionCount: 0,
        correct: 0,
        incorrect: 0,
        topics: new Map(),
      });
    }
    const subjEntry = subjectMap.get(subjName)!;
    subjEntry.questionCount++;
    subjEntry.correct += q.correct;
    subjEntry.incorrect += q.incorrect;

    const qTopics =
      Array.isArray(q.topics) && q.topics.length > 0 ? q.topics : ["General"];
    const qSubtopics = Array.isArray(q.subtopics) ? q.subtopics : [];

    for (const tName of qTopics) {
      const topicClean = tName.trim();
      if (!subjEntry.topics.has(topicClean)) {
        subjEntry.topics.set(topicClean, {
          questionCount: 0,
          correct: 0,
          incorrect: 0,
          subtopics: new Map(),
        });
      }
      const topicEntry = subjEntry.topics.get(topicClean)!;
      topicEntry.questionCount++;
      topicEntry.correct += q.correct;
      topicEntry.incorrect += q.incorrect;

      // Find subtopics that belong to this topic
      const syllabusSubtopics = getSubtopics(activeSyllabus, subjName, topicClean);

      for (const stName of qSubtopics) {
        const subtopicClean = stName.trim();
        const belongs = syllabusSubtopics.length > 0
          ? syllabusSubtopics.includes(subtopicClean)
          : qTopics.length === 1 || qTopics[0] === topicClean;

        if (belongs) {
          if (!topicEntry.subtopics.has(subtopicClean)) {
            topicEntry.subtopics.set(subtopicClean, {
              questionCount: 0,
              correct: 0,
              incorrect: 0,
            });
          }
          const subtopicEntry = topicEntry.subtopics.get(subtopicClean)!;
          subtopicEntry.questionCount++;
          subtopicEntry.correct += q.correct;
          subtopicEntry.incorrect += q.incorrect;
        }
      }
    }
  }

  // Convert map to sorted SubjectStat[]
  const subjectStats: SubjectStat[] = Array.from(subjectMap.entries()).map(
    ([subjName, sData]) => {
      const sAttempts = sData.correct + sData.incorrect;
      const sAccuracy =
        sAttempts > 0 ? Math.round((sData.correct / sAttempts) * 100) : 0;

      const topics: TopicStat[] = Array.from(sData.topics.entries()).map(
        ([tName, tData]) => {
          const tAttempts = tData.correct + tData.incorrect;
          const tAccuracy =
            tAttempts > 0 ? Math.round((tData.correct / tAttempts) * 100) : 0;

          const subtopics: SubtopicStat[] = Array.from(
            tData.subtopics.entries(),
          ).map(([stName, stData]) => {
            const stAttempts = stData.correct + stData.incorrect;
            const stAccuracy =
              stAttempts > 0
                ? Math.round((stData.correct / stAttempts) * 100)
                : 0;
            return {
              name: stName,
              questionCount: stData.questionCount,
              correct: stData.correct,
              incorrect: stData.incorrect,
              accuracy: stAccuracy,
            };
          });

          // Sort subtopics LEAST to MOST accuracy (focus on weaknesses)
          subtopics.sort((a, b) => {
            if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
            if (a.incorrect !== b.incorrect) return b.incorrect - a.incorrect;
            return b.questionCount - a.questionCount;
          });

          return {
            name: tName,
            questionCount: tData.questionCount,
            correct: tData.correct,
            incorrect: tData.incorrect,
            accuracy: tAccuracy,
            subtopics,
          };
        },
      );

      // Sort topics LEAST to MOST accuracy (focus on weaknesses)
      topics.sort((a, b) => {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        if (a.incorrect !== b.incorrect) return b.incorrect - a.incorrect;
        return b.questionCount - a.questionCount;
      });

      return {
        name: subjName,
        questionCount: sData.questionCount,
        correct: sData.correct,
        incorrect: sData.incorrect,
        accuracy: sAccuracy,
        topics,
      };
    },
  );

  // Sort subjects by accuracy (least to most so weakest subject is surfaced first)
  subjectStats.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.questionCount - a.questionCount;
  });

  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracyRate =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Check today's cached revision session
  let sessionStatus: DashboardStats["sessionStatus"] =
    dueCount > 0 ? "not-started" : "completed";
  let sessionCompletedCount = 0;
  let sessionTotalCount = dueCount;

  try {
    const rawCache = await AsyncStorage.getItem(REVISION_DATA_KEY);
    if (rawCache) {
      const cache = JSON.parse(rawCache) as RevisionCache;
      if (isToday(cache.cachedAt)) {
        sessionTotalCount = cache.questions?.length ?? dueCount;
        if (cache.status === "completed") {
          sessionStatus = "completed";
          sessionCompletedCount = sessionTotalCount;
        } else if (cache.status === "in-progress") {
          sessionStatus = "in-progress";
          sessionCompletedCount = (cache.answers || []).filter(
            (a) => a !== null,
          ).length;
        } else {
          sessionStatus = dueCount > 0 ? "not-started" : "completed";
        }
      }
    }
  } catch (err) {
    console.warn("[fetchDashboardStats] Failed to read cache:", err);
  }

  return {
    totalQuestions: allQuestions.length,
    dueTodayCount: dueCount,
    overdueCount,
    sessionStatus,
    sessionCompletedCount,
    sessionTotalCount,
    accuracyRate,
    masteredCount,
    stageDistribution,
    subjectStats,
  };
}
