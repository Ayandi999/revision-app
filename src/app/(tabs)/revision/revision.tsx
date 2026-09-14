import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuestionCard } from "@/components/revision/QuestionCard";
import { ResultQuestionCard } from "@/components/revision/ResultQuestionCard";
import { OverallAccuracyBar } from "@/components/revision/OverallAccuracyBar";
import { QuestionAccuracyBarChart } from "@/components/revision/QuestionAccuracyBarChart";
import { TimePerQuestionChart } from "@/components/revision/TimePerQuestionChart";
import type { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import {
  getRevisionQuestions,
  writeCache,
  type RevisionCache,
} from "@/functions/revisionQuestionFetch";
import { calculateScores, type ScoreResult } from "@/functions/scoreCalculator";
import { syncQuestionsToDB } from "@/functions/syncQuestion";

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "ready"
  | "quiz"
  | "computing"
  | "results"
  | "empty"
  | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevisionScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | string[] | null)[]>([]);
  const [timeTaken, setTimeTaken] = useState<number[]>([]);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cache, setCache] = useState<RevisionCache | null>(null);
  const [hasDismissedResults, setHasDismissedResults] = useState(false);

  // Timer state
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  // Computing phase animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Dismiss results handler ───────────────────────────────────────────────
  const handleDone = useCallback(async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      await AsyncStorage.setItem("@revision_results_dismissed_today", todayStr);
    } catch {}
    setHasDismissedResults(true);
    setPhase("empty");
  }, []);

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

          // Sync results (correct/incorrect counts, revision dates) to the DB
          await syncQuestionsToDB(finalCache);
        }

        try {
          await AsyncStorage.removeItem("@revision_results_dismissed_today");
        } catch {}
        setHasDismissedResults(false);
        setPhase("results");
      }, 2500);
    },
    [fadeAnim],
  );

  // ── Fetch questions ───────────────────────────────────────────────────────
  const loadQuestions = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setPhase("loading");
      }
      setErrorMsg("");

      try {
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
        const raw = await AsyncStorage.getItem("revision-data");
        const cachedData: RevisionCache | null = raw ? JSON.parse(raw) : null;

        if (!cachedData) {
          setErrorMsg("Cache not found after fetch.");
          setPhase("error");
          return;
        }

        // If already completed, check if user dismissed results
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

          const todayStr = new Date().toISOString().split("T")[0];
          let isDismissed = hasDismissedResults;
          try {
            const dismissedDate = await AsyncStorage.getItem(
              "@revision_results_dismissed_today",
            );
            if (dismissedDate === todayStr) {
              isDismissed = true;
            }
          } catch {}

          if (isDismissed) {
            setPhase("empty");
          } else {
            setPhase("results");
          }
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

        setQuestionList(cachedData.questions);
        setCurrentIndex(startIndex);
        setAnswers(cachedData.answers);
        setTimeTaken(cachedData.timeTaken);
        setCache(cachedData);

        // Calculate total time: 1 min per remaining question
        const remainingQuestions = cachedData.questions.length - startIndex;
        setTotalTimeLeft(remainingQuestions * 60);

        setPhase("ready");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to load questions.",
        );
        setPhase("error");
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        }
      }
    },
    [runScoring],
  );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useFocusEffect(
    useCallback(() => {
      if (phase !== "quiz" && phase !== "computing") {
        loadQuestions(false);
      }
    }, [loadQuestions, phase]),
  );

  // ── Start / Resume Quiz handler ───────────────────────────────────────────
  const handleStartQuiz = useCallback(async () => {
    if (cache && cache.status !== "in-progress") {
      const updatedCache: RevisionCache = {
        ...cache,
        cachedAt: Date.now(),
        status: "in-progress",
      };
      await writeCache(updatedCache);
      setCache(updatedCache);
    }
    setPhase("quiz");
  }, [cache]);

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

  // ── Render: Computing (congrats animation) ────────────────────────────────
  if (phase === "computing") {
    return (
      <View style={styles.centeredContainer}>
        <Animated.View style={[styles.computingContent, { opacity: fadeAnim }]}>
          <Ionicons name="trophy" size={64} color={colors.warning} />
          <Text style={styles.congratsTitle}>Congratulations! 🎉</Text>
          <Text style={styles.congratsSubtext}>
            {"You've completed today's revision."}
            {"\n"}Computing your results...
          </Text>
          <ActivityIndicator
            size="small"
            color={colors.primary}
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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Timer bar */}
        <View style={styles.timerBar}>
          <Ionicons
            name="timer-outline"
            size={18}
            color={timerUrgent ? colors.danger : colors.textMuted}
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
                  backgroundColor: timerUrgent ? colors.danger : colors.primary,
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
      </SafeAreaView>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────
  if (phase === "results" && scoreResult) {
    const totalTimeSecs = timeTaken.reduce(
      (acc, curr) => acc + (curr || 0),
      0,
    );

    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* ── Fixed Top Header Bar (remains fixed on scroll) ── */}
        <View style={styles.headerContainer}>
          <View style={styles.resultsHeaderRow}>
            <View>
              <Text style={styles.headerTitle}>Your Results</Text>
              <Text style={styles.headerSubtitle}>
                Performance analysis & question review
              </Text>
            </View>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDone}
              activeOpacity={0.75}
            >
              <Text style={styles.doneBtnText}>Done</Text>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.resultsScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Overall Accuracy Multi-Segment Bar */}
          <OverallAccuracyBar
            score={scoreResult.totalScore}
            maxScore={scoreResult.maxPossibleScore}
            correctCount={scoreResult.correctCount}
            incorrectCount={scoreResult.incorrectCount}
            unansweredCount={scoreResult.unansweredCount}
            totalQuestions={questionList.length}
            totalTimeSeconds={totalTimeSecs}
          />

          {/* 2. Time Taken per Question (Line Graph) */}
          <TimePerQuestionChart timeTaken={timeTaken} />

          {/* 3. Question-wise Historical Accuracy (Scrollable Bar Graph) */}
          <QuestionAccuracyBarChart
            questions={questionList}
            questionResults={scoreResult.questionResults}
          />

          {/* 4. Question Breakdown List */}
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
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Revision Tab Landing (ready, empty, loading, error) ───────────
  const isOngoing = currentIndex > 0 || cache?.status === "in-progress";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ── Top Bar Header (stays fixed on top while scrolling) ── */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Revision</Text>
        <Text style={styles.headerSubtitle}>
          Daily practice & scheduled recall
        </Text>
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadQuestions(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {phase === "loading" && !refreshing && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              Loading revision questions...
            </Text>
          </View>
        )}

        {phase === "error" && (
          <View style={styles.statusBox}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.danger}
            />
            <Text style={styles.errorText}>Something went wrong</Text>
            <Text style={styles.errorSubtext}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadQuestions()}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "empty" && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="checkmark-done"
                size={28}
                color={colors.success}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {cache?.status === "completed"
                ? "Today's Revision Complete!"
                : "You're all caught up!"}
            </Text>
            <Text style={styles.emptySubtext}>
              {cache?.status === "completed"
                ? "Great work! You have finished all scheduled questions for today."
                : "No questions scheduled for revision today.\nCheck back tomorrow."}
            </Text>
            {cache?.status === "completed" && scoreResult && (
              <TouchableOpacity
                style={styles.reviewResultsBtn}
                onPress={() => setPhase("results")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.reviewResultsBtnText}>
                  Review Today's Results
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {phase === "ready" && (
          <View style={styles.availableSection}>
            <Text style={styles.sectionLabel}>AVAILABLE REVISION</Text>

            {/* Compact Rectangular Tab */}
            <TouchableOpacity
              style={styles.revisionTab}
              onPress={handleStartQuiz}
              activeOpacity={0.75}
            >
              {/* Left Icon Badge */}
              <View
                style={[
                  styles.tabIconBadge,
                  isOngoing
                    ? styles.tabIconBadgeProgress
                    : styles.tabIconBadgeDue,
                ]}
              >
                <Ionicons
                  name={isOngoing ? "play" : "book-outline"}
                  size={18}
                  color={isOngoing ? "#F59E0B" : colors.primary}
                />
              </View>

              {/* Middle Details */}
              <View style={styles.tabContent}>
                <View style={styles.tabHeaderRow}>
                  <Text style={styles.tabTitle} numberOfLines={1}>
                    {isOngoing ? "Revision in Progress" : "Daily Revision"}
                  </Text>
                  <View
                    style={[
                      styles.tabStatusBadge,
                      isOngoing
                        ? styles.statusBadgeProgress
                        : styles.statusBadgeDue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabStatusBadgeText,
                        isOngoing
                          ? styles.statusTextProgress
                          : styles.statusTextDue,
                      ]}
                    >
                      {isOngoing ? "In Progress" : "Due Today"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.tabSubtitle} numberOfLines={1}>
                  {isOngoing
                    ? `Q${currentIndex + 1} of ${questionList.length} • ${formatTimer(totalTimeLeft)} left`
                    : `${questionList.length} Questions • ~${Math.max(1, Math.round(questionList.length * 1.5))} mins`}
                </Text>

                {isOngoing && (
                  <View style={styles.tabProgressBarBg}>
                    <View
                      style={[
                        styles.tabProgressBarFill,
                        {
                          width: `${Math.round(
                            (currentIndex / Math.max(1, questionList.length)) *
                              100,
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* Right Action Button */}
              <View style={styles.tabActionWrapper}>
                <View style={styles.tabActionBtn}>
                  <Text style={styles.tabActionBtnText}>
                    {isOngoing ? "Resume" : "Start"}
                  </Text>
                  <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    // Shared
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    headerContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.bg,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 2,
    },
    mainScroll: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 110, // clears the floating bottom tab bar
      flexGrow: 1,
    },
    screenContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: 56,
    },
    centeredContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },

    // Status / Loading
    statusBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 16,
      fontWeight: "500",
    },

    // Error
    errorText: {
      color: colors.danger,
      fontSize: 18,
      fontWeight: "700",
      marginTop: 12,
    },
    errorSubtext: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      textAlign: "center",
    },

    // Empty
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      marginTop: 8,
    },
    emptyIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark
        ? "rgba(16, 185, 129, 0.12)"
        : "rgba(16, 185, 129, 0.1)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(16, 185, 129, 0.25)"
        : "rgba(16, 185, 129, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    emptySubtext: {
      color: colors.textMuted,
      fontSize: 12.5,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 4,
    },
    reviewResultsBtn: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
    },
    reviewResultsBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },

    // Available Section & Rectangular Tab
    availableSection: {
      marginTop: 2,
    },
    sectionLabel: {
      color: colors.textTertiary,
      fontSize: 10.5,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    revisionTab: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 5,
      elevation: 2,
    },
    tabIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
    },
    tabIconBadgeDue: {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.15)"
        : "rgba(37, 99, 235, 0.1)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(59, 130, 246, 0.25)"
        : "rgba(37, 99, 235, 0.2)",
    },
    tabIconBadgeProgress: {
      backgroundColor: isDark
        ? "rgba(245, 158, 11, 0.15)"
        : "rgba(217, 119, 6, 0.1)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(245, 158, 11, 0.25)"
        : "rgba(217, 119, 6, 0.2)",
    },
    tabContent: {
      flex: 1,
    },
    tabHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    tabTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      flexShrink: 1,
    },
    tabStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    statusBadgeDue: {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.15)"
        : "rgba(37, 99, 235, 0.12)",
    },
    statusTextDue: {
      color: isDark ? "#60A5FA" : "#2563EB",
    },
    statusBadgeProgress: {
      backgroundColor: isDark
        ? "rgba(245, 158, 11, 0.15)"
        : "rgba(245, 158, 11, 0.12)",
    },
    statusTextProgress: {
      color: isDark ? "#FBBF24" : "#D97706",
    },
    tabStatusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    tabSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "500",
      marginTop: 2,
    },
    tabProgressBarBg: {
      height: 3,
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.06)",
      borderRadius: 1.5,
      marginTop: 6,
      overflow: "hidden",
    },
    tabProgressBarFill: {
      height: "100%",
      backgroundColor: "#F59E0B",
      borderRadius: 1.5,
    },
    tabActionWrapper: {
      justifyContent: "center",
      alignItems: "center",
    },
    tabActionBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5.5,
      flexDirection: "row",
      alignItems: "center",
      gap: 3.5,
    },
    tabActionBtnText: {
      color: "#FFFFFF",
      fontSize: 11.5,
      fontWeight: "700",
    },

    // Computing
    computingContent: {
      alignItems: "center",
    },
    congratsTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      marginTop: 16,
    },
    congratsSubtext: {
      color: colors.textMuted,
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
      borderBottomColor: colors.border,
    },
    timerText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      minWidth: 56,
    },
    timerTextUrgent: {
      color: colors.danger,
    },
    timerProgress: {
      flex: 1,
      height: 4,
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.08)"
        : "rgba(37, 99, 235, 0.08)",
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
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 40,
    },
    resultsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    doneBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    doneBtnText: {
      color: "#FFFFFF",
      fontSize: 12.5,
      fontWeight: "700",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 4,
      marginBottom: 12,
    },

    // Retry Button
    retryButton: {
      marginTop: 20,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
  });
