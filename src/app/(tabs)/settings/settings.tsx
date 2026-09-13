import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveExam } from "@/context/ExamContext";
import { EXAM_OPTIONS } from "@/config/exams";
import { GoogleDriveCard } from "@/components/settings/GoogleDriveCard";

const Settings = () => {
  const { examId, streamTitle, examTitle, shortBadge, openExamSwitcher } =
    useActiveExam();

  const currentExamConfig = EXAM_OPTIONS.find((e) => e.id === examId);
  const examColor = currentExamConfig?.color || "#3B82F6";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Preferences & target configuration</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Cloud Backup & Sync Section ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Cloud Backup</Text>
          <GoogleDriveCard />
        </View>

        {/* ─── Target Exam Section ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Target Exam</Text>
          <TouchableOpacity
            style={styles.examRow}
            onPress={openExamSwitcher}
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
                <Text style={styles.examTitle}>{examTitle}</Text>
                <View style={[styles.badge, { backgroundColor: `${examColor}18` }]}>
                  <Text style={[styles.badgeText, { color: examColor }]}>
                    {shortBadge}
                  </Text>
                </View>
              </View>
              <Text style={styles.streamSubtitle} numberOfLines={1}>
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
          <Ionicons name="sparkles-outline" size={16} color="#64748B" />
          <Text style={styles.footerText}>RevLog • Multi-Exam Revision</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121216",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80, // Clearance for tab bar
    gap: 14,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  examIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  streamSubtitle: {
    color: "#94A3B8",
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
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },
});