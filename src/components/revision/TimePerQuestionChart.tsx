import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

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
  const CHART_HEIGHT = 155;
  const PADDING_TOP = 26;
  const PADDING_BOTTOM = 28;
  const PADDING_LEFT = 36;
  const PADDING_RIGHT = 22;

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
    // Smooth bezier path
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
        <View style={styles.titleWrapper}>
          <Text style={[styles.title, { color: colors.text }]}>
            Time Per Question
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Speed & solve cadence breakdown
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statBadge,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
          >
            <Text style={[styles.statBadgeLabel, { color: colors.textMuted }]}>
              AVG
            </Text>
            <Text style={[styles.statBadgeValue, { color: colors.primary }]}>
              {avgSecs}s
            </Text>
          </View>
          <View
            style={[
              styles.statBadge,
              {
                backgroundColor: isDark
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(16, 185, 129, 0.08)",
                borderColor: "rgba(16, 185, 129, 0.25)",
              },
            ]}
          >
            <Text style={[styles.statBadgeLabel, { color: colors.success }]}>
              FAST
            </Text>
            <Text style={[styles.statBadgeValue, { color: colors.success }]}>
              {minVal}s
            </Text>
          </View>
          <View
            style={[
              styles.statBadge,
              {
                backgroundColor: isDark
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(245, 158, 11, 0.08)",
                borderColor: "rgba(245, 158, 11, 0.25)",
              },
            ]}
          >
            <Text style={[styles.statBadgeLabel, { color: colors.warning }]}>
              SLOW
            </Text>
            <Text style={[styles.statBadgeValue, { color: colors.warning }]}>
              {maxVal}s
            </Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable Chart Area ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Svg width={SVG_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="timeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={colors.primary}
                stopOpacity={isDark ? "0.3" : "0.18"}
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
                    isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
                  }
                  strokeWidth="1"
                />
                <SvgText
                  x={PADDING_LEFT - 10}
                  y={y + 3.5}
                  fontSize="9.5"
                  fontWeight="600"
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
            strokeWidth="2"
            fill="none"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* Points + Labels */}
          {points.map((pt, idx) => (
            <React.Fragment key={idx}>
              {/* Outer sharp box */}
              <Rect
                x={pt.x - 3.5}
                y={pt.y - 3.5}
                width="7"
                height="7"
                fill={colors.card}
                stroke={colors.primary}
                strokeWidth="1.5"
              />
              {/* Inner sharp dot */}
              <Rect
                x={pt.x - 1.5}
                y={pt.y - 1.5}
                width="3"
                height="3"
                fill={colors.primary}
              />

              {/* Data label above node */}
              <SvgText
                x={pt.x}
                y={pt.y - 8}
                fontSize="9"
                fontWeight="700"
                fill={colors.text}
                textAnchor="middle"
              >
                {pt.val}s
              </SvgText>

              {/* X-axis label (Q1, Q2, ...) */}
              <SvgText
                x={pt.x}
                y={bottomY + 15}
                fontSize="9"
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

      {/* ── Swipe hint ── */}
      {count > 5 && (
        <View style={styles.hintRow}>
          <Ionicons name="arrow-back" size={11} color={colors.textTertiary} />
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>
            Swipe horizontally to review all question times
          </Text>
          <Ionicons
            name="arrow-forward"
            size={11}
            color={colors.textTertiary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    rowGap: 8,
  },
  titleWrapper: {
    marginRight: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 0,
    borderWidth: 1,
  },
  statBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statBadgeValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  scrollContainer: {
    paddingRight: 14,
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
