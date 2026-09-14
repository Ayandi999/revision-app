import React, { useMemo, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedExamId, setSelectedExamId] = useState<string>(currentExamId);
  const [selectedStreamId, setSelectedStreamId] = useState<string>(currentStreamId);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state whenever modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSelectedExamId(currentExamId);
      setSelectedStreamId(currentStreamId);
      setStep(1);
      setSearchQuery("");
    }
  }, [isModalOpen, currentExamId, currentStreamId]);

  const selectedExam = useMemo(
    () => EXAM_OPTIONS.find((e) => e.id === selectedExamId) || EXAM_OPTIONS[0],
    [selectedExamId]
  );

  const filteredStreams = useMemo(() => {
    if (!selectedExam) return [];
    if (!searchQuery.trim()) return selectedExam.streams;
    const q = searchQuery.toLowerCase().trim();
    return selectedExam.streams.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [selectedExam, searchQuery]);

  const handleSelectExam = (exam: ExamOption) => {
    setSelectedExamId(exam.id);
    // Pre-select first stream of that exam
    if (exam.streams.length > 0) {
      setSelectedStreamId(exam.streams[0].id);
    }
    // If self study, can directly confirm or go to step 2
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!selectedExamId || !selectedStreamId) return;
    await setExamAndStream(selectedExamId, selectedStreamId);
  };

  const { colors } = useTheme();

  if (!isModalOpen) return null;

  return (
    <Modal
      visible={isModalOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeExamSwitcher}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top", "bottom", "left", "right"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            {step === 2 ? (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.titleTextCol}>
              <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
                {isOnboardingCompleted ? "PREFERENCES" : "WELCOME"}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {step === 1
                  ? "Which exam are you preparing for?"
                  : `Select ${selectedExam.shortName} Stream`}
              </Text>
            </View>
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

        {/* Content */}
        <View style={styles.content}>
          {step === 1 ? (
            /* ── Step 1: Exam Selection (Scrollable) ─────────────────── */
            <ScrollView
              style={styles.stepOneScrollView}
              contentContainerStyle={styles.stepOneScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choose your target examination to customize your syllabus, topics, and revision workflow.
              </Text>

              <View style={styles.examGrid}>
                {EXAM_OPTIONS.map((exam) => {
                  const isSelected = selectedExamId === exam.id;
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      style={[
                        styles.examCard,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isSelected && {
                          borderColor: exam.color,
                          backgroundColor: `${exam.color}15`,
                        },
                      ]}
                      onPress={() => handleSelectExam(exam)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.iconWrapper,
                          {
                            backgroundColor: `${exam.color}18`,
                            borderColor: `${exam.color}40`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={exam.icon as any}
                          size={20}
                          color={exam.color}
                        />
                      </View>

                      <View style={styles.examTextContainer}>
                        <View style={styles.examTitleLine}>
                          <Text style={[styles.examName, { color: colors.text }]} numberOfLines={1}>
                            {exam.name}
                          </Text>
                          <View
                            style={[
                              styles.streamCountBadge,
                              { backgroundColor: `${exam.color}18` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.streamCountText,
                                { color: exam.color },
                              ]}
                            >
                              {exam.streams.length === 1
                                ? "1 Category"
                                : `${exam.streams.length} Streams`}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.examDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {exam.description}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            /* ── Step 2: Stream / Category Selection ───────────────── */
            <View style={styles.stepTwoWrapper}>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Select your specific discipline or category for{" "}
                <Text style={{ color: selectedExam.color, fontWeight: "700" }}>
                  {selectedExam.name}
                </Text>
                .
              </Text>

              {/* Search bar for GATE (or large lists) */}
              {selectedExam.streams.length > 4 && (
                <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={`Search ${selectedExam.shortName} disciplines (e.g. CS, DA, Mechanical)...`}
                    placeholderTextColor={colors.textPlaceholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <FlatList
                data={filteredStreams}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.streamList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = selectedStreamId === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.streamItem,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isSelected && {
                          borderColor: selectedExam.color,
                          backgroundColor: `${selectedExam.color}18`,
                        },
                      ]}
                      onPress={() => setSelectedStreamId(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.streamTextContainer}>
                        {item.code ? (
                          <View
                            style={[
                              styles.codeBadge,
                              isSelected
                                ? { backgroundColor: selectedExam.color }
                                : { backgroundColor: colors.cardSecondary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.codeBadgeText,
                                isSelected ? { color: "#FFFFFF" } : { color: colors.text },
                              ]}
                            >
                              {item.code}
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.streamName,
                            { color: colors.textSecondary },
                            isSelected && { color: colors.text, fontWeight: "700" },
                          ]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
                          { borderColor: colors.border },
                          isSelected && {
                            borderColor: selectedExam.color,
                            backgroundColor: selectedExam.color,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No disciplines found</Text>
                  </View>
                }
              />
            </View>
          )}
        </View>

        {/* Footer CTA */}
        {step === 2 && (
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: selectedExam.color },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>
                {isOnboardingCompleted ? "Save & Apply Syllabus" : "Confirm & Start Revising"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121216",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  titleTextCol: {
    flex: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  headerEyebrow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  stepOneScrollView: {
    flex: 1,
  },
  stepOneScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  examGrid: {
    gap: 10,
  },
  examCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  examTextContainer: {
    flex: 1,
    gap: 3,
  },
  examTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  examName: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  examDesc: {
    color: "#94A3B8",
    fontSize: 11.5,
    lineHeight: 15,
  },
  streamCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  streamCountText: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stepTwoWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    height: "100%",
  },
  streamList: {
    gap: 6,
    paddingBottom: 24,
  },
  streamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1A22",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  streamTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  streamName: {
    color: "#E2E8F0",
    fontSize: 12.5,
    fontWeight: "500",
    flex: 1,
    lineHeight: 17,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#121216",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    height: 50,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
