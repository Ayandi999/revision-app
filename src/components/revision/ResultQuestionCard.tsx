import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import type { Question } from "@/database/schema";
import { getQuestionImages, getSolutionImages } from "@/functions/imageHelpers";
import type { QuestionResult } from "@/functions/scoreCalculator";
import { ImageZoomModal } from "./ImageZoomModal";

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
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState("Solution");

  const questionImages = getQuestionImages(question);
  const solutionImages = getSolutionImages(question);
  const firstQuestionImage = questionImages[0] ?? null;

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
        <TouchableOpacity
          activeOpacity={firstQuestionImage ? 0.75 : 1}
          onPress={(e) => {
            if (firstQuestionImage) {
              e.stopPropagation();
              setZoomImageUri(firstQuestionImage);
              setZoomTitle(`Question ${index + 1}`);
            }
          }}
          style={styles.thumbnailWrapper}
        >
          {firstQuestionImage ? (
            <>
              <Image
                source={{ uri: firstQuestionImage }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={150}
              />
              {questionImages.length > 1 && (
                <View style={styles.thumbnailCountBadge}>
                  <Text style={styles.thumbnailCountText}>
                    {questionImages.length}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={18} color="#4B5563" />
            </View>
          )}
        </TouchableOpacity>

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

          {/* Question Images (if multi-page) */}
          {questionImages.length > 1 && (
            <View style={styles.solutionSection}>
              <View style={styles.solutionHeaderRow}>
                <Text style={styles.solutionLabel}>
                  Question ({questionImages.length} pages)
                </Text>
                <View style={styles.tapToZoomBadge}>
                  <Ionicons name="scan-outline" size={12} color="#3B82F6" />
                  <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.multiImageStrip}
              >
                {questionImages.map((uri, idx) => (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    activeOpacity={0.85}
                    style={styles.stripCard}
                    onPress={(e) => {
                      e.stopPropagation();
                      setZoomImageUri(uri);
                      setZoomTitle(`Question ${index + 1} — Page ${idx + 1}`);
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.stripThumb}
                      contentFit="cover"
                    />
                    <View style={styles.stripBadge}>
                      <Text style={styles.stripBadgeText}>#{idx + 1}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Solution Image(s) */}
          {solutionImages.length > 0 && (
            <View style={styles.solutionSection}>
              <View style={styles.solutionHeaderRow}>
                <Text style={styles.solutionLabel}>
                  Solution {solutionImages.length > 1 ? `(${solutionImages.length} pages)` : ""}
                </Text>
                <View style={styles.tapToZoomBadge}>
                  <Ionicons name="scan-outline" size={12} color="#3B82F6" />
                  <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                </View>
              </View>

              {solutionImages.length === 1 ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={(e) => {
                    e.stopPropagation();
                    setZoomImageUri(solutionImages[0]);
                    setZoomTitle(`Solution — Question ${index + 1}`);
                  }}
                  style={styles.solutionImageWrapper}
                >
                  <Image
                    source={{ uri: solutionImages[0] }}
                    style={styles.solutionImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.zoomIconOverlay}>
                    <Ionicons name="expand" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.multiImageStrip}
                >
                  {solutionImages.map((uri, idx) => (
                    <TouchableOpacity
                      key={`${uri}-${idx}`}
                      activeOpacity={0.85}
                      style={styles.stripCard}
                      onPress={(e) => {
                        e.stopPropagation();
                        setZoomImageUri(uri);
                        setZoomTitle(`Solution — Question ${index + 1} (Page ${idx + 1})`);
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.stripThumb}
                        contentFit="cover"
                      />
                      <View style={styles.stripBadge}>
                        <Text style={styles.stripBadgeText}>#{idx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
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

      {/* Zoomable Image Modal */}
      <ImageZoomModal
        visible={!!zoomImageUri}
        imageUri={zoomImageUri}
        title={zoomTitle}
        onClose={() => setZoomImageUri(null)}
      />
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
    position: "relative",
  },
  thumbnail: {
    width: 48,
    height: 48,
  },
  thumbnailCountBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(11, 12, 16, 0.85)",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  thumbnailCountText: {
    color: "#14B8A6",
    fontSize: 9,
    fontWeight: "700",
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

  // Multi-image strip in expanded view
  multiImageStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  stripCard: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    backgroundColor: "#16181D",
  },
  stripThumb: {
    width: "100%",
    height: "100%",
  },
  stripBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stripBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
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
  solutionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  solutionLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  tapToZoomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tapToZoomText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "600",
  },
  solutionImageWrapper: {
    backgroundColor: "#1E2028",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
    position: "relative",
  },
  solutionImage: {
    width: "100%",
    height: 300,
  },
  zoomIconOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(11, 12, 16, 0.75)",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
