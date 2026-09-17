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
import { AudioNotePlayer } from "@/components/audio/AudioNotePlayer";
import { isAudioPath } from "@/functions/audioHelpers";
import { useTheme } from "@/context/ThemeContext";

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
  const { colors } = useTheme();
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
    ? colors.textMuted
    : result.isCorrect
      ? colors.success
      : result.isPartial
        ? colors.warning
        : colors.error;

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
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      {/* Collapsed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.indexBadge, { borderColor: statusColor, backgroundColor: colors.cardSecondary }]}>
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
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatTime(timeTaken)}</Text>
              <View style={[styles.typePill, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.typePillText, { color: colors.primary }]}>
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
          style={[styles.thumbnailWrapper, { backgroundColor: colors.cardSecondary }]}
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
              <Ionicons name="image-outline" size={18} color={colors.textMuted} />
            </View>
          )}
        </TouchableOpacity>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedBody}>
          {/* Answer comparison */}
          <View style={[styles.answerRow, { backgroundColor: colors.cardSecondary }]}>
            <View style={styles.answerBlock}>
              <Text style={[styles.answerLabel, { color: colors.textMuted }]}>Your Answer</Text>
              <Text
                style={[
                  styles.answerValue,
                  {
                    color: result.isCorrect
                      ? colors.success
                      : result.isUnanswered
                        ? colors.textMuted
                        : colors.error,
                  },
                ]}
              >
                {formatAnswer(result.userAnswer)}
              </Text>
            </View>
            <View style={[styles.answerDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.answerBlock}>
              <Text style={[styles.answerLabel, { color: colors.textMuted }]}>Correct Answer</Text>
              <Text style={[styles.answerValue, { color: colors.success }]}>
                {formatAnswer(result.correctAnswer)}
              </Text>
            </View>
          </View>

          {/* Question Images (if multi-page) */}
          {questionImages.length > 1 && (
            <View style={styles.solutionSection}>
              <View style={styles.solutionHeaderRow}>
                <Text style={[styles.solutionLabel, { color: colors.text }]}>
                  Question ({questionImages.length} pages)
                </Text>
                <View style={[styles.tapToZoomBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="scan-outline" size={12} color={colors.primary} />
                  <Text style={[styles.tapToZoomText, { color: colors.primary }]}>Tap to zoom</Text>
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
                    style={[
                      styles.stripCard,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
                    ]}
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
                <Text style={[styles.solutionLabel, { color: colors.text }]}>
                  Solution {solutionImages.length > 1 ? `(${solutionImages.length} pages)` : ""}
                </Text>
                <View style={[styles.tapToZoomBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="scan-outline" size={12} color={colors.primary} />
                  <Text style={[styles.tapToZoomText, { color: colors.primary }]}>Tap to zoom</Text>
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
                  style={[
                    styles.solutionImageWrapper,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
                  ]}
                >
                  <Image
                    source={{ uri: solutionImages[0] }}
                    style={styles.solutionImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.zoomIconOverlay}>
                    <Ionicons name="expand" size={12} color="#FFFFFF" />
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
                      style={[
                        styles.stripCard,
                        { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
                      ]}
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

          {/* Personal Notes / Voice Note */}
          {question.personalNote && question.personalNote.trim().length > 0 && (
            isAudioPath(question.personalNote) ? (
              <View style={{ marginTop: 8 }}>
                <AudioNotePlayer audioUri={question.personalNote} compact />
              </View>
            ) : (
              <View style={[styles.notesSection, { backgroundColor: colors.cardSecondary }]}>
                <View style={styles.notesHeader}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={[styles.notesLabel, { color: colors.primary }]}>Notes</Text>
                </View>
                <Text style={[styles.notesText, { color: colors.text }]}>{question.personalNote}</Text>
              </View>
            )
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
    marginBottom: 6,
  },

  // Header (collapsed view)
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 0,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  indexText: {
    fontSize: 12,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  pointsText: {
    color: "#6B7280",
    fontSize: 10.5,
    fontWeight: "500",
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: "#6B7280",
    fontSize: 10.5,
    fontWeight: "400",
  },
  typePill: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  typePillText: {
    color: "#3B82F6",
    fontSize: 9,
    fontWeight: "700",
  },

  // Thumbnail
  thumbnailWrapper: {
    width: 36,
    height: 36,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#1E2028",
    position: "relative",
  },
  thumbnail: {
    width: 36,
    height: 36,
  },
  thumbnailCountBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(11, 12, 16, 0.85)",
    borderRadius: 0,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  thumbnailCountText: {
    color: "#14B8A6",
    fontSize: 8,
    fontWeight: "700",
  },
  thumbnailPlaceholder: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  chevron: {
    marginLeft: 2,
  },

  // Multi-image strip in expanded view
  multiImageStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  stripCard: {
    width: 88,
    height: 88,
    borderRadius: 0,
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
    bottom: 3,
    left: 3,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  stripBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
  },

  // Expanded body
  expandedBody: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 0,
    gap: 8,
  },

  // Answer comparison
  answerRow: {
    flexDirection: "row",
    backgroundColor: "#1c1b1b",
    borderRadius: 0,
    overflow: "hidden",
  },
  answerBlock: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  answerDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  answerLabel: {
    color: "#6B7280",
    fontSize: 9.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  answerValue: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Solution section
  solutionSection: {
    gap: 4,
  },
  solutionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  solutionLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "600",
  },
  tapToZoomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 0,
  },
  tapToZoomText: {
    color: "#3B82F6",
    fontSize: 9.5,
    fontWeight: "600",
  },
  solutionImageWrapper: {
    backgroundColor: "#1E2028",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
    position: "relative",
  },
  solutionImage: {
    width: "100%",
    height: 150,
  },
  zoomIconOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(11, 12, 16, 0.75)",
    borderRadius: 0,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  // Notes section
  notesSection: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    borderRadius: 0,
    paddingVertical: 7,
    paddingHorizontal: 9,
    gap: 3,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  notesLabel: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  notesText: {
    color: "#D1D5DB",
    fontSize: 11.5,
    lineHeight: 16,
  },
});
