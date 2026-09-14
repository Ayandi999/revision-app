import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EXAM_OPTIONS, ExamOption, StreamOption } from "@/config/exams";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";

export function OnboardingModal() {
  const {
    examId: currentExamId,
    streamId: currentStreamId,
    isOnboardingCompleted,
    isModalOpen,
    closeExamSwitcher,
    setExamAndStream,
  } = useActiveExam();

  const { colors, isDark } = useTheme();

  const [selectedExamId, setSelectedExamId] = useState<string>(currentExamId);
  const [selectedStreamId, setSelectedStreamId] = useState<string>(currentStreamId);

  // Picker modal sheet states
  const [isExamPickerOpen, setIsExamPickerOpen] = useState<boolean>(false);
  const [isStreamPickerOpen, setIsStreamPickerOpen] = useState<boolean>(false);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSelectedExamId(currentExamId || EXAM_OPTIONS[0].id);
      setSelectedStreamId(currentStreamId || EXAM_OPTIONS[0].streams[0].id);
      setIsExamPickerOpen(false);
      setIsStreamPickerOpen(false);
    }
  }, [isModalOpen, currentExamId, currentStreamId]);

  const selectedExam: ExamOption = useMemo(
    () => EXAM_OPTIONS.find((e) => e.id === selectedExamId) || EXAM_OPTIONS[0],
    [selectedExamId],
  );

  const selectedStream: StreamOption = useMemo(
    () =>
      selectedExam.streams.find((s) => s.id === selectedStreamId) ||
      selectedExam.streams[0],
    [selectedExam, selectedStreamId],
  );

  const handleSelectExam = (exam: ExamOption) => {
    setSelectedExamId(exam.id);
    if (exam.streams.length > 0) {
      setSelectedStreamId(exam.streams[0].id);
    }
    setIsExamPickerOpen(false);
  };

  const handleSelectStream = (stream: StreamOption) => {
    setSelectedStreamId(stream.id);
    setIsStreamPickerOpen(false);
  };

  const handleContinue = async () => {
    if (!selectedExamId || !selectedStreamId) return;
    await setExamAndStream(selectedExamId, selectedStreamId);
  };

  if (!isModalOpen) return null;

  return (
    <Modal
      visible={isModalOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeExamSwitcher}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg }]}
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleTextCol}>
            <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
              {isOnboardingCompleted ? "PREFERENCES" : "WELCOME TO REVLOG"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isOnboardingCompleted ? "Change Target Exam" : "Choose Your Study Stream"}
            </Text>
          </View>

          {isOnboardingCompleted && (
            <TouchableOpacity
              onPress={closeExamSwitcher}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content Body */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Select your target exam and specific stream so we can tailor your syllabus, question bank, and spaced repetition schedules.
          </Text>

          {/* ─── DROPDOWN 1: Target Exam ─── */}
          <View style={styles.dropdownSection}>
            <Text style={[styles.dropdownLabel, { color: colors.text }]}>
              1. Target Exam or Goal
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isExamPickerOpen ? colors.primary : colors.cardBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setIsExamPickerOpen(true)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${selectedExam.color}15` },
                ]}
              >
                <Ionicons
                  name={(selectedExam.icon as any) || "school-outline"}
                  size={20}
                  color={selectedExam.color}
                />
              </View>

              <View style={styles.dropdownTextGroup}>
                <View style={styles.dropdownTitleRow}>
                  <Text style={[styles.dropdownTitle, { color: colors.text }]}>
                    {selectedExam.name}
                  </Text>
                  <View
                    style={[
                      styles.shortBadge,
                      { backgroundColor: `${selectedExam.color}20` },
                    ]}
                  >
                    <Text
                      style={[styles.shortBadgeText, { color: selectedExam.color }]}
                    >
                      {selectedExam.shortName}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.dropdownSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedExam.description}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textMuted}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>

          {/* ─── DROPDOWN 2: Stream / Subject Group ─── */}
          <View style={styles.dropdownSection}>
            <Text style={[styles.dropdownLabel, { color: colors.text }]}>
              2. Specific Stream or Subjects
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isStreamPickerOpen ? colors.primary : colors.cardBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setIsStreamPickerOpen(true)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${selectedExam.color}15` },
                ]}
              >
                <Ionicons
                  name="book-outline"
                  size={19}
                  color={selectedExam.color}
                />
              </View>

              <View style={styles.dropdownTextGroup}>
                <View style={styles.dropdownTitleRow}>
                  <Text style={[styles.dropdownTitle, { color: colors.text }]}>
                    {selectedStream.name}
                  </Text>
                  {selectedStream.code && (
                    <View
                      style={[
                        styles.shortBadge,
                        { backgroundColor: `${selectedExam.color}15` },
                      ]}
                    >
                      <Text
                        style={[styles.shortBadgeText, { color: selectedExam.color }]}
                      >
                        {selectedStream.code}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.dropdownSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedStream.description}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textMuted}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>

          {/* Stream summary info pill */}
          <View
            style={[
              styles.infoPill,
              {
                backgroundColor: isDark ? "#161820" : "#F1F5F9",
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={selectedExam.color} />
            <Text style={[styles.infoPillText, { color: colors.textMuted }]}>
              Syllabus topics will automatically calibrate for{" "}
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {selectedExam.shortName} • {selectedStream.name}
              </Text>
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {isOnboardingCompleted ? "Save Preferences" : "Get Started"}
            </Text>
            <Ionicons
              name={isOnboardingCompleted ? "checkmark" : "arrow-forward"}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* ─── MODAL PICKER: Exam Selection ─── */}
        <Modal
          visible={isExamPickerOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsExamPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsExamPickerOpen(false)}
          >
            <View
              style={[
                styles.sheetContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  Select Target Exam
                </Text>
                <TouchableOpacity
                  onPress={() => setIsExamPickerOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {EXAM_OPTIONS.map((exam) => {
                  const isSelected = exam.id === selectedExamId;
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      style={[
                        styles.pickerItem,
                        {
                          borderColor: isSelected ? exam.color : colors.borderSubtle,
                          backgroundColor: isSelected ? `${exam.color}15` : "transparent",
                        },
                      ]}
                      onPress={() => handleSelectExam(exam)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.iconWrapSmall,
                          { backgroundColor: `${exam.color}20` },
                        ]}
                      >
                        <Ionicons
                          name={(exam.icon as any) || "school-outline"}
                          size={16}
                          color={exam.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemTitle, { color: colors.text }]}>
                          {exam.name}
                        </Text>
                        <Text
                          style={[styles.pickerItemSubtitle, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {exam.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={exam.color}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ─── MODAL PICKER: Stream Selection ─── */}
        <Modal
          visible={isStreamPickerOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsStreamPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsStreamPickerOpen(false)}
          >
            <View
              style={[
                styles.sheetContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  Select Stream for {selectedExam.shortName}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsStreamPickerOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {selectedExam.streams.map((stream) => {
                  const isSelected = stream.id === selectedStreamId;
                  return (
                    <TouchableOpacity
                      key={stream.id}
                      style={[
                        styles.pickerItem,
                        {
                          borderColor: isSelected ? selectedExam.color : colors.borderSubtle,
                          backgroundColor: isSelected ? `${selectedExam.color}15` : "transparent",
                        },
                      ]}
                      onPress={() => handleSelectStream(stream)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.pickerItemTitle, { color: colors.text }]}>
                            {stream.name}
                          </Text>
                          {stream.code && (
                            <View
                              style={[
                                styles.shortBadge,
                                { backgroundColor: `${selectedExam.color}15` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.shortBadgeText,
                                  { color: selectedExam.color },
                                ]}
                              >
                                {stream.code}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.pickerItemSubtitle, { color: colors.textMuted }]}
                        >
                          {stream.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={selectedExam.color}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  titleTextCol: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  closeButton: {
    padding: 6,
    marginLeft: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 18,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  dropdownSection: {
    gap: 7,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
  },
  dropdownCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.2,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dropdownTextGroup: {
    flex: 1,
  },
  dropdownTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dropdownTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  dropdownSubtitle: {
    fontSize: 11.5,
    marginTop: 1.5,
  },
  shortBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  infoPillText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheetContent: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerItemTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  pickerItemSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
