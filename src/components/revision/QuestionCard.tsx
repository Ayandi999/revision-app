import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Question } from "@/database/schema";

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
  // ── MCQ handler ─────────────────────────────────────────────────────────
  const handleMCQSelect = (option: string) => {
    onAnswerChange(answer === option ? null : option);
  };

  // ── MSQ handler ─────────────────────────────────────────────────────────
  const handleMSQToggle = (option: string) => {
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
        <Text style={styles.counterText}>
          Question {questionIndex + 1}{" "}
          <Text style={styles.counterDim}>/ {totalQuestions}</Text>
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{question.questionType}</Text>
        </View>
      </View>

      {/* Question Image */}
      {question.questionImageUri ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: question.questionImageUri }}
            style={styles.questionImage}
            contentFit="contain"
            transition={200}
          />
        </View>
      ) : (
        <View style={styles.noImageBox}>
          <Ionicons name="image-outline" size={40} color="#4B5563" />
          <Text style={styles.noImageText}>No image available</Text>
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
                    isSelected && styles.optionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleMCQSelect(label)}
                >
                  <View
                    style={[
                      styles.radio,
                      isSelected && styles.radioSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
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
                    isSelected && styles.optionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleMSQToggle(label)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
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
            <Text style={styles.natLabel}>Enter your answer</Text>
            <TextInput
              style={styles.natInput}
              value={typeof answer === "string" ? answer : ""}
              onChangeText={handleNATChange}
              placeholder="Type numeric answer..."
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        )}
      </View>

      {/* Next / Submit button */}
      <TouchableOpacity
        style={styles.nextButton}
        activeOpacity={0.8}
        onPress={onNext}
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

  // Question image
  imageWrapper: {
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
    marginBottom: 20,
  },
  questionImage: {
    width: "100%",
    height: 280,
  },
  noImageBox: {
    height: 200,
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noImageText: {
    color: "#4B5563",
    fontSize: 13,
    marginTop: 8,
  },

  // Answer section
  answerSection: {
    marginBottom: 20,
  },
  optionsGrid: {
    gap: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2028",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.1)",
    gap: 12,
  },
  optionSelected: {
    backgroundColor: "rgba(7, 57, 237, 0.1)",
    borderColor: "#3B82F6",
  },
  optionLabel: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: "#FFFFFF",
  },

  // Radio
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#3B82F6",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
    gap: 8,
  },
  natLabel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
  },
  natInput: {
    backgroundColor: "#1E2028",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.1)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },

  // Next button
  nextButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
