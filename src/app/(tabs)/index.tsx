import {
  fetchDashboardStats,
  type DashboardStats,
} from "@/functions/dashboardStats";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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

const getSubjectMeta = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("physics")) {
    return { icon: "flash", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.15)" };
  }
  if (lower.includes("chem")) {
    return { icon: "flask", color: "#A855F7", bg: "rgba(168, 85, 247, 0.15)" };
  }
  if (lower.includes("bio")) {
    return { icon: "leaf", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
  }
  return { icon: "book", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
};

const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 75) {
    return { text: "#34D399", bg: "rgba(16, 185, 129, 0.15)", label: "Strong" };
  }
  if (accuracy >= 50) {
    return { text: "#FBBF24", bg: "rgba(245, 158, 11, 0.15)", label: "Moderate" };
  }
  return { text: "#F87171", bg: "rgba(239, 68, 68, 0.15)", label: "Needs Work" };
};

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {},
  );

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
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("[Dashboard] Error loading stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning 🌞";
    if (hour < 17) return "Good afternoon 🌅";
    return "Good evening 🌑";
  };

  const getFormattedDate = () => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date());
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
      >
        {/* ── Section 1: Header & Greeting ── */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greetingText}>{getGreeting()} !</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text style={styles.dateChipText}>{getFormattedDate()}</Text>
          </View>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
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
                    <Ionicons name="sparkles" size={14} color="#94A3B8" />
                    <Text style={[styles.statusBadgeText, styles.statusTextEmpty]}>
                      Bank Empty
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeDue]}>
                    <Ionicons name="flash" size={14} color="#3B82F6" />
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
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* ── Section: Syllabus Mastery (Subject -> Topic -> Subtopic Dropdowns) ── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Syllabus Mastery</Text>
              <Text style={styles.sectionSubtitle}>Weakest → Strongest</Text>
            </View>

            {!stats?.subjectStats || stats.subjectStats.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="folder-open-outline"
                  size={26}
                  color="#64748B"
                />
                <Text style={styles.emptyCardText}>
                  No questions logged yet. Add questions to track subject,
                  topic, and subtopic accuracy.
                </Text>
              </View>
            ) : (
              <View style={styles.subjectListContainer}>
                {stats.subjectStats.map((subj) => {
                  const isSubjOpen = !!expandedSubjects[subj.name];
                  const meta = getSubjectMeta(subj.name);
                  const acc = getAccuracyColor(subj.accuracy);
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
                              size={18}
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
                                : " • Not tested yet"}
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
                            size={18}
                            color="#94A3B8"
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
                            <Ionicons name="filter" size={12} color="#F59E0B" />
                            <Text style={styles.topicsHelperText}>
                              Topics sorted: weakest accuracy first for targeted review
                            </Text>
                          </View>

                          {subj.topics.length === 0 ? (
                            <Text style={styles.noSubtopicsText}>
                              No topics assigned under this subject.
                            </Text>
                          ) : (
                            subj.topics.map((topic) => {
                              const topicKey = `${subj.name}:${topic.name}`;
                              const isTopicOpen = !!expandedTopics[topicKey];
                              const topicAcc = getAccuracyColor(topic.accuracy);
                              const tAttempts =
                                topic.correct + topic.incorrect;
                              const hasSubtopics = topic.subtopics.length > 0;

                              return (
                                <View
                                  key={topic.name}
                                  style={styles.topicCard}
                                >
                                  {/* Topic Header Row (Clickable Dropdown if has subtopics) */}
                                  <TouchableOpacity
                                    style={styles.topicHeaderTouchable}
                                    activeOpacity={hasSubtopics ? 0.7 : 1}
                                    onPress={() =>
                                      hasSubtopics && toggleTopic(topicKey)
                                    }
                                  >
                                    <View style={styles.topicHeaderLeft}>
                                      <Text style={styles.topicNameText}>
                                        {topic.name}
                                      </Text>
                                      <Text style={styles.topicStatsSubtext}>
                                        {topic.questionCount}{" "}
                                        {topic.questionCount === 1 ? "Q" : "Qs"}
                                        {tAttempts > 0
                                          ? ` • ${topic.correct}/${tAttempts} correct`
                                          : " • Untested"}
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
                                      {hasSubtopics ? (
                                        <Ionicons
                                          name={
                                            isTopicOpen
                                              ? "chevron-up"
                                              : "chevron-down"
                                          }
                                          size={16}
                                          color="#94A3B8"
                                        />
                                      ) : null}
                                    </View>
                                  </TouchableOpacity>

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

                                  {/* Expanded Subtopics (Least to Most accurate) */}
                                  {isTopicOpen && hasSubtopics && (
                                    <View style={styles.subtopicsContainer}>
                                      <Text style={styles.subtopicsLabel}>
                                        SUBTOPICS (WEAKEST FIRST):
                                      </Text>
                                      {topic.subtopics.map((st) => {
                                        const stAcc = getAccuracyColor(
                                          st.accuracy,
                                        );
                                        const stAttempts =
                                          st.correct + st.incorrect;

                                        return (
                                          <View
                                            key={st.name}
                                            style={styles.subtopicRow}
                                          >
                                            <View style={styles.subtopicLeft}>
                                              <View
                                                style={styles.subtopicBullet}
                                              />
                                              <Text
                                                style={styles.subtopicNameText}
                                              >
                                                {st.name}
                                              </Text>
                                              <Text
                                                style={styles.subtopicStatsText}
                                              >
                                                {st.questionCount} Qs
                                                {stAttempts > 0
                                                  ? ` • ${st.correct}/${stAttempts}`
                                                  : ""}
                                              </Text>
                                            </View>

                                            <View
                                              style={[
                                                styles.subtopicAccPill,
                                                { backgroundColor: stAcc.bg },
                                              ]}
                                            >
                                              <Text
                                                style={[
                                                  styles.subtopicAccText,
                                                  { color: stAcc.text },
                                                ]}
                                              >
                                                {st.accuracy}%
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
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
                      { backgroundColor: "rgba(59, 130, 246, 0.15)" },
                    ]}
                  >
                    <Ionicons name="book" size={18} color="#60A5FA" />
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
                      { backgroundColor: "rgba(16, 185, 129, 0.15)" },
                    ]}
                  >
                    <Ionicons name="trending-up" size={18} color="#34D399" />
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
                      { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                    ]}
                  >
                    <Ionicons name="trophy" size={18} color="#FBBF24" />
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
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(168, 85, 247, 0.15)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="time"
                      size={18}
                      color={
                        (stats?.overdueCount ?? 0) > 0 ? "#F87171" : "#C084FC"
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121216",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110, // Avoid overlapping floating tab bar
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextGroup: {
    gap: 2,
  },
  greetingText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1E1E28",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  dateChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: "#191924",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.22)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeDue: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statusBadgeProgress: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusBadgeCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeEmpty: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextDue: {
    color: "#60A5FA",
  },
  statusTextProgress: {
    color: "#FBBF24",
  },
  statusTextCompleted: {
    color: "#34D399",
  },
  statusTextEmpty: {
    color: "#94A3B8",
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  overdueText: {
    color: "#F87171",
    fontSize: 11,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonSecondary: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    shadowOpacity: 0,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#191924",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 10,
  },
  metricLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  metricSubtext: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  metricSubtextAlert: {
    color: "#F87171",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#191924",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  emptyCardText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  subjectListContainer: {
    gap: 12,
  },
  subjectCard: {
    backgroundColor: "#191924",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  subjectHeaderTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  subjectIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectTitleBlock: {
    flex: 1,
  },
  subjectNameText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subjectMetaSubtext: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  subjectHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accuracyBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  subjectBarTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 12,
  },
  subjectBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  topicsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 10,
  },
  topicsHelperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  topicsHelperText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600",
  },
  noSubtopicsText: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  topicCard: {
    backgroundColor: "#13131c",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  topicHeaderTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  topicNameText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  topicStatsSubtext: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  topicHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicAccPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicAccText: {
    fontSize: 11,
    fontWeight: "800",
  },
  topicBarTrack: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  topicBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  subtopicsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    paddingLeft: 8,
    gap: 8,
  },
  subtopicsLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subtopicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtopicLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  subtopicBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#64748B",
  },
  subtopicNameText: {
    color: "#CBD5E1",
    fontSize: 12,
    flex: 1,
  },
  subtopicStatsText: {
    color: "#64748B",
    fontSize: 10,
    marginLeft: 4,
  },
  subtopicAccPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subtopicAccText: {
    fontSize: 10,
    fontWeight: "800",
  },
});
