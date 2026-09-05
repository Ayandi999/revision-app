import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { QuestionCard } from "@/components/revision/QuestionCard";
import { ResultQuestionCard } from "@/components/revision/ResultQuestionCard";
import { ResultsPieChart } from "@/components/revision/ResultsPieChart";
import type { Question } from "@/database/schema";
import {
  calculateScores,
  type ScoreResult,
} from "@/functions/scoreCalculator";
import {
  getRevisionQuestions,
  writeCache,
  type RevisionCache,
} from "@/functions/revisionQuestionFetch";

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase = "loading" | "quiz" | "computing" | "results" | "empty" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevisionScreen() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | string[] | null)[]>([]);
  const [timeTaken, setTimeTaken] = useState<number[]>([]);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cache, setCache] = useState<RevisionCache | null>(null);

  // Timer state
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  // Computing phase animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch questions on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const result = await getRevisionQuestions();

      if (!result.success) {
        setErrorMsg(result.error);
        setPhase("error");
        return;
      }

      if (result.questions.length === 0) {
        setPhase("empty");
        return;
      }

      // Read the full cache to get persisted state
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const raw = await AsyncStorage.getItem("revision-data");
      const cachedData: RevisionCache | null = raw ? JSON.parse(raw) : null;

      if (!cachedData) {
        setErrorMsg("Cache not found after fetch.");
        setPhase("error");
        return;
      }

      // If already completed, go straight to results
      if (cachedData.status === "completed") {
        setQuestionList(cachedData.questions);
        setAnswers(cachedData.answers);
        setTimeTaken(cachedData.timeTaken);
        setCache(cachedData);
        // Recompute scores from cached answers
        const scores = calculateScores(
          [...cachedData.questions],
          cachedData.answers,
        );
        setScoreResult(scores);
        setPhase("results");
        return;
      }

      // Determine start index: if lastQuestionVisited >= 0, resume from next
      const startIndex =
        cachedData.lastQuestionVisited >= 0
          ? Math.min(
              cachedData.lastQuestionVisited + 1,
              cachedData.questions.length,
            )
          : 0;

      // If all questions were already visited, go to computing
      if (startIndex >= cachedData.questions.length) {
        setQuestionList(cachedData.questions);
        setAnswers(cachedData.answers);
        setTimeTaken(cachedData.timeTaken);
        setCache(cachedData);
        runScoring(
          cachedData.questions,
          cachedData.answers,
          cachedData.timeTaken,
          cachedData,
        );
        return;
      }

      // Update cache status to in-progress
      const updatedCache: RevisionCache = {
        ...cachedData,
        cachedAt: Date.now(),
        status: "in-progress",
      };
      await writeCache(updatedCache);

      setQuestionList(updatedCache.questions);
      setCurrentIndex(startIndex);
      setAnswers(updatedCache.answers);
      setTimeTaken(updatedCache.timeTaken);
      setCache(updatedCache);

      // Calculate total time: 1 min per remaining question
      const remainingQuestions = updatedCache.questions.length - startIndex;
      setTotalTimeLeft(remainingQuestions * 60);

      setPhase("quiz");
    })();
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — auto-submit
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ── Format timer display ──────────────────────────────────────────────────
  const formatTimer = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Time up handler ───────────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    // Record time for current question
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    setTimeTaken((prev) => {
      const next = [...prev];
      next[currentIndex] = (next[currentIndex] || 0) + elapsed;
      return next;
    });

    // Use latest state values via functional updates
    setAnswers((latestAnswers) => {
      setTimeTaken((latestTimeTaken) => {
        const updatedTimeTaken = [...latestTimeTaken];
        updatedTimeTaken[currentIndex] =
          (updatedTimeTaken[currentIndex] || 0) + elapsed;
        runScoring(questionList, latestAnswers, updatedTimeTaken, cache);
        return updatedTimeTaken;
      });
      return latestAnswers;
    });
  }, [currentIndex, questionList, cache]);

  // ── Answer change handler ─────────────────────────────────────────────────
  const handleAnswerChange = useCallback(
    (answer: string | string[] | null) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = answer;
        return next;
      });
    },
    [currentIndex],
  );

  // ── Next handler ──────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    // Record time for this question
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    const updatedTimeTaken = [...timeTaken];
    updatedTimeTaken[currentIndex] =
      (updatedTimeTaken[currentIndex] || 0) + elapsed;
    setTimeTaken(updatedTimeTaken);

    // Persist to cache
    if (cache) {
      const updatedCache: RevisionCache = {
        ...cache,
        answers: answers,
        timeTaken: updatedTimeTaken,
        lastQuestionVisited: currentIndex,
      };
      await writeCache(updatedCache);
      setCache(updatedCache);
    }

    // Check if last question
    if (currentIndex >= questionList.length - 1) {
      runScoring(questionList, answers, updatedTimeTaken, cache);
      return;
    }

    // Advance to next question
    setCurrentIndex((prev) => prev + 1);
    questionStartRef.current = Date.now();
  }, [currentIndex, answers, timeTaken, questionList, cache]);

  // ── Scoring + transition ──────────────────────────────────────────────────
  const runScoring = useCallback(
    (
      qs: Question[],
      ans: (string | string[] | null)[],
      times: number[],
      c: RevisionCache | null,
    ) => {
      setPhase("computing");
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Compute after a brief delay for the congratulations screen
      setTimeout(async () => {
        const scores = calculateScores([...qs], ans);
        setScoreResult(scores);
        setTimeTaken(times);

        // Mark cache as completed
        if (c) {
          const finalCache: RevisionCache = {
            ...c,
            answers: ans,
            timeTaken: times,
            lastQuestionVisited: qs.length - 1,
            status: "completed",
          };
          await writeCache(finalCache);
          setCache(finalCache);
        }

        setPhase("results");
      }, 2500);
    },
    [fadeAnim],
  );

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading revision questions...</Text>
      </View>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Something went wrong</Text>
        <Text style={styles.errorSubtext}>{errorMsg}</Text>
      </View>
    );
  }

  // ── Render: Empty (no questions due) ──────────────────────────────────────
  if (phase === "empty") {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="checkmark-done-circle" size={56} color="#22C55E" />
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtext}>
          No questions scheduled for revision today.{"\n"}Check back tomorrow.
        </Text>
      </View>
    );
  }

  // ── Render: Computing (congrats animation) ────────────────────────────────
  if (phase === "computing") {
    return (
      <View style={styles.centeredContainer}>
        <Animated.View style={[styles.computingContent, { opacity: fadeAnim }]}>
          <Ionicons name="trophy" size={64} color="#F59E0B" />
          <Text style={styles.congratsTitle}>Congratulations! 🎉</Text>
          <Text style={styles.congratsSubtext}>
            You've completed today's revision.{"\n"}Computing your results...
          </Text>
          <ActivityIndicator
            size="small"
            color="#3B82F6"
            style={{ marginTop: 20 }}
          />
        </Animated.View>
      </View>
    );
  }

  // ── Render: Quiz ──────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const timerUrgent = totalTimeLeft < 60;

    return (
      <View style={styles.screenContainer}>
        {/* Timer bar */}
        <View style={styles.timerBar}>
          <Ionicons
            name="timer-outline"
            size={18}
            color={timerUrgent ? "#EF4444" : "#94A3B8"}
          />
          <Text
            style={[styles.timerText, timerUrgent && styles.timerTextUrgent]}
          >
            {formatTimer(totalTimeLeft)}
          </Text>
          <View style={styles.timerProgress}>
            <View
              style={[
                styles.timerProgressFill,
                {
                  width: `${(totalTimeLeft / (questionList.length * 60)) * 100}%`,
                  backgroundColor: timerUrgent ? "#EF4444" : "#3B82F6",
                },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.quizScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <QuestionCard
            question={questionList[currentIndex]}
            questionIndex={currentIndex}
            totalQuestions={questionList.length}
            answer={answers[currentIndex]}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            isLast={currentIndex === questionList.length - 1}
          />
        </ScrollView>
      </View>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────
  if (phase === "results" && scoreResult) {
    return (
      <View style={styles.screenContainer}>
        <ScrollView
          contentContainerStyle={styles.resultsScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.resultsTitle}>Your Results</Text>

          {/* Score summary */}
          <View style={styles.scoreSummaryCard}>
            <Text style={styles.scoreValue}>
              {scoreResult.totalScore}
              <Text style={styles.scoreMax}>
                {" "}
                / {scoreResult.maxPossibleScore}
              </Text>
            </Text>
            <Text style={styles.scoreLabel}>Total Score</Text>
          </View>

          {/* Pie Chart */}
          <View style={styles.chartCard}>
            <ResultsPieChart
              correct={scoreResult.correctCount}
              incorrect={scoreResult.incorrectCount}
              unanswered={scoreResult.unansweredCount}
              total={questionList.length}
            />
          </View>

          {/* Question cards */}
          <Text style={styles.sectionTitle}>Question Breakdown</Text>
          {scoreResult.questionResults.map((result, i) => (
            <ResultQuestionCard
              key={i}
              question={questionList[i]}
              result={result}
              timeTaken={timeTaken[i] || 0}
              index={i}
            />
          ))}

          {/* Bottom spacer for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared
  screenContainer: {
    flex: 1,
    backgroundColor: "#1c1b1b",
    paddingTop: 56,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#1c1b1b",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  // Loading
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 16,
    fontWeight: "500",
  },

  // Error
  errorText: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  errorSubtext: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  // Empty
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },

  // Computing
  computingContent: {
    alignItems: "center",
  },
  congratsTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  congratsSubtext: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },

  // Timer bar
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(59, 130, 246, 0.08)",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 56,
  },
  timerTextUrgent: {
    color: "#EF4444",
  },
  timerProgress: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  timerProgressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Quiz scroll
  quizScroll: {
    padding: 20,
    paddingBottom: 100,
  },

  // Results
  resultsScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  resultsTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
  },

  // Score summary card
  scoreSummaryCard: {
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  scoreValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },
  scoreMax: {
    color: "#6B7280",
    fontSize: 20,
    fontWeight: "500",
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },

  // Chart card
  chartCard: {
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    padding: 24,
    marginBottom: 24,
  },

  // Section title
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
});
