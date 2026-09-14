import {
  fetchDashboardStats,
  type DashboardStats,
} from "@/functions/dashboardStats";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { useCloudSync } from "@/hooks/useCloudSync";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getSubjectMeta = (name: string, isDark: boolean = true) => {
  const lower = name.toLowerCase();
  if (lower.includes("physics")) {
    return {
      icon: "flash" as const,
      color: isDark ? "#3B82F6" : "#2563EB",
      bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.12)",
    };
  }
  if (lower.includes("chem")) {
    return {
      icon: "flask" as const,
      color: isDark ? "#A855F7" : "#9333EA",
      bg: isDark ? "rgba(168, 85, 247, 0.15)" : "rgba(147, 51, 234, 0.12)",
    };
  }
  if (lower.includes("bio")) {
    return {
      icon: "leaf" as const,
      color: isDark ? "#10B981" : "#059669",
      bg: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.12)",
    };
  }
  return {
    icon: "book" as const,
    color: isDark ? "#F59E0B" : "#D97706",
    bg: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.12)",
  };
};

const getAccuracyColor = (accuracy: number, isDark: boolean = true) => {
  if (accuracy >= 75) {
    return {
      text: isDark ? "#34D399" : "#059669",
      bg: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.12)",
      label: "Strong",
    };
  }
  if (accuracy >= 50) {
    return {
      text: isDark ? "#FBBF24" : "#D97706",
      bg: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.12)",
      label: "Moderate",
    };
  }
  return {
    text: isDark ? "#F87171" : "#DC2626",
    bg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.12)",
    label: "Needs Work",
  };
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { syllabus } = useActiveExam();
  const { user, isAuthenticated, lastRestoredAt } = useCloudSync();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"weakest" | "strongest">("weakest");
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {},
  );

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "weakest" ? "strongest" : "weakest"));
  };

  const sortedSubjectStats = useMemo(() => {
    if (!stats?.subjectStats) return [];
    if (sortOrder === "weakest") return stats.subjectStats;

    return stats.subjectStats
      .slice()
      .reverse()
      .map((subj) => ({
        ...subj,
        topics: subj.topics
          .slice()
          .reverse()
          .map((topic) => ({
            ...topic,
            subtopics: topic.subtopics.slice().reverse(),
          })),
      }));
  }, [stats?.subjectStats, sortOrder]);

  const toggleSubject = (name: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleTopic = (key: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchDashboardStats(syllabus);
      setStats(data);
    } catch (err) {
      console.error("[Dashboard] Error loading stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syllabus]);

  useEffect(() => {
    loadStats();
  }, [loadStats, lastRestoredAt]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const getFormattedDate = () => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date());
  };

  const displayName = user?.name ? user.name.trim().split(" ")[0] : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Section 1: Header & Greeting ── */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {isAuthenticated && displayName ? "Welcome back," : "Welcome back"}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isAuthenticated && displayName ? displayName : "Ready to Revise!"}
            </Text>
          </View>

          <View style={styles.headerRightGroup}>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.dateChipText}>{getFormattedDate()}</Text>
            </View>

            {isAuthenticated && (
              user?.photo ? (
                <Image
                  source={{ uri: user.photo }}
                  style={styles.headerAvatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.headerAvatarFallback}>
                  <Text style={styles.headerAvatarFallbackText}>
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Syncing revision metrics...</Text>
          </View>
        ) : (
          <>
            {/* ── Section 1: Hero Action Card ── */}
            <View style={styles.heroCard}>
              {/* Status Header Pill */}
              <View style={styles.heroHeaderRow}>
                {stats?.sessionStatus === "completed" ? (
                  <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[styles.statusBadgeText, styles.statusTextCompleted]}>
                      Completed Today
                    </Text>
                  </View>
                ) : stats?.sessionStatus === "in-progress" ? (
                  <View style={[styles.statusBadge, styles.statusBadgeProgress]}>
                    <Ionicons name="play-circle" size={14} color="#F59E0B" />
                    <Text style={[styles.statusBadgeText, styles.statusTextProgress]}>
                      Session In Progress
                    </Text>
                  </View>
                ) : stats?.sessionStatus === "empty" ? (
                  <View style={[styles.statusBadge, styles.statusBadgeEmpty]}>
                    <Ionicons name="sparkles" size={14} color={colors.textTertiary} />
                    <Text style={[styles.statusBadgeText, styles.statusTextEmpty]}>
                      Bank Empty
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeDue]}>
                    <Ionicons name="flash" size={14} color={colors.primary} />
                    <Text style={[styles.statusBadgeText, styles.statusTextDue]}>
                      Due For Revision
                    </Text>
                  </View>
                )}

                {stats && stats.overdueCount > 0 && stats.sessionStatus !== "completed" ? (
                  <View style={styles.overdueBadge}>
                    <Ionicons name="alert-circle" size={12} color="#EF4444" />
                    <Text style={styles.overdueText}>
                      {stats.overdueCount} overdue
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Main Headline */}
              <Text style={styles.heroTitle}>
                {stats?.sessionStatus === "completed"
                  ? "Great job! All caught up 🎉"
                  : stats?.sessionStatus === "in-progress"
                    ? `${stats.sessionCompletedCount} of ${stats.sessionTotalCount} Questions Done`
                    : stats?.sessionStatus === "empty"
                      ? "Start building your question bank"
                      : `${stats?.dueTodayCount ?? 0} Questions Ready for Review`}
              </Text>

              <Text style={styles.heroSubtitle}>
                {stats?.sessionStatus === "completed"
                  ? "You completed today's spaced repetition session. New questions will unlock tomorrow."
                  : stats?.sessionStatus === "in-progress"
                    ? "Pick up right where you left off to preserve your retention schedule."
                    : stats?.sessionStatus === "empty"
                      ? "Snap or upload question clippings to begin your scientific revision cycles."
                      : `Estimated ~${Math.max(1, Math.round((stats?.dueTodayCount ?? 1) * 1.5))} mins based on your typical solve cadence.`}
              </Text>

              {/* Progress Bar (Visible during in-progress or completed) */}
              {stats && stats.sessionTotalCount > 0 && stats.sessionStatus !== "empty" ? (
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.round(
                            (stats.sessionCompletedCount /
                              Math.max(1, stats.sessionTotalCount)) *
                              100,
                          ),
                        )}%`,
                        backgroundColor:
                          stats.sessionStatus === "completed"
                            ? "#10B981"
                            : "#3B82F6",
                      },
                    ]}
                  />
                </View>
              ) : null}

              {/* Primary Call To Action */}
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  stats?.sessionStatus === "completed" && styles.ctaButtonSecondary,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (stats?.sessionStatus === "empty") {
                    router.push("/(tabs)/newQuestion/addQuestion" as any);
                  } else {
                    router.push("/(tabs)/revision/revision" as any);
                  }
                }}
              >
                <Text style={styles.ctaButtonText}>
                  {stats?.sessionStatus === "completed"
                    ? "View Revision Summary"
                    : stats?.sessionStatus === "in-progress"
                      ? "Resume Revision Test"
                      : stats?.sessionStatus === "empty"
                        ? "Add First Question"
                        : "Start Today's Revision"}
                </Text>
                <Ionicons
                  name={
                    stats?.sessionStatus === "completed"
                      ? "stats-chart"
                      : "arrow-forward"
                  }
                  size={15}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* ── Section: Syllabus Mastery (Subject -> Topic -> Subtopic Dropdowns) ── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Syllabus Mastery</Text>
              <TouchableOpacity
                style={styles.sortTogglePill}
                activeOpacity={0.7}
                onPress={toggleSortOrder}
              >
                <Ionicons name="swap-vertical" size={13} color={colors.primary} />
                <Text style={styles.sortToggleText}>
                  {sortOrder === "weakest"
                    ? "Weakest → Strongest"
                    : "Strongest → Weakest"}
                </Text>
              </TouchableOpacity>
            </View>

            {!sortedSubjectStats || sortedSubjectStats.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="analytics-outline"
                  size={26}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyCardText}>
                  No attempted questions yet. Complete your revision sessions to
                  track subject, topic, and subtopic accuracy.
                </Text>
              </View>
            ) : (
              <View style={styles.subjectListContainer}>
                {sortedSubjectStats.map((subj) => {
                  const isSubjOpen = !!expandedSubjects[subj.name];
                  const meta = getSubjectMeta(subj.name, isDark);
                  const acc = getAccuracyColor(subj.accuracy, isDark);
                  const totalAttempts = subj.correct + subj.incorrect;

                  return (
                    <View key={subj.name} style={styles.subjectCard}>
                      {/* Subject Main Header (Clickable Dropdown) */}
                      <TouchableOpacity
                        style={styles.subjectHeaderTouchable}
                        activeOpacity={0.7}
                        onPress={() => toggleSubject(subj.name)}
                      >
                        <View style={styles.subjectHeaderLeft}>
                          <View
                            style={[
                              styles.subjectIconWrap,
                              { backgroundColor: meta.bg },
                            ]}
                          >
                            <Ionicons
                              name={meta.icon as any}
                              size={15}
                              color={meta.color}
                            />
                          </View>
                          <View style={styles.subjectTitleBlock}>
                            <Text style={styles.subjectNameText}>
                              {subj.name}
                            </Text>
                            <Text style={styles.subjectMetaSubtext}>
                              {subj.questionCount}{" "}
                              {subj.questionCount === 1 ? "question" : "questions"}
                              {totalAttempts > 0
                                ? ` • ${subj.correct}/${totalAttempts} correct`
                                : ""}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.subjectHeaderRight}>
                          <View
                            style={[
                              styles.accuracyBadge,
                              { backgroundColor: acc.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.accuracyBadgeText,
                                { color: acc.text },
                              ]}
                            >
                              {subj.accuracy}%
                            </Text>
                          </View>
                          <Ionicons
                            name={isSubjOpen ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.textTertiary}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Subject Accuracy Progress Bar */}
                      <View style={styles.subjectBarTrack}>
                        <View
                          style={[
                            styles.subjectBarFill,
                            {
                              width: `${Math.max(
                                subj.accuracy > 0 ? 5 : 0,
                                subj.accuracy,
                              )}%`,
                              backgroundColor: meta.color,
                            },
                          ]}
                        />
                      </View>

                      {/* Expanded Topics List */}
                      {isSubjOpen && (
                        <View style={styles.topicsContainer}>
                          <View style={styles.topicsHelperRow}>
                            <Ionicons name="filter" size={12} color={colors.warning} />
                            <Text style={styles.topicsHelperText}>
                              {sortOrder === "weakest"
                                ? "Topics sorted: weakest accuracy first for targeted review"
                                : "Topics sorted: highest accuracy first (your strengths)"}
                            </Text>
                          </View>

                          {subj.topics.length === 0 ? (
                            <Text style={styles.noSubtopicsText}>
                              No topics assigned under this subject.
                            </Text>
                          ) : (
                            subj.topics.map((topic) => {
                              const topicAcc = getAccuracyColor(topic.accuracy, isDark);
                              const tAttempts =
                                topic.correct + topic.incorrect;

                              return (
                                <View
                                  key={topic.name}
                                  style={styles.topicCard}
                                >
                                  {/* Topic Header Row */}
                                  <View style={styles.topicHeaderTouchable}>
                                    <View style={styles.topicHeaderLeft}>
                                      <Text style={styles.topicNameText}>
                                        {topic.name}
                                      </Text>
                                      <Text style={styles.topicStatsSubtext}>
                                        {topic.questionCount}{" "}
                                        {topic.questionCount === 1 ? "Q" : "Qs"}
                                        {tAttempts > 0
                                          ? ` • ${topic.correct}/${tAttempts} correct`
                                          : ""}
                                      </Text>
                                    </View>

                                    <View style={styles.topicHeaderRight}>
                                      <View
                                        style={[
                                          styles.topicAccPill,
                                          { backgroundColor: topicAcc.bg },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.topicAccText,
                                            { color: topicAcc.text },
                                          ]}
                                        >
                                          {topic.accuracy}%
                                        </Text>
                                      </View>
                                    </View>
                                  </View>

                                  {/* Topic Mini Accuracy Bar */}
                                  <View style={styles.topicBarTrack}>
                                    <View
                                      style={[
                                        styles.topicBarFill,
                                        {
                                          width: `${Math.max(
                                            topic.accuracy > 0 ? 5 : 0,
                                            topic.accuracy,
                                          )}%`,
                                          backgroundColor: topicAcc.text,
                                        },
                                      ]}
                                    />
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Section: Key Metric KPI Cards ── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Performance Overview</Text>
            </View>

            <View style={styles.metricsGrid}>
              {/* Metric 1: Total Bank */}
              <View style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View
                    style={[
                      styles.metricIconWrap,
                      { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.12)" },
                    ]}
                  >
                    <Ionicons name="book" size={15} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  {stats?.totalQuestions ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Total Bank</Text>
                <Text style={styles.metricSubtext}>Questions logged</Text>
              </View>

              {/* Metric 2: Accuracy */}
              <View style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View
                    style={[
                      styles.metricIconWrap,
                      { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.12)" },
                    ]}
                  >
                    <Ionicons name="trending-up" size={15} color={colors.success} />
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  {stats?.accuracyRate ?? 0}%
                </Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
                <Text style={styles.metricSubtext}>All-time success</Text>
              </View>

              {/* Metric 3: Mastered */}
              <View style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View
                    style={[
                      styles.metricIconWrap,
                      { backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.12)" },
                    ]}
                  >
                    <Ionicons name="trophy" size={15} color={colors.warning} />
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  {stats?.masteredCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Mastered</Text>
                <Text style={styles.metricSubtext}>Stage 5 (30-day)</Text>
              </View>

              {/* Metric 4: Due & Overdue */}
              <View style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View
                    style={[
                      styles.metricIconWrap,
                      {
                        backgroundColor:
                          (stats?.overdueCount ?? 0) > 0
                            ? (isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.12)")
                            : (isDark ? "rgba(168, 85, 247, 0.15)" : "rgba(147, 51, 234, 0.12)"),
                      },
                    ]}
                  >
                    <Ionicons
                      name="time"
                      size={15}
                      color={
                        (stats?.overdueCount ?? 0) > 0 ? colors.danger : (isDark ? "#C084FC" : "#9333EA")
                      }
                    />
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  {stats?.dueTodayCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text
                  style={[
                    styles.metricSubtext,
                    (stats?.overdueCount ?? 0) > 0 && styles.metricSubtextAlert,
                  ]}
                >
                  {(stats?.overdueCount ?? 0) > 0
                    ? `${stats?.overdueCount} overdue`
                    : "Scheduled today"}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 90, // Avoid overlapping floating tab bar
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    headerTextGroup: {
      flex: 1,
      gap: 1,
      marginRight: 8,
    },
    headerRightGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: "rgba(59, 130, 246, 0.4)",
    },
    headerAvatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.12)",
      borderWidth: 1.5,
      borderColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerAvatarFallbackText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    greetingText: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "500",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    dateChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.cardSecondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateChipText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },
    loadingContainer: {
      paddingVertical: 36,
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      color: colors.textTertiary,
      fontSize: 12,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 13,
      borderWidth: 1,
      borderColor: isDark ? "rgba(59, 130, 246, 0.22)" : "rgba(37, 99, 235, 0.18)",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    heroHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: 16,
    },
    statusBadgeDue: {
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.12)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(37, 99, 235, 0.25)",
    },
    statusBadgeProgress: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.12)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.25)",
    },
    statusBadgeCompleted: {
      backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.12)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(5, 150, 105, 0.25)",
    },
    statusBadgeEmpty: {
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    statusTextDue: {
      color: colors.primary,
    },
    statusTextProgress: {
      color: colors.warning,
    },
    statusTextCompleted: {
      color: colors.success,
    },
    statusTextEmpty: {
      color: colors.textTertiary,
    },
    overdueBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.12)",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.2)",
    },
    overdueText: {
      color: colors.danger,
      fontSize: 10.5,
      fontWeight: "600",
    },
    heroTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 10,
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "#2563EB",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    ctaButtonSecondary: {
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      shadowOpacity: 0,
    },
    ctaButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    sectionHeaderRow: {
      marginTop: 16,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    sortTogglePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(37, 99, 235, 0.08)",
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.2)",
    },
    sortToggleText: {
      color: colors.primary,
      fontSize: 10.5,
      fontWeight: "700",
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metricCard: {
      flex: 1,
      minWidth: "46%",
      backgroundColor: colors.card,
      borderRadius: 13,
      padding: 11,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.12 : 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    metricTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    metricIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    metricValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.4,
      marginTop: 6,
    },
    metricLabel: {
      color: colors.textSecondary,
      fontSize: 11.5,
      fontWeight: "600",
      marginTop: 1,
    },
    metricSubtext: {
      color: colors.textTertiary,
      fontSize: 10,
      marginTop: 1,
    },
    metricSubtextAlert: {
      color: colors.danger,
      fontWeight: "600",
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyCardText: {
      color: colors.textTertiary,
      fontSize: 11.5,
      textAlign: "center",
      lineHeight: 16,
    },
    subjectListContainer: {
      gap: 8,
    },
    subjectCard: {
      backgroundColor: colors.card,
      borderRadius: 13,
      padding: 11,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.15 : 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    subjectHeaderTouchable: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subjectHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    subjectIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    subjectTitleBlock: {
      flex: 1,
    },
    subjectNameText: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    subjectMetaSubtext: {
      color: colors.textTertiary,
      fontSize: 10.5,
      marginTop: 1,
    },
    subjectHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    accuracyBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    accuracyBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    subjectBarTrack: {
      height: 3,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 8,
    },
    subjectBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    topicsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    topicsHelperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 1,
    },
    topicsHelperText: {
      color: colors.warning,
      fontSize: 10,
      fontWeight: "600",
    },
    noSubtopicsText: {
      color: colors.textTertiary,
      fontSize: 11,
      fontStyle: "italic",
      paddingVertical: 3,
    },
    topicCard: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 9,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topicHeaderTouchable: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topicHeaderLeft: {
      flex: 1,
      marginRight: 8,
    },
    topicNameText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    topicStatsSubtext: {
      color: colors.textTertiary,
      fontSize: 10,
      marginTop: 1,
    },
    topicHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    topicAccPill: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 5,
    },
    topicAccText: {
      fontSize: 10,
      fontWeight: "800",
    },
    topicBarTrack: {
      height: 2.5,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 5,
    },
    topicBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    subtopicsContainer: {
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingLeft: 6,
      gap: 5,
    },
    subtopicsLabel: {
      color: colors.textTertiary,
      fontSize: 9.5,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: 1,
    },
    subtopicRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subtopicLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flex: 1,
      marginRight: 8,
    },
    subtopicBullet: {
      width: 3.5,
      height: 3.5,
      borderRadius: 2,
      backgroundColor: colors.textTertiary,
    },
    subtopicNameText: {
      color: colors.textSecondary,
      fontSize: 11,
      flex: 1,
    },
    subtopicStatsText: {
      color: colors.textTertiary,
      fontSize: 9.5,
      marginLeft: 3,
    },
    subtopicAccPill: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    subtopicAccText: {
      fontSize: 9.5,
      fontWeight: "800",
    },
  });

