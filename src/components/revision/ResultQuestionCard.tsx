import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import type { Question } from "@/database/schema";
import type { QuestionResult } from "@/functions/scoreCalculator";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultQuestionCardProps {
  question: Question;
  result: QuestionResult;
  timeTaken: number;
  index: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatAnswer(answer: string | string[] | null): string {
  if (answer === null || answer === undefined) return "—";
  if (Array.isArray(answer)) return answer.join(", ");
  return answer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultQuestionCard({
  question,
  result,
  timeTaken,
  index,
}: ResultQuestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const statusColor = result.isUnanswered
    ? "#4B5563"
    : result.isCorrect
      ? "#22C55E"
      : result.isPartial
        ? "#F59E0B"
        : "#EF4444";

  const statusText = result.isUnanswered
    ? "Skipped"
    : result.isCorrect
      ? "Correct"
      : result.isPartial
        ? "Partial"
        : "Incorrect";

  const statusIcon = result.isUnanswered
    ? "remove-circle"
    : result.isCorrect
      ? "checkmark-circle"
      : result.isPartial
        ? "alert-circle"
        : "close-circle";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggle}
      style={styles.card}
    >
      {/* Collapsed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.indexBadge, { borderColor: statusColor }]}>
            <Text style={[styles.indexText, { color: statusColor }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.statusRow}>
              <Ionicons
                name={statusIcon as any}
                size={16}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusText}
              </Text>
              <Text style={styles.pointsText}>
                {result.pointsAwarded > 0 ? "+" : ""}
                {result.pointsAwarded} pts
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{formatTime(timeTaken)}</Text>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>
                  {question.questionType}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {question.questionImageUri ? (
            <Image
              source={{ uri: question.questionImageUri }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={18} color="#4B5563" />
            </View>
          )}
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6B7280"
          style={styles.chevron}
        />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedBody}>
          {/* Answer comparison */}
          <View style={styles.answerRow}>
            <View style={styles.answerBlock}>
              <Text style={styles.answerLabel}>Your Answer</Text>
              <Text
                style={[
                  styles.answerValue,
                  {
                    color: result.isCorrect
                      ? "#22C55E"
                      : result.isUnanswered
                        ? "#6B7280"
                        : "#EF4444",
                  },
                ]}
              >
                {formatAnswer(result.userAnswer)}
              </Text>
            </View>
            <View style={styles.answerDivider} />
            <View style={styles.answerBlock}>
              <Text style={styles.answerLabel}>Correct Answer</Text>
              <Text style={[styles.answerValue, { color: "#22C55E" }]}>
                {formatAnswer(result.correctAnswer)}
              </Text>
            </View>
          </View>

          {/* Solution Image */}
          {question.solutionImageUri && (
            <View style={styles.solutionSection}>
              <Text style={styles.solutionLabel}>Solution</Text>
              <View style={styles.solutionImageWrapper}>
                <Image
                  source={{ uri: question.solutionImageUri }}
                  style={styles.solutionImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            </View>
          )}

          {/* Personal Notes */}
          {question.personalNote && question.personalNote.trim().length > 0 && (
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text-outline" size={14} color="#3B82F6" />
                <Text style={styles.notesLabel}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{question.personalNote}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
    marginBottom: 10,
  },

  // Header (collapsed view)
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  indexText: {
    fontSize: 14,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pointsText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400",
  },
  typePill: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  typePillText: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "700",
  },

  // Thumbnail
  thumbnailWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1E2028",
  },
  thumbnail: {
    width: 48,
    height: 48,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  chevron: {
    marginLeft: 4,
  },

  // Expanded body
  expandedBody: {
    padding: 14,
    paddingTop: 0,
    gap: 16,
  },

  // Answer comparison
  answerRow: {
    flexDirection: "row",
    backgroundColor: "#1c1b1b",
    borderRadius: 12,
    overflow: "hidden",
  },
  answerBlock: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  answerDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  answerLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerValue: {
    fontSize: 18,
    fontWeight: "800",
  },

  // Solution section
  solutionSection: {
    gap: 8,
  },
  solutionLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  solutionImageWrapper: {
    backgroundColor: "#1E2028",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
  },
  solutionImage: {
    width: "100%",
    height: 300,
  },

  // Notes section
  notesSection: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notesLabel: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "600",
  },
  notesText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 20,
  },
});
