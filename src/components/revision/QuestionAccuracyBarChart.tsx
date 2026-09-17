import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, G, Line, Rect, Text as SvgText } from "react-native-svg";
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

  // Process data per question combining historical records + today's session
  const questionData = questions.map((q, idx) => {
    const res = questionResults[idx];
    const sessionCorrect = res?.isCorrect ?? false;
    const sessionUnanswered = res?.isUnanswered ?? false;

    // Historical attempts prior to today's session
    let correct = q.correct ?? 0;
    let incorrect = q.incorrect ?? 0;

    // Incorporate today's attempt into all-time cumulative counts
    if (sessionCorrect) {
      correct += 1;
    } else if (!sessionUnanswered) {
      // User answered and got it wrong
      incorrect += 1;
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
      sessionUnanswered,
    };
  });

  // Chart dimensions & layout
  const CHART_HEIGHT = 175;
  const BAR_WIDTH = 30;
  const BAR_GAP = 24;
  const PADDING_TOP = 28;
  const PADDING_BOTTOM = 44;
  const PADDING_LEFT = 20;

  const MAX_BAR_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

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
        <View style={styles.titleWrapper}>
          <Text style={[styles.title, { color: colors.text }]}>
            Question Accuracy
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Historical & today's recall count
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
              isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
            }
            strokeWidth="1"
          />

          {questionData.map((item, idx) => {
            const x = PADDING_LEFT + idx * (BAR_WIDTH + BAR_GAP);

            const hasCorrect = item.correct > 0;
            const hasIncorrect = item.incorrect > 0;
            const hasBoth = hasCorrect && hasIncorrect;

            // Minimum segment height so count number fits cleanly inside
            const MIN_SEGMENT = 18;

            // All bars have uniform total height
            const totalBarHeight = MAX_BAR_HEIGHT;
            const topY = baselineY - totalBarHeight;

            let correctHeight = 0;
            let incorrectHeight = 0;

            if (hasBoth) {
              const rawCorrectHeight = (item.correct / item.total) * MAX_BAR_HEIGHT;
              correctHeight = Math.round(rawCorrectHeight);
              // Ensure both segments have at least MIN_SEGMENT so text fits cleanly
              if (correctHeight < MIN_SEGMENT) {
                correctHeight = MIN_SEGMENT;
              } else if (MAX_BAR_HEIGHT - correctHeight < MIN_SEGMENT) {
                correctHeight = MAX_BAR_HEIGHT - MIN_SEGMENT;
              }
              incorrectHeight = MAX_BAR_HEIGHT - correctHeight;
            } else if (hasCorrect) {
              correctHeight = MAX_BAR_HEIGHT;
              incorrectHeight = 0;
            } else if (hasIncorrect) {
              correctHeight = 0;
              incorrectHeight = MAX_BAR_HEIGHT;
            }

            // Stacked bar coordinates: bottom is correct (green), top is incorrect (red)
            const correctY = baselineY - correctHeight;
            const incorrectY = baselineY - totalBarHeight;

            // Session outcome badge info below question label
            const outcomeText = item.sessionUnanswered
              ? "skip"
              : item.sessionCorrect
                ? "pass"
                : "fail";
            const outcomeColor = item.sessionUnanswered
              ? colors.textMuted
              : item.sessionCorrect
                ? "#10B981"
                : "#EF4444";

            return (
              <React.Fragment key={idx}>
                {/* Accuracy percentage above the bar */}
                {item.total > 0 && (
                  <SvgText
                    x={x + BAR_WIDTH / 2}
                    y={topY - 6}
                    fontSize="9.5"
                    fontWeight="700"
                    fill={
                      item.accuracy >= 70
                        ? "#10B981"
                        : item.accuracy >= 40
                          ? "#F59E0B"
                          : "#EF4444"
                    }
                    textAnchor="middle"
                  >
                    {item.accuracy}%
                  </SvgText>
                )}

                {/* Case 1: Both correct & incorrect attempts (Stacked Bar with ClipPath) */}
                {hasBoth && (
                  <>
                    <Defs>
                      <ClipPath id={`bar-clip-${idx}`}>
                        <Rect
                          x={x}
                          y={incorrectY}
                          width={BAR_WIDTH}
                          height={totalBarHeight}
                          rx={5}
                          ry={5}
                        />
                      </ClipPath>
                    </Defs>
                    <G clipPath={`url(#bar-clip-${idx})`}>
                      {/* Top segment: Wrong / Red */}
                      <Rect
                        x={x}
                        y={incorrectY}
                        width={BAR_WIDTH}
                        height={incorrectHeight}
                        fill="#EF4444"
                      />
                      {/* Bottom segment: Correct / Green */}
                      <Rect
                        x={x}
                        y={correctY}
                        width={BAR_WIDTH}
                        height={correctHeight}
                        fill="#10B981"
                      />
                    </G>

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

                {/* Case 2: Only correct attempts (All Green) */}
                {hasCorrect && !hasIncorrect && (
                  <>
                    <Rect
                      x={x}
                      y={correctY}
                      width={BAR_WIDTH}
                      height={correctHeight}
                      fill="#10B981"
                      rx={5}
                      ry={5}
                    />
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

                {/* Case 3: Only incorrect attempts (All Red) */}
                {hasIncorrect && !hasCorrect && (
                  <>
                    <Rect
                      x={x}
                      y={incorrectY}
                      width={BAR_WIDTH}
                      height={incorrectHeight}
                      fill="#EF4444"
                      rx={5}
                      ry={5}
                    />
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

                {/* Case 4: No attempts recorded (Placeholder ghost bar) */}
                {item.total === 0 && (
                  <>
                    <Rect
                      x={x}
                      y={baselineY - MAX_BAR_HEIGHT}
                      width={BAR_WIDTH}
                      height={MAX_BAR_HEIGHT}
                      rx={5}
                      ry={5}
                      fill={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}
                      stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
                      strokeDasharray="3, 2"
                    />
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={baselineY - MAX_BAR_HEIGHT / 2 + 4}
                      fontSize="10"
                      fontWeight="700"
                      fill={colors.textMuted}
                      textAnchor="middle"
                    >
                      —
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

                {/* Today's session outcome tag */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={baselineY + 29}
                  fontSize="9.5"
                  fontWeight="600"
                  fill={outcomeColor}
                  textAnchor="middle"
                >
                  {outcomeText}
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
    marginBottom: 14,
    flexWrap: "wrap",
    rowGap: 8,
  },
  titleWrapper: {
    marginRight: 8,
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
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
    marginTop: 8,
  },
  hintText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
});
