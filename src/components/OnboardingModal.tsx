import React, { useMemo, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EXAM_OPTIONS, ExamOption, StreamOption } from "@/config/exams";
import { useActiveExam } from "@/context/ExamContext";

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

  if (!isModalOpen) return null;

  return (
    <Modal
      visible={isModalOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeExamSwitcher}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {step === 2 ? (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={styles.headerEyebrow}>
                {isOnboardingCompleted ? "PREFERENCES" : "WELCOME"}
              </Text>
              <Text style={styles.headerTitle}>
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
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 1 ? (
            /* ── Step 1: Exam Selection ────────────────────────────── */
            <View style={styles.stepOneWrapper}>
              <Text style={styles.subtitle}>
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
                        isSelected && {
                          borderColor: exam.color,
                          backgroundColor: `${exam.color}15`,
                        },
                      ]}
                      onPress={() => handleSelectExam(exam)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeader}>
                        <View
                          style={[
                            styles.iconWrapper,
                            { backgroundColor: `${exam.color}20`, borderColor: exam.color },
                          ]}
                        >
                          <Ionicons
                            name={exam.icon as any}
                            size={26}
                            color={exam.color}
                          />
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#64748B"
                        />
                      </View>

                      <Text style={styles.examName}>{exam.name}</Text>
                      <Text style={styles.examDesc}>{exam.description}</Text>

                      <View style={styles.streamCountBadge}>
                        <Text
                          style={[styles.streamCountText, { color: exam.color }]}
                        >
                          {exam.streams.length === 1
                            ? "1 Category"
                            : `${exam.streams.length} Options Available`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* ── Step 2: Stream / Category Selection ───────────────── */
            <View style={styles.stepTwoWrapper}>
              <Text style={styles.subtitle}>
                Select your specific discipline or category for{" "}
                <Text style={{ color: selectedExam.color, fontWeight: "700" }}>
                  {selectedExam.name}
                </Text>
                .
              </Text>

              {/* Search bar for GATE (or large lists) */}
              {selectedExam.streams.length > 4 && (
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${selectedExam.shortName} disciplines (e.g. CS, DA, Mechanical)...`}
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color="#64748B" />
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
                                : { backgroundColor: "rgba(255, 255, 255, 0.08)" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.codeBadgeText,
                                isSelected ? { color: "#FFFFFF" } : { color: "#E2E8F0" },
                              ]}
                            >
                              {item.code}
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.streamName,
                            isSelected && { color: "#FFFFFF", fontWeight: "700" },
                          ]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
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
                    <Text style={styles.emptyText}>No disciplines found</Text>
                  </View>
                }
              />
            </View>
          )}
        </View>

        {/* Footer CTA */}
        {step === 2 && (
          <View style={styles.footer}>
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
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  stepOneWrapper: {
    flex: 1,
  },
  examGrid: {
    gap: 12,
  },
  examCard: {
    backgroundColor: "#1A1A22",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  examName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  examDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  streamCountBadge: {
    alignSelf: "flex-start",
  },
  streamCountText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stepTwoWrapper: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
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
    gap: 8,
    paddingBottom: 24,
  },
  streamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1A22",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  streamTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  streamName: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
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
