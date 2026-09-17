import { AudioNotePlayer } from "@/components/audio/AudioNotePlayer";
import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import { isAudioPath } from "@/functions/audioHelpers";
import { hapticSelection, hapticWarning } from "@/functions/hapticFeedback";
import { getQuestionImages, getSolutionImages } from "@/functions/imageHelpers";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Rect } from "react-native-svg";

interface QuestionDetailModalProps {
  visible: boolean;
  question: Question | null;
  onClose: () => void;
  onEdit?: (question: Question) => void;
  onDelete?: (question: Question) => void;
}

export function QuestionDetailModal({
  visible,
  question,
  onClose,
  onEdit,
  onDelete,
}: QuestionDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("Image");

  if (!question) return null;

  const questionImages = getQuestionImages(question);
  const solutionImages = getSolutionImages(question);

  // ─── Metrics & Calculation ────────────────────────────────────────────────
  const correct = question.correct ?? 0;
  const incorrect = question.incorrect ?? 0;
  const totalAttempts = correct + incorrect;
  const correctPercent =
    totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;
  const incorrectPercent = totalAttempts > 0 ? 100 - correctPercent : 0;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getSubjectColor = (subj: string) => {
    const s = subj.toLowerCase();
    if (s.includes("physic")) return "#3B82F6";
    if (s.includes("chem")) return "#10B981";
    if (s.includes("bio") || s.includes("botany") || s.includes("zoology"))
      return "#8B5CF6";
    return "#F59E0B";
  };

  const subjColor = getSubjectColor(question.subject);

  const formatRevisionDate = (dateVal: Date | number | null | undefined) => {
    if (!dateVal) return "Tomorrow";
    const d = new Date(dateVal);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.bg }]}>
        <SafeAreaView
          style={[styles.safeContainer, { backgroundColor: colors.bg }]}
          edges={["top", "bottom"]}
        >
          {/* Header Bar */}
          <View
            style={[
              styles.headerBar,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.subjectPill,
                  {
                    backgroundColor: `${subjColor}20`,
                    borderColor: `${subjColor}55`,
                  },
                ]}
              >
                <View
                  style={[styles.subjectDot, { backgroundColor: subjColor }]}
                />
                <Text style={[styles.subjectText, { color: subjColor }]}>
                  {question.subject}
                </Text>
              </View>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.cardSecondaryBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {question.questionType}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {onEdit && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticSelection();
                    onEdit(question);
                  }}
                  style={[
                    styles.headerActionBtn,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="pencil" size={15} color={colors.primary} />
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticWarning();
                    onDelete(question);
                  }}
                  style={[
                    styles.headerActionBtn,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  hapticSelection();
                  onClose();
                }}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.cardSecondaryBorder,
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Section 1: Attempt Stats & SVG Ratio Bar ────────────────── */}
            <View
              style={[
                styles.statsCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.statsCardHeader}>
                <View style={styles.statsHeaderLeft}>
                  <Ionicons
                    name="stats-chart"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.statsTitle, { color: colors.text }]}>
                    Revision Performance
                  </Text>
                </View>
                <View style={styles.stagePill}>
                  <Text style={styles.stagePillText}>
                    Stage {question.nextRevision}
                  </Text>
                </View>
              </View>

              {/* Segmented Horizontal SVG Bar */}
              <View style={styles.barContainer}>
                <Svg width="100%" height={8} viewBox="0 0 100 8">
                  <Defs>
                    <ClipPath id="barClip">
                      <Rect x="0" y="0" width="100" height="8" rx="4" ry="4" />
                    </ClipPath>
                  </Defs>
                  <G clipPath="url(#barClip)">
                    {/* Base Background Track */}
                    <Rect
                      x="0"
                      y="0"
                      width="100"
                      height="8"
                      fill={colors.border}
                    />
                    {totalAttempts > 0 && (
                      <>
                        <Rect
                          x="0"
                          y="0"
                          width={correctPercent}
                          height="8"
                          fill="#10B981"
                        />
                        <Rect
                          x={correctPercent}
                          y="0"
                          width={incorrectPercent}
                          height="8"
                          fill="#EF4444"
                        />
                      </>
                    )}
                  </G>
                </Svg>
              </View>

              {/* Stats Labels */}
              {totalAttempts > 0 ? (
                <View style={styles.statsLegendRow}>
                  <View style={styles.legendItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10B981"
                    />
                    <Text
                      style={[styles.legendText, { color: colors.textMuted }]}
                    >
                      Correct:{" "}
                      <Text style={[styles.boldWhite, { color: colors.text }]}>
                        {correct} ({correctPercent}%)
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.legendItem}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text
                      style={[styles.legendText, { color: colors.textMuted }]}
                    >
                      Incorrect:{" "}
                      <Text style={[styles.boldWhite, { color: colors.text }]}>
                        {incorrect} ({incorrectPercent}%)
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={[styles.noAttemptsText, { color: colors.textMuted }]}
                >
                  Not attempted yet in revision tests
                </Text>
              )}

              {/* Next Revision Date */}
              <View
                style={[
                  styles.revisionDateRow,
                  { borderTopColor: colors.borderSubtle },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.revisionDateText, { color: colors.textMuted }]}
                >
                  Next Revision:{" "}
                  <Text style={[styles.boldWhite, { color: colors.text }]}>
                    {formatRevisionDate(question.nextRevisionDate)}
                  </Text>
                </Text>
              </View>
            </View>

            {/* ── Section 2: Question Media & Taxonomy (Top) ──────────────── */}
            <View
              style={[
                styles.sectionContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="help-circle" size={16} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  Question{" "}
                  {questionImages.length > 1
                    ? `(${questionImages.length} pages)`
                    : ""}
                </Text>
              </View>

              {/* Taxonomy Chips */}
              {((question.topics && question.topics.length > 0) ||
                (question.subtopics && question.subtopics.length > 0)) && (
                <View style={styles.taxonomyChipsContainer}>
                  {question.topics?.map((topic, idx) => (
                    <View key={`top-${idx}`} style={styles.topicChip}>
                      <Ionicons
                        name="layers-outline"
                        size={11}
                        color="#38BDF8"
                      />
                      <Text style={styles.topicChipText}>{topic}</Text>
                    </View>
                  ))}
                  {question.subtopics?.map((subtop, idx) => (
                    <View key={`sub-${idx}`} style={styles.subtopicChip}>
                      <Ionicons
                        name="pricetag-outline"
                        size={11}
                        color="#14B8A6"
                      />
                      <Text style={styles.subtopicChipText}>{subtop}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Question Image(s) */}
              {questionImages.length === 0 ? (
                <View style={styles.noImageNotice}>
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.noImageText, { color: colors.textMuted }]}
                  >
                    No question image provided
                  </Text>
                </View>
              ) : questionImages.length === 1 ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.imageCardWrapper,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  onPress={() => {
                    setZoomUri(questionImages[0]);
                    setZoomTitle(`${question.subject} Question`);
                  }}
                >
                  <Image
                    source={{ uri: questionImages[0] }}
                    style={styles.previewImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.tapToZoomBadge}>
                    <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.multiImageStrip}
                >
                  {questionImages.map((uri, idx) => (
                    <TouchableOpacity
                      key={`${uri}-${idx}`}
                      activeOpacity={0.88}
                      style={[
                        styles.stripCard,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.cardSecondaryBorder,
                        },
                      ]}
                      onPress={() => {
                        setZoomUri(uri);
                        setZoomTitle(
                          `${question.subject} Question (Page ${idx + 1})`,
                        );
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.stripThumb}
                        contentFit="contain"
                      />
                      <View style={styles.stripBadge}>
                        <Text style={styles.stripBadgeText}>#{idx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Section 3: Solution & Answer (Below Question) ───────────── */}
            <View
              style={[
                styles.sectionContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bulb" size={16} color="#10B981" />
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  Solution & Answer{" "}
                  {solutionImages.length > 1
                    ? `(${solutionImages.length} pages)`
                    : ""}
                </Text>
              </View>

              {/* Correct Answer Display */}
              <View
                style={[
                  styles.answerCard,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.cardSecondaryBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.answerHeaderLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  Correct Answer
                </Text>
                {question.questionType === "MCQ" && (
                  <View style={styles.optionPill}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.optionPillText}>
                      Option {question.mcqAnswer ?? "—"}
                    </Text>
                  </View>
                )}

                {question.questionType === "MSQ" && (
                  <View style={styles.msqRow}>
                    {Array.isArray(question.msqAnswer) &&
                    question.msqAnswer.length > 0 ? (
                      question.msqAnswer.map((opt) => (
                        <View key={opt} style={styles.optionPill}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10B981"
                          />
                          <Text style={styles.optionPillText}>
                            Option {opt}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text
                        style={[
                          styles.plainAnswerText,
                          { color: colors.textMuted },
                        ]}
                      >
                        —
                      </Text>
                    )}
                  </View>
                )}

                {question.questionType === "NAT" && (
                  <View
                    style={[styles.natBox, { backgroundColor: colors.card }]}
                  >
                    <Text
                      style={[styles.natLabel, { color: colors.textMuted }]}
                    >
                      Numerical Value:
                    </Text>
                    <Text
                      style={[styles.natValueText, { color: colors.primary }]}
                    >
                      {question.natAnswer || "—"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Solution Image(s) */}
              {solutionImages.length === 1 ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.imageCardWrapper,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  onPress={() => {
                    setZoomUri(solutionImages[0]);
                    setZoomTitle(`${question.subject} Solution`);
                  }}
                >
                  <Image
                    source={{ uri: solutionImages[0] }}
                    style={styles.previewImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.tapToZoomBadge}>
                    <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                  </View>
                </TouchableOpacity>
              ) : solutionImages.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.multiImageStrip}
                >
                  {solutionImages.map((uri, idx) => (
                    <TouchableOpacity
                      key={`${uri}-${idx}`}
                      activeOpacity={0.88}
                      style={[
                        styles.stripCard,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.cardSecondaryBorder,
                        },
                      ]}
                      onPress={() => {
                        setZoomUri(uri);
                        setZoomTitle(
                          `${question.subject} Solution (Page ${idx + 1})`,
                        );
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.stripThumb}
                        contentFit="contain"
                      />
                      <View style={styles.stripBadge}>
                        <Text style={styles.stripBadgeText}>#{idx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            {/* ── Section 4: Personal Notes / Voice Note ─────────────────── */}
            {question.personalNote ? (
              <View
                style={[
                  styles.sectionContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name={
                      isAudioPath(question.personalNote)
                        ? "mic"
                        : "document-text"
                    }
                    size={16}
                    color={
                      isAudioPath(question.personalNote)
                        ? colors.primary
                        : colors.warning
                    }
                  />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {isAudioPath(question.personalNote)
                      ? "Voice Note"
                      : "Personal Notes"}
                  </Text>
                </View>
                {isAudioPath(question.personalNote) ? (
                  <AudioNotePlayer audioUri={question.personalNote} />
                ) : (
                  <View
                    style={[
                      styles.noteCard,
                      {
                        backgroundColor: colors.warningBg,
                        borderColor: colors.warning,
                        borderLeftColor: colors.warning,
                      },
                    ]}
                  >
                    <Text style={[styles.noteCardText, { color: colors.text }]}>
                      {question.personalNote}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Embedded Zoom Overlay (avoids Android nested Modal dialog bug) */}
      <ImageZoomModal
        visible={!!zoomUri}
        imageUri={zoomUri}
        title={zoomTitle}
        onClose={() => setZoomUri(null)}
        embedded
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "#161618",
  },
  safeContainer: {
    flex: 1,
    backgroundColor: "#161618",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
    backgroundColor: "#1C1B1B",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  subjectDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "#27272A",
    borderWidth: 1,
    borderColor: "#3F3F46",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  statsCard: {
    backgroundColor: "#202024",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#2E2E34",
    padding: 9,
    gap: 7,
  },
  statsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statsTitle: {
    color: "#F8FAFC",
    fontSize: 12.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stagePill: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 0,
  },
  stagePillText: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  barContainer: {
    width: "100%",
    height: 6,
    marginVertical: 1,
  },
  statsLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendText: {
    color: "#94A3B8",
    fontSize: 10.5,
  },
  boldWhite: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  noAttemptsText: {
    color: "#64748B",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
  revisionDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: "#2A2A30",
    paddingTop: 5,
  },
  revisionDateText: {
    color: "#94A3B8",
    fontSize: 10.5,
  },
  sectionContainer: {
    backgroundColor: "#202024",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#2E2E34",
    padding: 9,
    gap: 7,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeading: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  taxonomyChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    gap: 3,
  },
  topicChipText: {
    color: "#BAE6FD",
    fontSize: 10.5,
    fontWeight: "600",
  },
  subtopicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderColor: "rgba(20, 184, 166, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    gap: 3,
  },
  subtopicChipText: {
    color: "#99F6E4",
    fontSize: 10.5,
    fontWeight: "600",
  },
  imageCardWrapper: {
    width: "100%",
    height: 150,
    backgroundColor: "#161618",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#333338",
    overflow: "hidden",
    position: "relative",
  },
  multiImageStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  stripCard: {
    width: 100,
    height: 100,
    borderRadius: 0,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#333338",
    backgroundColor: "#161618",
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
  previewImage: {
    width: "100%",
    height: "100%",
  },
  tapToZoomBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 0,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    gap: 4,
  },
  tapToZoomText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "600",
  },
  noImageNotice: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  noImageText: {
    color: "#64748B",
    fontSize: 11.5,
  },
  answerCard: {
    backgroundColor: "#161618",
    borderRadius: 0,
    padding: 7,
    borderWidth: 1,
    borderColor: "#2E2E34",
    gap: 5,
  },
  answerHeaderLabel: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    gap: 5,
    alignSelf: "flex-start",
  },
  optionPillText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
  },
  msqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  natBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202024",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    gap: 5,
    borderWidth: 1,
    borderColor: "#2E2E34",
  },
  natLabel: {
    color: "#94A3B8",
    fontSize: 11,
  },
  natValueText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
  plainAnswerText: {
    color: "#64748B",
    fontSize: 12.5,
  },
  noteCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderRadius: 0,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  noteCardText: {
    color: "#FEF3C7",
    fontSize: 11.5,
    lineHeight: 15,
  },
});
