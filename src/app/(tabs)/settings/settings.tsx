import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveExam } from "@/context/ExamContext";
import { EXAM_OPTIONS } from "@/config/exams";

const Settings = () => {
  const { examId, streamTitle, examTitle, shortBadge, syllabus, openExamSwitcher } =
    useActiveExam();

  const currentExamConfig = EXAM_OPTIONS.find((e) => e.id === examId);
  const examColor = currentExamConfig?.color || "#3B82F6";
  const subjectCount = Object.keys(syllabus?.subjects || {}).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Preferences & target configuration</Text>
      </View>

      <View style={styles.content}>
        {/* Active Exam Card */}
        <View style={[styles.card, { borderColor: "rgba(255, 255, 255, 0.08)" }]}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: `${examColor}20`, borderColor: examColor },
              ]}
            >
              <Ionicons
                name={(currentExamConfig?.icon as any) || "school-outline"}
                size={28}
                color={examColor}
              />
            </View>

            <View style={[styles.badge, { backgroundColor: `${examColor}18` }]}>
              <View style={[styles.badgeDot, { backgroundColor: examColor }]} />
              <Text style={[styles.badgeText, { color: examColor }]}>
                {shortBadge}
              </Text>
            </View>
          </View>

          <Text style={styles.labelTitle}>Target Examination</Text>
          <Text style={styles.examNameText}>{examTitle}</Text>
          <Text style={styles.streamNameText}>{streamTitle}</Text>

          {/* Syllabus Status Info */}
          <View style={styles.syllabusInfoRow}>
            <Ionicons name="book-outline" size={16} color="#94A3B8" />
            <Text style={styles.syllabusInfoText}>
              {subjectCount > 0
                ? `${subjectCount} subjects loaded in syllabus`
                : "Syllabus file empty (waiting for JSON)"}
            </Text>
          </View>

          {/* Switch Button */}
          <TouchableOpacity
            style={[styles.switchButton, { backgroundColor: examColor }]}
            onPress={openExamSwitcher}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
            <Text style={styles.switchButtonText}>Switch Exam or Stream</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#60A5FA" />
            <Text style={styles.infoCardTitle}>Custom Syllabus Files</Text>
          </View>
          <Text style={styles.infoCardDesc}>
            Drop your syllabus JSON into <Text style={styles.codeText}>assets/syllabus/</Text> using the corresponding stream filename (e.g. <Text style={styles.codeText}>gate_cs.json</Text>).
          </Text>
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="sparkles-outline" size={16} color="#64748B" />
          <Text style={styles.footerText}>RevLog • Multi-Exam Revision</Text>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 90, // Clearance for tab bar
  },
  card: {
    width: "100%",
    backgroundColor: "#1A1A22",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  labelTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  examNameText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  streamNameText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
    fontWeight: "500",
  },
  syllabusInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  syllabusInfoText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  switchButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: "rgba(96, 165, 250, 0.06)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.15)",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoCardTitle: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "700",
  },
  infoCardDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  codeText: {
    color: "#E2E8F0",
    fontFamily: "GeistMono_400Regular",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: "auto",
    paddingBottom: 10,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
});