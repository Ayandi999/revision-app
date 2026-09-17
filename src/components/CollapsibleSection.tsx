import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  /** Ionicons icon name */
  icon: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** Accent color for the section icon. Defaults to theme primary. */
  accentColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollapsibleSection({
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  accentColor,
}: CollapsibleSectionProps) {
  const { colors } = useTheme();
  const effectiveAccent = accentColor || colors.primary;

  return (
    <View
      style={[
        styles.collapsibleSection,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.sectionHeader}
        onPress={onToggle}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon as any} size={18} color={effectiveAccent} />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>
        <Ionicons
          name={isCollapsed ? "chevron-forward" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {!isCollapsed && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  collapsibleSection: {
    marginTop: 12,
    borderRadius: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
});
