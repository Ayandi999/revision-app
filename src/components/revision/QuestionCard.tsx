import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Question } from "@/database/schema";
import { getQuestionImages } from "@/functions/imageHelpers";
import { ImageZoomModal } from "./ImageZoomModal";
import { useTheme } from "@/context/ThemeContext";
import {
  hapticImpactLight,
  hapticImpactMedium,
  hapticSelection,
} from "@/functions/hapticFeedback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  /** Current answer state for this question. */
  answer: string | string[] | null;
  /** Called when user selects / types an answer. */
  onAnswerChange: (answer: string | string[] | null) => void;
  /** Called when user presses Next / Submit. */
  onNext: () => void;
  /** Whether this is the last question. */
  isLast: boolean;
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  answer,
  onAnswerChange,
  onNext,
  isLast,
}: QuestionCardProps) {
  const { colors } = useTheme();
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState("");

  const questionImages = getQuestionImages(question);

  // ── MCQ handler ─────────────────────────────────────────────────────────
  const handleMCQSelect = (option: string) => {
    hapticSelection();
    onAnswerChange(answer === option ? null : option);
  };

  // ── MSQ handler ─────────────────────────────────────────────────────────
  const handleMSQToggle = (option: string) => {
    hapticSelection();
    const current = Array.isArray(answer) ? answer : [];
    if (current.includes(option)) {
      const next = current.filter((o) => o !== option);
      onAnswerChange(next.length > 0 ? next : null);
    } else {
      onAnswerChange([...current, option]);
    }
  };

  // ── NAT handler ─────────────────────────────────────────────────────────
  const handleNATChange = (text: string) => {
    onAnswerChange(text.length > 0 ? text : null);
  };

  return (
    <View style={styles.container}>
      {/* Question counter */}
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, { color: colors.text }]}>
          Question {questionIndex + 1}{" "}
          <Text style={[styles.counterDim, { color: colors.textMuted }]}>/ {totalQuestions}</Text>
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}>
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{question.questionType}</Text>
        </View>
      </View>

      {/* Question Images rendered in sequence */}
      {questionImages.length === 0 ? (
        <View style={[styles.noImageBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.noImageText, { color: colors.textMuted }]}>No image available</Text>
        </View>
      ) : (
        <View style={styles.imageListContainer}>
          {questionImages.map((uri, idx) => (
            <TouchableOpacity
              key={`${uri}-${idx}`}
              activeOpacity={0.9}
              onPress={() => {
                setZoomImageUri(uri);
                setZoomTitle(
                  questionImages.length > 1
                    ? `Question ${questionIndex + 1} (${idx + 1}/${questionImages.length})`
                    : `Question ${questionIndex + 1}`
                );
              }}
              style={[styles.imageWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Image
                source={{ uri }}
                style={styles.questionImage}
                contentFit="contain"
                transition={200}
              />
              <View style={styles.zoomIconOverlay}>
                <Ionicons name="expand" size={14} color="#FFFFFF" />
              </View>
              {questionImages.length > 1 && (
                <View style={styles.imagePageBadge}>
                  <Ionicons
                    name="document-text-outline"
                    size={11}
                    color="#94A3B8"
                  />
                  <Text style={styles.imagePageBadgeText}>
                    {idx + 1} / {questionImages.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Answer area */}
      <View style={styles.answerSection}>
        {question.questionType === "MCQ" && (
          <View style={styles.optionsGrid}>
            {OPTION_LABELS.map((label) => {
              const isSelected = answer === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleMCQSelect(label)}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: colors.border },
                      isSelected && { borderColor: colors.primary },
                    ]}
                  >
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.textSecondary },
                      isSelected && [{ color: colors.text }, styles.optionLabelSelected],
                    ]}
                  >
                    Option {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.questionType === "MSQ" && (
          <View style={styles.optionsGrid}>
            {OPTION_LABELS.map((label) => {
              const isSelected =
                Array.isArray(answer) && answer.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleMSQToggle(label)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primary },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.textSecondary },
                      isSelected && [{ color: colors.text }, styles.optionLabelSelected],
                    ]}
                  >
                    Option {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.questionType === "NAT" && (
          <View style={styles.natContainer}>
            <Text style={[styles.natLabel, { color: colors.textMuted }]}>Enter your answer</Text>
            <TextInput
              style={[
                styles.natInput,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text },
              ]}
              value={typeof answer === "string" ? answer : ""}
              onChangeText={handleNATChange}
              placeholder="Type numeric answer..."
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        )}
      </View>

      {/* Next / Submit button */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => {
          if (isLast) {
            hapticImpactMedium();
          } else {
            hapticImpactLight();
          }
          onNext();
        }}
      >
        <Text style={styles.nextButtonText}>
          {isLast ? "Submit" : "Next"}
        </Text>
        <Ionicons
          name={isLast ? "checkmark-circle" : "arrow-forward"}
          size={20}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={!!zoomImageUri}
        imageUri={zoomImageUri}
        title={zoomTitle}
        onClose={() => setZoomImageUri(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Counter row
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  counterDim: {
    color: "#6B7280",
    fontWeight: "400",
  },
  typeBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  typeBadgeText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Question images
  imageListContainer: {
    marginBottom: 8,
  },
  imagePageBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(11, 12, 16, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  imagePageBadgeText: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "700",
  },
  imageWrapper: {
    backgroundColor: "#1E2028",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  zoomIconOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(11, 12, 16, 0.75)",
    borderRadius: 0,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  questionImage: {
    width: "100%",
    height: 260,
  },
  noImageBox: {
    height: 160,
    backgroundColor: "#1E2028",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  noImageText: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 6,
  },

  // Answer section
  answerSection: {
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2028",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 10,
  },
  optionSelected: {
    backgroundColor: "rgba(7, 57, 237, 0.1)",
    borderColor: "#3B82F6",
  },
  optionLabel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  optionLabelSelected: {
    color: "#FFFFFF",
  },

  // Radio
  radio: {
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#3B82F6",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: "#3B82F6",
  },

  // Checkbox
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#3B82F6",
  },

  // NAT
  natContainer: {
    gap: 6,
  },
  natLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  natInput: {
    backgroundColor: "#1E2028",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // Next button
  nextButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
