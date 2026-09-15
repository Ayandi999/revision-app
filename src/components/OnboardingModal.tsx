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
import { EXAM_OPTIONS, EXAM_CATEGORIES, ExamOption, StreamOption } from "@/config/exams";
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
                  styles.shortBadgeLeft,
                  {
                    backgroundColor: `${selectedExam.color}18`,
                    borderColor: `${selectedExam.color}40`,
                  },
                ]}
              >
                <Text
                  style={[styles.shortBadgeLeftText, { color: selectedExam.color }]}
                  numberOfLines={1}
                >
                  {selectedExam.shortName}
                </Text>
              </View>

              <View style={styles.dropdownTextGroup}>
                <View style={styles.categoryPillRow}>
                  <Text style={[styles.categoryTag, { color: selectedExam.color }]}>
                    {selectedExam.category}
                  </Text>
                </View>
                <Text style={[styles.dropdownTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedExam.name}
                </Text>
                <Text
                  style={[styles.dropdownSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedExam.description}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.textMuted}
                style={{ marginLeft: 6 }}
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
                  styles.shortBadgeLeft,
                  {
                    backgroundColor: `${selectedExam.color}18`,
                    borderColor: `${selectedExam.color}40`,
                  },
                ]}
              >
                <Text
                  style={[styles.shortBadgeLeftText, { color: selectedExam.color }]}
                  numberOfLines={1}
                >
                  {selectedStream.code || "ALL"}
                </Text>
              </View>

              <View style={styles.dropdownTextGroup}>
                <Text style={[styles.dropdownTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedStream.name}
                </Text>
                <Text
                  style={[styles.dropdownSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedStream.description || selectedStream.name}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.textMuted}
                style={{ marginLeft: 6 }}
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
            <Ionicons name="sparkles" size={13} color={selectedExam.color} />
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
              size={15}
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

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {EXAM_CATEGORIES.map((category) => {
                  const categoryExams = EXAM_OPTIONS.filter((e) => e.category === category.id);
                  if (categoryExams.length === 0) return null;

                  return (
                    <View key={category.id} style={styles.pickerSection}>
                      <View style={styles.pickerSectionHeader}>
                        <View style={styles.pickerSectionTitleRow}>
                          <Ionicons
                            name={category.icon as any}
                            size={12}
                            color={colors.textMuted}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={[styles.pickerSectionTitle, { color: colors.textMuted }]}>
                            {category.label}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.sectionCountBadge,
                            { backgroundColor: colors.borderSubtle },
                          ]}
                        >
                          <Text style={[styles.sectionCountText, { color: colors.textMuted }]}>
                            {categoryExams.length} {categoryExams.length === 1 ? "EXAM" : "EXAMS"}
                          </Text>
                        </View>
                      </View>

                      {categoryExams.map((exam) => {
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
                                styles.pickerBadgeLeft,
                                {
                                  backgroundColor: `${exam.color}18`,
                                  borderColor: isSelected ? exam.color : `${exam.color}35`,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.pickerBadgeLeftText, { color: exam.color }]}
                                numberOfLines={1}
                              >
                                {exam.shortName}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pickerItemTitle, { color: colors.text }]} numberOfLines={1}>
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
                                size={18}
                                color={exam.color}
                                style={{ marginLeft: 6 }}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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
                  Select Stream for {selectedExam.name}
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
                      <View
                        style={[
                          styles.pickerBadgeLeft,
                          {
                            backgroundColor: `${selectedExam.color}18`,
                            borderColor: isSelected ? selectedExam.color : `${selectedExam.color}35`,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.pickerBadgeLeftText, { color: selectedExam.color }]}
                          numberOfLines={1}
                        >
                          {stream.code || "ALL"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {stream.name}
                        </Text>
                        {stream.description ? (
                          <Text
                            style={[styles.pickerItemSubtitle, { color: colors.textMuted }]}
                            numberOfLines={1}
                          >
                            {stream.description}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={selectedExam.color}
                          style={{ marginLeft: 6 }}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleTextCol: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  dropdownSection: {
    gap: 6,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 2,
  },
  dropdownCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  shortBadgeLeft: {
    minWidth: 50,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  shortBadgeLeftText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dropdownTextGroup: {
    flex: 1,
  },
  dropdownTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  dropdownSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  infoPillText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheetContent: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  pickerBadgeLeft: {
    minWidth: 46,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  pickerBadgeLeftText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  pickerItemTitle: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  pickerItemSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  categoryPillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryTag: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pickerSection: {
    marginBottom: 12,
  },
  pickerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  pickerSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerSectionTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
