import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface OverallAccuracyBarProps {
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  totalTimeSeconds: number;
}

export function OverallAccuracyBar({
  score,
  maxScore,
  correctCount,
  incorrectCount,
  unansweredCount,
  totalQuestions,
  totalTimeSeconds,
}: OverallAccuracyBarProps) {
  const { colors, isDark } = useTheme();

  const total = Math.max(1, totalQuestions);
  const accuracyPct = Math.round((correctCount / total) * 100);

  const correctPct = (correctCount / total) * 100;
  const incorrectPct = (incorrectCount / total) * 100;
  const unansweredPct = Math.max(0, 100 - correctPct - incorrectPct);

  // Time formatting
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = totalTimeSeconds % 60;
  const timeFormatted = `${mins}m ${secs.toString().padStart(2, "0")}s`;
  const avgSecsPerQ = Math.round(totalTimeSeconds / total);

  // Performance status pill
  const getRating = () => {
    if (accuracyPct >= 75) {
      return {
        label: "Strong Recall",
        color: isDark ? "#34D399" : "#059669",
        bg: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.12)",
      };
    }
    if (accuracyPct >= 50) {
      return {
        label: "Moderate",
        color: isDark ? "#FBBF24" : "#D97706",
        bg: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.12)",
      };
    }
    return {
      label: "Needs Review",
      color: isDark ? "#F87171" : "#DC2626",
      bg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.12)",
    };
  };

  const rating = getRating();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* ── Top Header Row ── */}
      <View style={styles.headerRow}>
        <View style={styles.accuracyGroup}>
          <Text style={[styles.accuracyValue, { color: colors.text }]}>
            {accuracyPct}%
          </Text>
          <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>
            Accuracy
          </Text>
        </View>

        <View style={styles.badgeGroup}>
          <View style={[styles.ratingPill, { backgroundColor: rating.bg }]}>
            <Text style={[styles.ratingPillText, { color: rating.color }]}>
              {rating.label}
            </Text>
          </View>
          <View
            style={[
              styles.scorePill,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.scorePillText, { color: colors.textSecondary }]}>
              {correctCount} / {totalQuestions} Correct
            </Text>
          </View>
        </View>
      </View>

      {/* ── Multi-Segmented Accuracy Bar ── */}
      <View
        style={[
          styles.barTrack,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          },
        ]}
      >
        {correctPct > 0 && (
          <View
            style={[
              styles.barSegment,
              styles.barCorrect,
              {
                width: `${correctPct}%`,
                borderTopLeftRadius: 5,
                borderBottomLeftRadius: 5,
                borderTopRightRadius: incorrectPct === 0 && unansweredPct === 0 ? 5 : 0,
                borderBottomRightRadius: incorrectPct === 0 && unansweredPct === 0 ? 5 : 0,
              },
            ]}
          />
        )}
        {incorrectPct > 0 && (
          <View
            style={[
              styles.barSegment,
              styles.barIncorrect,
              {
                width: `${incorrectPct}%`,
                borderTopLeftRadius: correctPct === 0 ? 5 : 0,
                borderBottomLeftRadius: correctPct === 0 ? 5 : 0,
                borderTopRightRadius: unansweredPct === 0 ? 5 : 0,
                borderBottomRightRadius: unansweredPct === 0 ? 5 : 0,
              },
            ]}
          />
        )}
        {unansweredPct > 0 && (
          <View
            style={[
              styles.barSegment,
              styles.barUnanswered,
              {
                width: `${unansweredPct}%`,
                borderTopRightRadius: 5,
                borderBottomRightRadius: 5,
                borderTopLeftRadius: correctPct === 0 && incorrectPct === 0 ? 5 : 0,
                borderBottomLeftRadius: correctPct === 0 && incorrectPct === 0 ? 5 : 0,
              },
            ]}
          />
        )}
      </View>

      {/* ── Stat Chips Row ── */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statChip,
            {
              backgroundColor: isDark
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(16, 185, 129, 0.08)",
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={13} color="#10B981" />
          <Text style={[styles.statChipText, { color: isDark ? "#34D399" : "#059669" }]}>
            {correctCount} Correct
          </Text>
        </View>

        <View
          style={[
            styles.statChip,
            {
              backgroundColor: isDark
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(239, 68, 68, 0.08)",
            },
          ]}
        >
          <Ionicons name="close-circle" size={13} color="#EF4444" />
          <Text style={[styles.statChipText, { color: isDark ? "#F87171" : "#DC2626" }]}>
            {incorrectCount} Wrong
          </Text>
        </View>

        {unansweredCount > 0 && (
          <View
            style={[
              styles.statChip,
              {
                backgroundColor: isDark
                  ? "rgba(148, 163, 184, 0.1)"
                  : "rgba(148, 163, 184, 0.08)",
              },
            ]}
          >
            <Ionicons name="remove-circle" size={13} color="#94A3B8" />
            <Text style={[styles.statChipText, { color: colors.textMuted }]}>
              {unansweredCount} Skipped
            </Text>
          </View>
        )}

        <View
          style={[
            styles.statChip,
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(37, 99, 235, 0.08)",
              marginLeft: "auto",
            },
          ]}
        >
          <Ionicons name="time-outline" size={13} color={colors.primary} />
          <Text style={[styles.statChipText, { color: colors.primary }]}>
            {timeFormatted} (~{avgSecsPerQ}s/Q)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  accuracyGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  accuracyValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 12,
  },
  barSegment: {
    height: "100%",
  },
  barCorrect: {
    backgroundColor: "#10B981",
  },
  barIncorrect: {
    backgroundColor: "#EF4444",
  },
  barUnanswered: {
    backgroundColor: "#94A3B8",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
