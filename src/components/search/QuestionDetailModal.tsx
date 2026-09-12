import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import type { Question } from "@/database/schema";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Rect } from "react-native-svg";

interface QuestionDetailModalProps {
  visible: boolean;
  question: Question | null;
  onClose: () => void;
}

export function QuestionDetailModal({
  visible,
  question,
  onClose,
}: QuestionDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("Image");

  if (!question) return null;

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
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.subjectPill,
                  { backgroundColor: `${subjColor}20`, borderColor: `${subjColor}55` },
                ]}
              >
                <View style={[styles.subjectDot, { backgroundColor: subjColor }]} />
                <Text style={[styles.subjectText, { color: subjColor }]}>
                  {question.subject}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{question.questionType}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#CBD5E1" />
            </TouchableOpacity>
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
            <View style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <View style={styles.statsHeaderLeft}>
                  <Ionicons name="stats-chart" size={16} color="#3B82F6" />
                  <Text style={styles.statsTitle}>Revision Performance</Text>
                </View>
                <View style={styles.stagePill}>
                  <Text style={styles.stagePillText}>
                    Stage {question.nextRevision}
                  </Text>
                </View>
              </View>

              {/* Segmented Horizontal SVG Bar */}
              <View style={styles.barContainer}>
                <Svg width="100%" height={12} viewBox="0 0 100 12">
                  <Defs>
                    <ClipPath id="barClip">
                      <Rect x="0" y="0" width="100" height="12" rx="6" ry="6" />
                    </ClipPath>
                  </Defs>
                  <G clipPath="url(#barClip)">
                    {/* Base Background Track */}
                    <Rect x="0" y="0" width="100" height="12" fill="#334155" />
                    {totalAttempts > 0 && (
                      <>
                        <Rect
                          x="0"
                          y="0"
                          width={correctPercent}
                          height="12"
                          fill="#10B981"
                        />
                        <Rect
                          x={correctPercent}
                          y="0"
                          width={incorrectPercent}
                          height="12"
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
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.legendText}>
                      Correct:{" "}
                      <Text style={styles.boldWhite}>
                        {correct} ({correctPercent}%)
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.legendItem}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.legendText}>
                      Incorrect:{" "}
                      <Text style={styles.boldWhite}>
                        {incorrect} ({incorrectPercent}%)
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noAttemptsText}>
                  Not attempted yet in revision tests
                </Text>
              )}

              {/* Next Revision Date Footer */}
              <View style={styles.revisionDateRow}>
                <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                <Text style={styles.revisionDateText}>
                  Next Revision:{" "}
                  <Text style={styles.boldWhite}>
                    {formatRevisionDate(question.nextRevisionDate)}
                  </Text>
                </Text>
              </View>
            </View>

            {/* ── Section 2: Question Media & Taxonomy (Top) ──────────────── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="help-circle" size={18} color="#3B82F6" />
                <Text style={styles.sectionHeading}>Question</Text>
              </View>

              {/* Taxonomy Chips */}
              {((question.topics && question.topics.length > 0) ||
                (question.subtopics && question.subtopics.length > 0)) && (
                <View style={styles.taxonomyChipsContainer}>
                  {question.topics?.map((topic, idx) => (
                    <View key={`top-${idx}`} style={styles.topicChip}>
                      <Ionicons name="layers-outline" size={11} color="#38BDF8" />
                      <Text style={styles.topicChipText}>{topic}</Text>
                    </View>
                  ))}
                  {question.subtopics?.map((subtop, idx) => (
                    <View key={`sub-${idx}`} style={styles.subtopicChip}>
                      <Ionicons name="pricetag-outline" size={11} color="#14B8A6" />
                      <Text style={styles.subtopicChipText}>{subtop}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Question Image */}
              {question.questionImageUri ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.imageCardWrapper}
                  onPress={() => {
                    setZoomUri(question.questionImageUri);
                    setZoomTitle(`${question.subject} Question`);
                  }}
                >
                  <Image
                    source={{ uri: question.questionImageUri }}
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
                <View style={styles.noImageNotice}>
                  <Ionicons name="image-outline" size={20} color="#64748B" />
                  <Text style={styles.noImageText}>No question image provided</Text>
                </View>
              )}
            </View>

            {/* ── Section 3: Solution & Answer (Below Question) ───────────── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bulb" size={18} color="#10B981" />
                <Text style={styles.sectionHeading}>Solution & Answer</Text>
              </View>

              {/* Correct Answer Display */}
              <View style={styles.answerCard}>
                <Text style={styles.answerHeaderLabel}>Correct Answer</Text>
                {question.questionType === "MCQ" && (
                  <View style={styles.optionPill}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
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
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.optionPillText}>Option {opt}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.plainAnswerText}>—</Text>
                    )}
                  </View>
                )}

                {question.questionType === "NAT" && (
                  <View style={styles.natBox}>
                    <Text style={styles.natLabel}>Numerical Value:</Text>
                    <Text style={styles.natValueText}>
                      {question.natAnswer || "—"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Solution Image (if present) */}
              {question.solutionImageUri && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.imageCardWrapper}
                  onPress={() => {
                    setZoomUri(question.solutionImageUri);
                    setZoomTitle(`${question.subject} Solution`);
                  }}
                >
                  <Image
                    source={{ uri: question.solutionImageUri }}
                    style={styles.previewImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.tapToZoomBadge}>
                    <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Section 4: Personal Notes ───────────────────────────────── */}
            {question.personalNote ? (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="document-text" size={18} color="#F59E0B" />
                  <Text style={styles.sectionHeading}>Personal Notes</Text>
                </View>
                <View style={styles.noteCard}>
                  <Text style={styles.noteCardText}>{question.personalNote}</Text>
                </View>
              </View>
            ) : null}

            {/* ── Section 5: Extracted OCR Text (if present) ──────────────── */}
            {question.extractedText ? (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="text" size={18} color="#94A3B8" />
                  <Text style={styles.sectionHeading}>Extracted OCR Text</Text>
                </View>
                <View style={styles.ocrCard}>
                  <Text style={styles.ocrCardText}>{question.extractedText}</Text>
                </View>
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
    backgroundColor: "#1C1B1B",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "#27272A",
    borderWidth: 1,
    borderColor: "#3F3F46",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  statsCard: {
    backgroundColor: "#202024",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2E2E34",
    padding: 14,
    gap: 12,
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
    fontSize: 14,
    fontWeight: "600",
  },
  stagePill: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stagePillText: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "600",
  },
  barContainer: {
    width: "100%",
    height: 12,
    marginVertical: 2,
  },
  statsLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  boldWhite: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  noAttemptsText: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  revisionDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#2A2A30",
    paddingTop: 8,
  },
  revisionDateText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  sectionContainer: {
    backgroundColor: "#202024",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2E2E34",
    padding: 14,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeading: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  taxonomyChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  topicChipText: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "500",
  },
  subtopicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderColor: "rgba(20, 184, 166, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  subtopicChipText: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "500",
  },
  imageCardWrapper: {
    width: "100%",
    height: 220,
    backgroundColor: "#161618",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333338",
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  tapToZoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  tapToZoomText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },
  noImageNotice: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noImageText: {
    color: "#64748B",
    fontSize: 13,
  },
  answerCard: {
    backgroundColor: "#161618",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2E2E34",
    gap: 8,
  },
  answerHeaderLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: "flex-start",
  },
  optionPillText: {
    color: "#34D399",
    fontSize: 14,
    fontWeight: "700",
  },
  msqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  natBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202024",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  natLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },
  natValueText: {
    color: "#38BDF8",
    fontSize: 15,
    fontWeight: "700",
  },
  plainAnswerText: {
    color: "#64748B",
    fontSize: 14,
  },
  noteCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  noteCardText: {
    color: "#FEF3C7",
    fontSize: 13,
    lineHeight: 18,
  },
  ocrCard: {
    backgroundColor: "#161618",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2E2E34",
  },
  ocrCardText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
  },
});
