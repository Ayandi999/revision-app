import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultsPieChartProps {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SIZE = 200;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ResultsPieChart({
  correct,
  incorrect,
  unanswered,
  total,
}: ResultsPieChartProps) {
  if (total === 0) return null;

  const correctPct = correct / total;
  const incorrectPct = incorrect / total;
  // unanswered fills the rest

  const correctLen = correctPct * CIRCUMFERENCE;
  const incorrectLen = incorrectPct * CIRCUMFERENCE;
  const unansweredLen = CIRCUMFERENCE - correctLen - incorrectLen;

  // Rotation offset: start from top (-90deg)
  const correctOffset = 0;
  const incorrectOffset = correctLen;
  const unansweredOffset = correctLen + incorrectLen;

  const percentage = Math.round((correct / total) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={SIZE} height={SIZE}>
          {/* Background track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Unanswered arc (grey) */}
          {unanswered > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#4B5563"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${unansweredLen} ${CIRCUMFERENCE - unansweredLen}`}
              strokeDashoffset={-unansweredOffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          )}

          {/* Incorrect arc (red) */}
          {incorrect > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#EF4444"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${incorrectLen} ${CIRCUMFERENCE - incorrectLen}`}
              strokeDashoffset={-incorrectOffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          )}

          {/* Correct arc (green) */}
          {correct > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#22C55E"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${correctLen} ${CIRCUMFERENCE - correctLen}`}
              strokeDashoffset={-correctOffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          )}
        </Svg>

        {/* Center text — empty donut center */}
        <View style={styles.centerLabel}>
          <Text style={styles.percentageText}>{percentage}%</Text>
          <Text style={styles.percentageSubtext}>Accuracy</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.legendText}>Correct ({correct})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Incorrect ({incorrect})</Text>
        </View>
        {unanswered > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4B5563" }]} />
            <Text style={styles.legendText}>Unanswered ({unanswered})</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 20,
  },
  chartWrapper: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  percentageSubtext: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  // Legend
  legend: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
});
