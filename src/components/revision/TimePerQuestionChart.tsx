import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

interface TimePerQuestionChartProps {
  timeTaken: number[];
}

export function TimePerQuestionChart({ timeTaken }: TimePerQuestionChartProps) {
  const { colors, isDark } = useTheme();

  if (!timeTaken || timeTaken.length === 0) return null;

  // Clean data: ensure at least 1s for visual plotting
  const data = timeTaken.map((t) => Math.max(1, t || 0));
  const count = data.length;

  const maxVal = Math.max(...data, 10);
  const minVal = Math.min(...data);
  const totalSecs = data.reduce((acc, curr) => acc + curr, 0);
  const avgSecs = Math.round(totalSecs / count);

  // Chart dimensions
  const CHART_HEIGHT = 160;
  const PADDING_TOP = 28;
  const PADDING_BOTTOM = 30;
  const PADDING_LEFT = 38;
  const PADDING_RIGHT = 24;

  const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Calculate dynamic width for horizontal scroll with closer points
  const STEP_WIDTH = Math.max(34, 220 / Math.max(1, count - 1 || 1));
  const PLOT_WIDTH = Math.max(1, (count - 1) * STEP_WIDTH);
  const SVG_WIDTH = Math.max(260, PLOT_WIDTH + PADDING_LEFT + PADDING_RIGHT);

  // Y-Scale ceiling with round interval (e.g. 30, 60, 90, 120)
  const yCeil = Math.max(30, Math.ceil(maxVal / 15) * 15);

  const getX = (index: number) => {
    if (count === 1) return PADDING_LEFT + 20;
    return PADDING_LEFT + index * STEP_WIDTH;
  };

  const getY = (val: number) => {
    const ratio = val / yCeil;
    return PADDING_TOP + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
  };

  // Build SVG Path points
  const points = data.map((val, idx) => ({
    x: getX(idx),
    y: getY(val),
    val,
  }));

  // Build curved or smooth line path
  let linePath = "";
  if (points.length === 1) {
    linePath = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
  } else {
    // Smooth bezier or clean polyline
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cX1 = prev.x + (curr.x - prev.x) / 2;
      const cY1 = prev.y;
      const cX2 = prev.x + (curr.x - prev.x) / 2;
      const cY2 = curr.y;
      linePath += ` C ${cX1} ${cY1}, ${cX2} ${cY2}, ${curr.x} ${curr.y}`;
    }
  }

  // Build closed area path for gradient fill
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const bottomY = PADDING_TOP + PLOT_HEIGHT;

  const areaPath = `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;

  // Y-axis grid marks
  const yMarks = [0, Math.round(yCeil / 2), yCeil];

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
      {/* ── Header Row ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Time Per Question
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Speed & solve cadence breakdown
          </Text>
        </View>

        <View style={styles.quickStatsRow}>
          <View style={styles.statMini}>
            <Text style={[styles.statMiniLabel, { color: colors.textTertiary }]}>
              Avg
            </Text>
            <Text style={[styles.statMiniVal, { color: colors.primary }]}>
              {avgSecs}s
            </Text>
          </View>
          <View style={styles.statMini}>
            <Text style={[styles.statMiniLabel, { color: colors.textTertiary }]}>
              Fast
            </Text>
            <Text style={[styles.statMiniVal, { color: "#10B981" }]}>
              {minVal}s
            </Text>
          </View>
          <View style={styles.statMini}>
            <Text style={[styles.statMiniLabel, { color: colors.textTertiary }]}>
              Slow
            </Text>
            <Text style={[styles.statMiniVal, { color: "#F59E0B" }]}>
              {maxVal}s
            </Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable Chart Area ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 10 }}
      >
        <Svg width={SVG_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="timeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={colors.primary}
                stopOpacity={isDark ? "0.35" : "0.22"}
              />
              <Stop
                offset="100%"
                stopColor={colors.primary}
                stopOpacity="0.0"
              />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {yMarks.map((mark, idx) => {
            const y = getY(mark);
            return (
              <React.Fragment key={idx}>
                <Line
                  x1={PADDING_LEFT - 6}
                  y1={y}
                  x2={SVG_WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke={
                    isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)"
                  }
                  strokeWidth="1"
                />
                <SvgText
                  x={PADDING_LEFT - 10}
                  y={y + 3.5}
                  fontSize="10"
                  fontWeight="500"
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {mark}s
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Gradient area fill */}
          <Path d={areaPath} fill="url(#timeAreaGrad)" />

          {/* Main line path */}
          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points + Labels */}
          {points.map((pt, idx) => (
            <React.Fragment key={idx}>
              {/* Outer halo */}
              <Circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={colors.bg}
                stroke={colors.primary}
                strokeWidth="1.8"
              />
              {/* Inner dot */}
              <Circle cx={pt.x} cy={pt.y} r="2" fill={colors.primary} />

              {/* Data label above dot */}
              <SvgText
                x={pt.x}
                y={pt.y - 8}
                fontSize="9.5"
                fontWeight="700"
                fill={colors.text}
                textAnchor="middle"
              >
                {pt.val}s
              </SvgText>

              {/* X-axis label (Q1, Q2, ...) */}
              <SvgText
                x={pt.x}
                y={bottomY + 16}
                fontSize="9.5"
                fontWeight="600"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                Q{idx + 1}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
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
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statMini: {
    alignItems: "center",
  },
  statMiniLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statMiniVal: {
    fontSize: 12,
    fontWeight: "700",
  },
});
