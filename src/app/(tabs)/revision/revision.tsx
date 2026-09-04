import { db } from "@/database/db";
import { questions, type Question } from "@/database/schema";
import { Ionicons } from "@expo/vector-icons";
import { desc } from "drizzle-orm";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function Revision() {
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected answers keyed by question ID
  const [userAnswers, setUserAnswers] = useState<
    Record<number, { mcq?: string; msq?: string[]; nat?: string }>
  >({});

  // Revealed solution toggle keyed by question ID
  const [revealedSolutions, setRevealedSolutions] = useState<
    Record<number, boolean>
  >({});

  const fetchQuestions = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const rows = await db
        .select()
        .from(questions)
        .orderBy(desc(questions.id));
      setQuestionsList(rows);
    } catch (err) {
      console.error("[Revision] Error fetching questions:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchQuestions();
    }, [fetchQuestions]),
  );

  const handleSelectMcq = (questionId: number, option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        mcq: prev[questionId]?.mcq === option ? undefined : option,
      },
    }));
  };

  const handleToggleMsq = (questionId: number, option: string) => {
    setUserAnswers((prev) => {
      const current = prev[questionId]?.msq ?? [];
      const exists = current.includes(option);
      const updated = exists
        ? current.filter((o) => o !== option)
        : [...current, option];
      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          msq: updated,
        },
      };
    });
  };

  const handleNatChange = (questionId: number, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        nat: text,
      },
    }));
  };

  const toggleSolution = (questionId: number) => {
    setRevealedSolutions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const renderQuestionItem = ({
    item,
    index,
  }: {
    item: Question;
    index: number;
  }) => {
    const selected = userAnswers[item.id] || {};
    const isSolutionRevealed = !!revealedSolutions[item.id];

    return (
      <View style={styles.card}>
        {/* Card Header: Question Number, Type & Subject */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.qNumberBadge}>
              <Text style={styles.qNumberText}>#{index + 1}</Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.questionType}</Text>
            </View>
            {item.subject ? (
              <View style={styles.subjectBadge}>
                <Ionicons name="book-outline" size={12} color="#9CA3AF" />
                <Text style={styles.subjectBadgeText} numberOfLines={1}>
                  {item.subject}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Topics / Subtopics chips (if any) */}
        {((item.topics && item.topics.length > 0) ||
          (item.subtopics && item.subtopics.length > 0)) && (
          <View style={styles.chipsContainer}>
            {item.topics?.map((topic) => (
              <View key={topic} style={styles.topicChip}>
                <Ionicons name="layers-outline" size={11} color="#9d00ff" />
                <Text style={styles.topicChipText} numberOfLines={1}>
                  {topic}
                </Text>
              </View>
            ))}
            {item.subtopics?.map((subtopic) => (
              <View key={subtopic} style={styles.subtopicChip}>
                <Ionicons name="pricetag-outline" size={11} color="#9CA3AF" />
                <Text style={styles.subtopicChipText} numberOfLines={1}>
                  {subtopic}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Question Image */}
        {item.questionImageUri ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.questionImageUri }}
              style={styles.questionImage}
              contentFit="contain"
              transition={200}
            />
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#4B5563" />
            <Text style={styles.noImageText}>No image provided</Text>
          </View>
        )}

        {/* Options / Input Section */}
        <View style={styles.answerSection}>
          {item.questionType === "MCQ" && (
            <View>
              <Text style={styles.sectionHint}>Select correct option:</Text>
              <View style={styles.optionsRow}>
                {OPTIONS.map((opt) => {
                  const isSelected = selected.mcq === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      style={[
                        styles.optionCircle,
                        isSelected && styles.optionCircleSelected,
                      ]}
                      onPress={() => handleSelectMcq(item.id, opt)}
                    >
                      <Text
                        style={[
                          styles.optionCircleText,
                          isSelected && styles.optionCircleTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {item.questionType === "MSQ" && (
            <View>
              <Text style={styles.sectionHint}>
                Select one or more options:
              </Text>
              <View style={styles.optionsRow}>
                {OPTIONS.map((opt) => {
                  const isSelected = selected.msq?.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      style={[
                        styles.optionCircle,
                        isSelected && styles.optionCircleSelected,
                      ]}
                      onPress={() => handleToggleMsq(item.id, opt)}
                    >
                      <Text
                        style={[
                          styles.optionCircleText,
                          isSelected && styles.optionCircleTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {item.questionType === "NAT" && (
            <View>
              <Text style={styles.sectionHint}>Enter numerical answer:</Text>
              <View style={styles.natInputContainer}>
                <TextInput
                  style={styles.natInput}
                  placeholder="Type answer here..."
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={selected.nat ?? ""}
                  onChangeText={(txt) => handleNatChange(item.id, txt)}
                />
              </View>
            </View>
          )}
        </View>

        {/* Action button: Reveal / Hide Solution */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.solutionToggleBtn}
          onPress={() => toggleSolution(item.id)}
        >
          <Ionicons
            name={isSolutionRevealed ? "eye-off-outline" : "bulb-outline"}
            size={16}
            color="#9d00ff"
          />
          <Text style={styles.solutionToggleBtnText}>
            {isSolutionRevealed ? "Hide Solution" : "Check / Reveal Solution"}
          </Text>
        </TouchableOpacity>

        {/* Revealed Solution Card */}
        {isSolutionRevealed && (
          <View style={styles.solutionContainer}>
            <View style={styles.solutionHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#9d00ff" />
              <Text style={styles.solutionTitle}>Solution Details</Text>
            </View>

            {/* Answer Display */}
            <View style={styles.answerResultRow}>
              <Text style={styles.answerResultLabel}>Correct Answer:</Text>
              <Text style={styles.answerResultValue}>
                {item.questionType === "MCQ" && (item.mcqAnswer || "N/A")}
                {item.questionType === "MSQ" &&
                  (item.msqAnswer?.join(", ") || "N/A")}
                {item.questionType === "NAT" && (item.natAnswer || "N/A")}
              </Text>
            </View>

            {/* Solution Image (if present) */}
            {item.solutionImageUri && (
              <View style={styles.solutionImageWrapper}>
                <Text style={styles.solutionSubtitle}>Solution Image:</Text>
                <Image
                  source={{ uri: item.solutionImageUri }}
                  style={styles.solutionImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}

            {/* Personal Note (if present) */}
            {item.personalNote ? (
              <View style={styles.noteContainer}>
                <Text style={styles.solutionSubtitle}>Personal Note:</Text>
                <Text style={styles.noteText}>{item.personalNote}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Page Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Revision</Text>
          <Text style={styles.subtitle}>
            {questionsList.length === 1
              ? "1 question available"
              : `${questionsList.length} questions available`}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.refreshIconBtn}
          onPress={() => fetchQuestions()}
        >
          <Ionicons name="reload" size={18} color="#9d00ff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9d00ff" />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      ) : (
        <FlatList
          data={questionsList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderQuestionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchQuestions(true)}
              tintColor="#9d00ff"
              colors={["#9d00ff"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="book-outline" size={44} color="#9d00ff" />
              </View>
              <Text style={styles.emptyTitle}>No Questions Found</Text>
              <Text style={styles.emptyDesc}>
                Add questions from the "Add Q" tab to practice and revise them
                here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1b1b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: "#9d00ff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#262525",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110, // Clears floating bottom tab bar
    gap: 20,
  },
  card: {
    backgroundColor: "#222121",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  qNumberBadge: {
    backgroundColor: "#2a2929",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  qNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "rgba(157, 0, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#9d00ff88",
  },
  typeBadgeText: {
    color: "#9d00ff",
    fontSize: 12,
    fontWeight: "700",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2a2929",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectBadgeText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 160,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(157, 0, 255, 0.08)",
    borderWidth: 1,
    borderColor: "#9d00ff55",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topicChipText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "500",
  },
  subtopicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#282727",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subtopicChipText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "400",
  },
  imageWrapper: {
    width: "100%",
    height: 240,
    backgroundColor: "#181717",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 14,
  },
  questionImage: {
    width: "100%",
    height: "100%",
  },
  noImagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#181717",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  noImageText: {
    color: "#6B7280",
    fontSize: 13,
  },
  answerSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  sectionHint: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  optionCircle: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#262525",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCircleSelected: {
    borderColor: "#9d00ff",
    backgroundColor: "rgba(157, 0, 255, 0.15)",
  },
  optionCircleText: {
    color: "#D1D5DB",
    fontSize: 17,
    fontWeight: "700",
  },
  optionCircleTextSelected: {
    color: "#9d00ff",
  },
  natInputContainer: {
    backgroundColor: "#262525",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  natInput: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  solutionToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(157, 0, 255, 0.08)",
    borderWidth: 1,
    borderColor: "#9d00ff44",
  },
  solutionToggleBtnText: {
    color: "#9d00ff",
    fontSize: 13,
    fontWeight: "600",
  },
  solutionContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#1c1b1b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(157, 0, 255, 0.25)",
    gap: 10,
  },
  solutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  solutionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  answerResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  answerResultLabel: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  answerResultValue: {
    color: "#9d00ff",
    fontSize: 15,
    fontWeight: "700",
  },
  solutionSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  solutionImageWrapper: {
    marginTop: 4,
  },
  solutionImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#141414",
    borderRadius: 10,
  },
  noteContainer: {
    marginTop: 4,
    padding: 10,
    backgroundColor: "#242323",
    borderRadius: 8,
  },
  noteText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(157, 0, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDesc: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
