import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import type { QuestionResult } from "@/functions/scoreCalculator";

interface QuestionAccuracyBarChartProps {
  questions: Question[];
  questionResults: QuestionResult[];
}

export function QuestionAccuracyBarChart({
  questions,
  questionResults,
}: QuestionAccuracyBarChartProps) {
  const { colors, isDark } = useTheme();

  if (!questions || questions.length === 0) return null;

  // Process data per question
  const questionData = questions.map((q, idx) => {
    const res = questionResults[idx];
    const sessionCorrect = res?.isCorrect ?? false;

    // Cumulative historical attempts
    let correct = q.correct || 0;
    let incorrect = q.incorrect || 0;

    // If both are 0 (e.g. first attempt before sync), count current session
    if (correct === 0 && incorrect === 0) {
      if (sessionCorrect) correct = 1;
      else incorrect = 1;
    }

    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      index: idx + 1,
      correct,
      incorrect,
      total,
      accuracy,
      sessionCorrect,
    };
  });

  // Chart dimensions
  const CHART_HEIGHT = 165;
  const BAR_WIDTH = 28;
  const BAR_GAP = 24;
  const PADDING_TOP = 26;
  const PADDING_BOTTOM = 38;
  const PADDING_LEFT = 20;

  const MAX_BAR_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Find max attempts to scale bar heights dynamically (with a min height for visual balance)
  const maxAttempts = Math.max(...questionData.map((d) => d.total), 1);

  const SVG_WIDTH =
    PADDING_LEFT * 2 + questionData.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

  const baselineY = PADDING_TOP + MAX_BAR_HEIGHT;

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
      {/* ── Header with Title & Legend ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Question Accuracy
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Historical correct vs wrong recall count
          </Text>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#10B981" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Correct
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Wrong
            </Text>
          </View>
        </View>
      </View>

      {/* ── Horizontal Scrollable Bar Chart ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Svg width={Math.max(300, SVG_WIDTH)} height={CHART_HEIGHT}>
          {/* Baseline horizontal line */}
          <Line
            x1={0}
            y1={baselineY}
            x2={Math.max(300, SVG_WIDTH)}
            y2={baselineY}
            stroke={
              isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
            }
            strokeWidth="1"
          />

          {questionData.map((item, idx) => {
            const x = PADDING_LEFT + idx * (BAR_WIDTH + BAR_GAP);

            const hasCorrect = item.correct > 0;
            const hasIncorrect = item.incorrect > 0;
            const hasBoth = hasCorrect && hasIncorrect;

            // Minimum height so the number fits cleanly inside
            const MIN_SEGMENT = 18;

            const heightFactor = Math.max(0.4, item.total / maxAttempts);
            const baseTotalHeight = MAX_BAR_HEIGHT * heightFactor;

            let correctHeight = 0;
            let incorrectHeight = 0;

            if (hasBoth) {
              const cRatio = item.correct / item.total;
              const iRatio = item.incorrect / item.total;
              correctHeight = Math.max(MIN_SEGMENT, baseTotalHeight * cRatio);
              incorrectHeight = Math.max(MIN_SEGMENT, baseTotalHeight * iRatio);
            } else if (hasCorrect) {
              correctHeight = Math.max(MIN_SEGMENT * 1.4, baseTotalHeight);
            } else if (hasIncorrect) {
              incorrectHeight = Math.max(MIN_SEGMENT * 1.4, baseTotalHeight);
            }

            // Stacked bar: bottom is correct (green), top is incorrect (red)
            const correctY = baselineY - correctHeight;
            const incorrectY = correctY - incorrectHeight;

            return (
              <React.Fragment key={idx}>
                {/* 1. Top Bar Segment (Wrong / Red) */}
                {hasIncorrect && (
                  <>
                    <Rect
                      x={x}
                      y={incorrectY}
                      width={BAR_WIDTH}
                      height={incorrectHeight}
                      fill="#EF4444"
                      rx={hasBoth ? 4 : 5}
                      ry={hasBoth ? 4 : 5}
                    />
                    {/* Number inside red segment */}
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={incorrectY + incorrectHeight / 2 + 4}
                      fontSize="10.5"
                      fontWeight="800"
                      fill="#FFFFFF"
                      textAnchor="middle"
                    >
                      {item.incorrect}
                    </SvgText>
                  </>
                )}

                {/* 2. Bottom Bar Segment (Correct / Green) */}
                {hasCorrect && (
                  <>
                    <Rect
                      x={x}
                      y={correctY}
                      width={BAR_WIDTH}
                      height={correctHeight}
                      fill="#10B981"
                      rx={hasBoth ? 0 : 5}
                      ry={hasBoth ? 0 : 5}
                    />
                    {/* Number inside green segment */}
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={correctY + correctHeight / 2 + 4}
                      fontSize="10.5"
                      fontWeight="800"
                      fill="#FFFFFF"
                      textAnchor="middle"
                    >
                      {item.correct}
                    </SvgText>
                  </>
                )}

                {/* Question label below baseline (Q1, Q2, ...) */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={baselineY + 16}
                  fontSize="11"
                  fontWeight="700"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  Q{item.index}
                </SvgText>

                {/* Session outcome marker under label */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={baselineY + 28}
                  fontSize="9.5"
                  fontWeight="600"
                  fill={item.sessionCorrect ? "#10B981" : "#EF4444"}
                  textAnchor="middle"
                >
                  {item.sessionCorrect ? "pass" : "fail"}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>

      {/* ── Tip / Swipe hint ── */}
      {questionData.length > 5 && (
        <View style={styles.hintRow}>
          <Ionicons name="arrow-back" size={11} color={colors.textTertiary} />
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>
            Swipe horizontally to review all question bars
          </Text>
          <Ionicons name="arrow-forward" size={11} color={colors.textTertiary} />
        </View>
      )}
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scrollContainer: {
    paddingRight: 16,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
  },
  hintText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
});
