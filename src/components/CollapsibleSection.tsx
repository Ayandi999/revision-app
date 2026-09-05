import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  /** Ionicons icon name */
  icon: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** Accent color for the section icon. Defaults to #3B82F6. */
  accentColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollapsibleSection({
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  accentColor = "#3B82F6",
}: CollapsibleSectionProps) {
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.sectionHeader}
        onPress={onToggle}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon as any} size={18} color={accentColor} />
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
        <Ionicons
          name={isCollapsed ? "chevron-forward" : "chevron-down"}
          size={18}
          color="#94A3B8"
        />
      </TouchableOpacity>

      {!isCollapsed && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  collapsibleSection: {
    marginTop: 20,
    backgroundColor: "#1E2028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
