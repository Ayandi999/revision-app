import { GoogleDriveCard } from "@/components/settings/GoogleDriveCard";
import { NotificationCard } from "@/components/settings/NotificationCard";
import { EXAM_OPTIONS } from "@/config/exams";
import type { ThemeMode } from "@/constants/theme";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";
import { hapticSelection } from "@/functions/hapticFeedback";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Settings = () => {
  const { examId, streamTitle, examTitle, shortBadge, openExamSwitcher } =
    useActiveExam();
  const { themeMode, resolvedTheme, colors, setThemeMode } = useTheme();

  const currentExamConfig = EXAM_OPTIONS.find((e) => e.id === examId);
  const examColor = currentExamConfig?.color || colors.primary;

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { mode: "system", label: "System", icon: "phone-portrait-outline" },
    { mode: "light", label: "Light", icon: "sunny-outline" },
    { mode: "dark", label: "Dark", icon: "moon-outline" },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Preferences & target configuration
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Appearance Section ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            Appearance
          </Text>
          <View
            style={[
              styles.appearanceCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.appearanceHeader}>
              <View
                style={[
                  styles.appearanceIconWrap,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.appearanceTitleGroup}>
                <Text style={[styles.appearanceTitle, { color: colors.text }]}>
                  Theme
                </Text>
                <Text
                  style={[
                    styles.appearanceSubtitle,
                    { color: colors.textMuted },
                  ]}
                >
                  {themeMode === "system"
                    ? `System default (${resolvedTheme === "dark" ? "Dark" : "Light"})`
                    : `${themeMode === "dark" ? "Dark" : "Light"} mode active`}
                </Text>
              </View>
            </View>

            {/* Segmented Control */}
            <View
              style={[
                styles.segmentedRow,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
            >
              {themeOptions.map((opt) => {
                const isActive = themeMode === opt.mode;
                return (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[
                      styles.segmentButton,
                      isActive && [
                        styles.segmentButtonActive,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                          shadowColor: colors.shadow,
                        },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticSelection();
                      setThemeMode(opt.mode);
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.segmentButtonText,
                        { color: isActive ? colors.primary : colors.textMuted },
                        isActive && styles.segmentButtonTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Cloud Backup & Sync Section ─────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            Cloud Backup
          </Text>
          <GoogleDriveCard />
        </View>

        {/* ─── Notifications Section ───────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            Notifications
          </Text>
          <NotificationCard />
        </View>

        {/* ─── Target Exam Section ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            Target Exam
          </Text>
          <TouchableOpacity
            style={[
              styles.examRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => {
              hapticSelection();
              openExamSwitcher();
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.examIconWrap,
                { backgroundColor: `${examColor}18` },
              ]}
            >
              <Ionicons
                name={(currentExamConfig?.icon as any) || "school-outline"}
                size={20}
                color={examColor}
              />
            </View>

            <View style={styles.examTextGroup}>
              <View style={styles.examTitleRow}>
                <Text style={[styles.examTitle, { color: colors.text }]}>
                  {examTitle}
                </Text>
                <View
                  style={[styles.badge, { backgroundColor: `${examColor}18` }]}
                >
                  <Text style={[styles.badgeText, { color: examColor }]}>
                    {shortBadge}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.streamSubtitle, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {streamTitle}
              </Text>
            </View>

            <View style={styles.changeAction}>
              <Text style={[styles.changeActionText, { color: examColor }]}>
                Change
              </Text>
              <Ionicons name="chevron-forward" size={14} color={examColor} />
            </View>
          </TouchableOpacity>
        </View>


        {/* ─── Footer ─────────────────────────────────────────── */}
        <View style={styles.footerInfo}>
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            RevLog • Multi-Exam Revision
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 72, // Clearance for docked tab bar
    gap: 12,
  },
  section: {
    gap: 5,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 1,
  },
  appearanceCard: {
    borderRadius: 0,
    padding: 11,
    borderWidth: 1,
    gap: 10,
  },
  appearanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appearanceIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  appearanceTitleGroup: {
    flex: 1,
  },
  appearanceTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  appearanceSubtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: "500",
  },
  segmentedRow: {
    flexDirection: "row",
    borderRadius: 0,
    padding: 2,
    borderWidth: 1,
    gap: 2,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentButtonActive: {
    borderWidth: 1,
    elevation: 0,
  },
  segmentButtonText: {
    fontSize: 11.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  segmentButtonTextActive: {
    fontWeight: "800",
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 0,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
  },
  examIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  examTextGroup: {
    flex: 1,
    justifyContent: "center",
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  examTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  streamSubtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: "500",
  },
  changeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 6,
  },
  changeActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
