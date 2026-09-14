import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import { QuestionDetailModal } from "@/components/search/QuestionDetailModal";
import { StatusModal } from "@/components/StatusModal";
import { useActiveExam } from "@/context/ExamContext";
import type { Question } from "@/database/schema";
import { backfillExtractedText } from "@/functions/backfillExtractedText";
import { isOcrSupported } from "@/functions/extractText";
import { resolveImageUri } from "@/functions/imageHelpers";
import { searchQuestions, type SearchFilters } from "@/functions/searchQuestions";
import {
  SyllabusSchema,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeColors } from "@/constants/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 20;

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ─── Search & Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { syllabus } = useActiveExam();
  const { lastRestoredAt } = useCloudSync();
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

  // Reset syllabus filters when syllabus changes
  useEffect(() => {
    setSelectedSubject(null);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
  }, [syllabus]);

  // Dropdowns inside filter panel
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);

  // ─── Query Results State ──────────────────────────────────────────────────
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── OCR Support Notice State ─────────────────────────────────────────────
  const [isOcrAvailable, setIsOcrAvailable] = useState<boolean | null>(null);
  const [isOcrNoticeDismissed, setIsOcrNoticeDismissed] = useState(false);
  const [showOcrUnavailableModal, setShowOcrUnavailableModal] = useState(false);

  // ─── Image Zoom Modal State ───────────────────────────────────────────────
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState("Question Image");

  // ─── Selected Question for Detail Modal ───────────────────────────────────
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // ─── Debounce Search Input ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Check OCR & Run Background Backfill on Mount ─────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function checkOcr() {
      try {
        const supported = await isOcrSupported();
        if (isMounted) {
          setIsOcrAvailable(supported);
          if (supported) {
            backfillExtractedText().catch(() => {});
          }
        }
      } catch {
        if (isMounted) {
          setIsOcrAvailable(false);
        }
      }
    }
    checkOcr();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Derived Syllabus Lists ───────────────────────────────────────────────
  const availableSubjects = useMemo(() => getSubjects(syllabus), [syllabus]);
  const availableTopics = useMemo(
    () => getTopics(syllabus, selectedSubject),
    [syllabus, selectedSubject]
  );
  const availableSubtopics = useMemo(
    () => getSubtopicsForTopics(syllabus, selectedSubject, selectedTopics),
    [syllabus, selectedSubject, selectedTopics]
  );

  // Active filter count indicator
  const activeFiltersCount =
    (selectedSubject ? 1 : 0) +
    selectedTopics.length +
    selectedSubtopics.length;

  // ─── Filter Toggle & Reset Handlers ───────────────────────────────────────
  const toggleFilterPanel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFilterPanelOpen((prev) => !prev);
  };

  const handleSelectSubject = (subj: string) => {
    setSelectedSubject(subj);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    setIsSubjectDropdownOpen(false);
  };

  const handleToggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      const remaining = selectedTopics.filter((t) => t !== topic);
      setSelectedTopics(remaining);
      const stillAvailable = getSubtopicsForTopics(
        syllabus,
        selectedSubject,
        remaining
      );
      setSelectedSubtopics((prev) =>
        prev.filter((s) => stillAvailable.includes(s))
      );
    } else {
      setSelectedTopics((prev) => [...prev, topic]);
    }
  };

  const handleToggleSubtopic = (subtopic: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(subtopic)
        ? prev.filter((s) => s !== subtopic)
        : [...prev, subtopic]
    );
  };

  const handleClearFilters = () => {
    setSelectedSubject(null);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    setIsSubjectDropdownOpen(false);
    setIsTopicDropdownOpen(false);
    setIsSubtopicDropdownOpen(false);
  };

  // ─── Fetch Search Results ─────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (pageToFetch: number, isInitial = false) => {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const filters: SearchFilters = {
        query: debouncedQuery,
        subject: selectedSubject,
        topics: selectedTopics.length > 0 ? selectedTopics : undefined,
        subtopics: selectedSubtopics.length > 0 ? selectedSubtopics : undefined,
      };

      try {
        const result = await searchQuestions(filters, pageToFetch, PAGE_SIZE);
        if (pageToFetch === 0) {
          setQuestionsList(result.questions);
        } else {
          setQuestionsList((prev) => [...prev, ...result.questions]);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setPage(pageToFetch);
      } catch (err) {
        console.error("[SearchScreen] Failed to fetch search results:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [debouncedQuery, selectedSubject, selectedTopics, selectedSubtopics]
  );

  // Re-fetch search results when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchResults(0, false);
    }, [fetchResults])
  );

  // Trigger search when query, filters, or cloud restore state changes
  useEffect(() => {
    fetchResults(0, true);
  }, [fetchResults, lastRestoredAt]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchResults(0, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchResults(page + 1, false);
    }
  };

  // ─── Helpers for Badges ───────────────────────────────────────────────────
  const getSubjectColor = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes("physic")) return "#3B82F6";
    if (s.includes("chem")) return "#10B981";
    if (s.includes("bio") || s.includes("botany") || s.includes("zoology"))
      return "#8B5CF6";
    return "#F59E0B";
  };

  // ─── Render Question Card Item ────────────────────────────────────────────
  const formatAnswerSummary = (q: Question): string | null => {
    if (q.questionType === "MCQ") {
      return q.mcqAnswer ? `Option ${q.mcqAnswer}` : null;
    }
    if (q.questionType === "MSQ") {
      if (Array.isArray(q.msqAnswer) && q.msqAnswer.length > 0) {
        return `Options ${q.msqAnswer.join(", ")}`;
      }
      return null;
    }
    if (q.questionType === "NAT") {
      return q.natAnswer ? `${q.natAnswer}` : null;
    }
    return null;
  };

  const renderQuestionCard = ({
    item,
    index,
  }: {
    item: Question;
    index: number;
  }) => {
    const subjColor = getSubjectColor(item.subject);
    const resolvedImageUri = resolveImageUri(item.questionImageUri);
    const answerSummary = formatAnswerSummary(item);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => {
          setSelectedQuestion(item);
        }}
      >
        {/* 3-Column Compact Row: [Image w/ Type] | [Subject & Option with divider] | [Topic & Subtopic points] */}
        <View style={styles.cardColumnsRow}>
          {/* Column 1: Image Thumbnail with Question Type pinned on top */}
          <View style={styles.imageCol}>
            {resolvedImageUri ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.thumbnailWrapper}
                onPress={() => {
                  setZoomImageUri(resolvedImageUri);
                  setZoomTitle(`${item.subject} Question`);
                }}
              >
                <Image
                  source={{ uri: resolvedImageUri }}
                  style={styles.thumbnailImage}
                  contentFit="cover"
                  transition={200}
                />
                {/* Question Type on top of image */}
                <View style={styles.imageTypeBadge}>
                  <Text style={styles.imageTypeBadgeText}>{item.questionType}</Text>
                </View>
                <View style={styles.zoomOverlay}>
                  <Ionicons name="scan-outline" size={9} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.thumbnailWrapper}>
                <View style={styles.imageTypeBadge}>
                  <Text style={styles.imageTypeBadgeText}>{item.questionType}</Text>
                </View>
                <View style={styles.noImageInner}>
                  <Ionicons name="image-outline" size={16} color="#475569" />
                </View>
              </View>
            )}
          </View>

          {/* Column 2: Subject on top, small separating line, and Answer below with green tick */}
          <View style={styles.answerCol}>
            <Text
              style={[styles.colSubjectText, { color: subjColor }]}
              numberOfLines={1}
            >
              {item.subject}
            </Text>
            <View style={styles.colDividerLine} />
            <View style={styles.answerValueRow}>
              <Ionicons name="checkmark-circle" size={11} color="#10B981" />
              <Text style={styles.answerColValue} numberOfLines={1}>
                {answerSummary ?? "—"}
              </Text>
            </View>
          </View>

          {/* Column 3: Topic on top & Subtopics below as clean simple points */}
          <View style={styles.taxonomyCol}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDotTopic}>•</Text>
              <Text style={styles.topicBulletText} numberOfLines={1}>
                {item.topics && item.topics.length > 0
                  ? item.topics[0]
                  : "No topic"}
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDotSubtopic}>•</Text>
              <Text style={styles.subtopicBulletText} numberOfLines={1}>
                {item.subtopics && item.subtopics.length > 0
                  ? item.subtopics[0]
                  : "General"}
              </Text>
            </View>
          </View>

          {/* Column 4: Revision scores (correct green tick on top, incorrect red cross below) */}
          <View style={styles.scoreCol}>
            <View style={styles.scoreRow}>
              <Ionicons name="checkmark-circle" size={10} color="#10B981" />
              <Text style={styles.scoreCorrectText}>{item.correct}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Ionicons name="close-circle" size={10} color="#EF4444" />
              <Text style={styles.scoreIncorrectText}>{item.incorrect}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Filter Dropdown Chips ────────────────────────────────────────────────
  const topicChips =
    selectedTopics.length > 0 ? (
      <View style={styles.filterChipRow}>
        {selectedTopics.map((top) => (
          <View key={top} style={styles.selectedFilterChip}>
            <Text style={styles.selectedFilterChipText} numberOfLines={1}>
              {top}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleTopic(top)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ) : null;

  const subtopicChips =
    selectedSubtopics.length > 0 ? (
      <View style={styles.filterChipRow}>
        {selectedSubtopics.map((subtop) => (
          <View key={subtop} style={styles.selectedFilterChip}>
            <Text style={styles.selectedFilterChipText} numberOfLines={1}>
              {subtop}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleSubtopic(subtop)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ── Screen Title Header ────────────────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Search Questions</Text>
        <Text style={styles.headerSubtitle}>
          Find questions by text, subject, topic, or notes
        </Text>
      </View>

      {/* ── Top Bar with Search & Filter Toggle ────────────────────────────── */}
      <View style={styles.searchHeader}>
        <View
          style={[
            styles.searchBarWrapper,
            isOcrAvailable === false && styles.searchBarDisabled,
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={isOcrAvailable === false ? colors.textPlaceholder : colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              isOcrAvailable === false && styles.searchInputDisabled,
            ]}
            placeholder={
              isOcrAvailable === false
                ? "OCR search unavailable"
                : "Search by text, note, or subject..."
            }
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
            editable={isOcrAvailable !== false}
            pointerEvents={isOcrAvailable === false ? "none" : "auto"}
          />
          {searchQuery.length > 0 && isOcrAvailable !== false ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {isOcrAvailable === false && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={0.7}
              onPress={() => setShowOcrUnavailableModal(true)}
            />
          )}
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            styles.filterButton,
            isFilterPanelOpen && styles.filterButtonOpen,
            activeFiltersCount > 0 && styles.filterButtonActive,
          ]}
          onPress={toggleFilterPanel}
        >
          <Ionicons
            name={isFilterPanelOpen ? "funnel" : "funnel-outline"}
            size={18}
            color={
              activeFiltersCount > 0 || isFilterPanelOpen ? "#FFFFFF" : colors.textMuted
            }
          />
          {activeFiltersCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* ── Quick Active Filter Chips Row ──────────────────────────────────── */}
      {activeFiltersCount > 0 ? (
        <View style={styles.quickActiveFiltersRow}>
          {selectedSubject ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{selectedSubject}</Text>
              <TouchableOpacity
                onPress={() => handleSelectSubject("")}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : null}

          {selectedTopics.length > 0 ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {selectedTopics.length} topic{selectedTopics.length > 1 ? "s" : ""}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedTopics([]);
                  setSelectedSubtopics([]);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.clearAllFiltersBtn}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearAllFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── OCR Notice Banner (if unsupported / Expo Go / older Android) ────── */}
      {isOcrAvailable === false && !isOcrNoticeDismissed ? (
        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle" size={18} color="#3B82F6" />
          <Text style={styles.noticeText}>
            Image OCR search is unavailable on this device/runtime. Subject, topic &
            note search works normally.
          </Text>
          <TouchableOpacity
            onPress={() => setIsOcrNoticeDismissed(true)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Collapsible Filter Panel ───────────────────────────────────────── */}
      {isFilterPanelOpen ? (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <View style={styles.filterPanelTitleRow}>
              <Ionicons name="options" size={16} color="#3B82F6" />
              <Text style={styles.filterPanelTitle}>Filter by Syllabus</Text>
            </View>
            {activeFiltersCount > 0 ? (
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={styles.resetFiltersText}>Reset</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Subject Dropdown */}
          <SyllabusDropdown
            label="Subject"
            isOpen={isSubjectDropdownOpen}
            onToggleOpen={() => {
              setIsSubjectDropdownOpen((p) => !p);
              setIsTopicDropdownOpen(false);
              setIsSubtopicDropdownOpen(false);
            }}
            items={availableSubjects.map((s) => ({ value: s, label: s }))}
            selectedValues={selectedSubject ? [selectedSubject] : []}
            onSelectItem={handleSelectSubject}
            placeholder="All Subjects"
          />

          {/* Topics Dropdown */}
          <SyllabusDropdown
            label="Topics"
            isOpen={isTopicDropdownOpen}
            onToggleOpen={() => {
              setIsTopicDropdownOpen((p) => !p);
              setIsSubjectDropdownOpen(false);
              setIsSubtopicDropdownOpen(false);
            }}
            items={availableTopics.map((t) => ({ value: t, label: t }))}
            selectedValues={selectedTopics}
            onSelectItem={handleToggleTopic}
            disabled={!selectedSubject}
            placeholder={
              !selectedSubject
                ? "Select Subject first"
                : selectedTopics.length > 0
                  ? `Selected (${selectedTopics.length})`
                  : "All Topics"
            }
            chips={topicChips}
          />

          {/* Subtopics Dropdown */}
          <SyllabusDropdown
            label="Subtopics"
            isOpen={isSubtopicDropdownOpen}
            onToggleOpen={() => {
              setIsSubtopicDropdownOpen((p) => !p);
              setIsSubjectDropdownOpen(false);
              setIsTopicDropdownOpen(false);
            }}
            items={availableSubtopics.map((s) => ({ value: s, label: s }))}
            selectedValues={selectedSubtopics}
            onSelectItem={handleToggleSubtopic}
            disabled={selectedTopics.length === 0}
            placeholder={
              selectedTopics.length === 0
                ? "Select Topic(s) first"
                : selectedSubtopics.length > 0
                  ? `Selected (${selectedSubtopics.length})`
                  : "All Subtopics"
            }
            chips={subtopicChips}
          />

          <TouchableOpacity
            style={styles.applyFilterButton}
            onPress={toggleFilterPanel}
          >
            <Text style={styles.applyFilterButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Results Summary Header ─────────────────────────────────────────── */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCountText}>
          {isLoading
            ? "Searching..."
            : `${totalCount} question${totalCount === 1 ? "" : "s"} found`}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        ) : null}
      </View>

      {/* ── Question List / Results ────────────────────────────────────────── */}
      <FlatList
        data={questionsList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderQuestionCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching questions...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="search-outline" size={40} color={colors.textPlaceholder} />
              </View>
              <Text style={styles.emptyTitle}>No questions found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || activeFiltersCount > 0
                  ? "Try changing your search term or clearing some filters."
                  : "You haven't added any questions yet."}
              </Text>
              {searchQuery || activeFiltersCount > 0 ? (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={() => {
                    setSearchQuery("");
                    handleClearFilters();
                  }}
                >
                  <Text style={styles.clearAllButtonText}>Reset Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : hasMore ? null : questionsList.length > 0 ? (
            <View style={styles.endOfResultsContainer}>
              <Text style={styles.endOfResultsText}>End of questions</Text>
            </View>
          ) : null
        }
      />

      {/* ── Image Zoom Modal ───────────────────────────────────────────────── */}
      <ImageZoomModal
        visible={!!zoomImageUri}
        imageUri={zoomImageUri}
        title={zoomTitle}
        onClose={() => setZoomImageUri(null)}
      />

      {/* ── Question Detail Modal ──────────────────────────────────────────── */}
      <QuestionDetailModal
        visible={!!selectedQuestion}
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
      />

      {/* ── OCR Unavailable Modal ──────────────────────────────────────────── */}
      <StatusModal
        visible={showOcrUnavailableModal}
        type="warning"
        title="OCR Not Available"
        message="OCR tool not detected can't use this feature"
        buttonText="Got it"
        onClose={() => setShowOcrUnavailableModal(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    headerContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "400",
      marginTop: 4,
    },
    searchHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
      gap: 10,
    },
    searchBarWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 46,
    },
    searchBarDisabled: {
      opacity: 0.65,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 0,
    },
    searchInputDisabled: {
      color: colors.textPlaceholder,
    },
    clearButton: {
      padding: 4,
    },
    filterButton: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    filterButtonOpen: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.danger,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
    filterBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },
    quickActiveFiltersRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
      flexWrap: "wrap",
    },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.1)",
      borderColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.3)",
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      gap: 6,
    },
    activePillText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "500",
    },
    clearAllFiltersBtn: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    clearAllFiltersText: {
      color: colors.textMuted,
      fontSize: 12,
      textDecorationLine: "underline",
    },
    noticeBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(37, 99, 235, 0.08)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.2)",
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    noticeText: {
      flex: 1,
      color: colors.primary,
      fontSize: 12,
      lineHeight: 16,
    },
    filterPanel: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPanelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    filterPanelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    filterPanelTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    resetFiltersText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "500",
    },
    filterChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginVertical: 4,
    },
    selectedFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    selectedFilterChipText: {
      color: colors.text,
      fontSize: 11,
      maxWidth: 160,
    },
    applyFilterButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
      marginTop: 8,
    },
    applyFilterButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
    },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    resultsCountText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 110,
      gap: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
    },
    cardColumnsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    imageCol: {
      width: 52,
      height: 52,
    },
    thumbnailWrapper: {
      width: 52,
      height: 52,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
    },
    imageTypeBadge: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(15, 23, 42, 0.75)",
      paddingVertical: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    imageTypeBadgeText: {
      color: isDark ? "#38BDF8" : "#0284C7",
      fontSize: 8.5,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    noImageInner: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    zoomOverlay: {
      position: "absolute",
      bottom: 2,
      right: 2,
      backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
      borderRadius: 3,
      padding: 1.5,
      zIndex: 2,
    },
    answerCol: {
      width: 88,
      justifyContent: "center",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 6,
    },
    colSubjectText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.1,
    },
    colDividerLine: {
      width: "100%",
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 2.5,
    },
    answerValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    answerColValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 14,
      flex: 1,
    },
    taxonomyCol: {
      flex: 1,
      justifyContent: "center",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 6,
      gap: 2,
    },
    bulletItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    bulletDotTopic: {
      color: isDark ? "#38BDF8" : "#0284C7",
      fontSize: 11,
      lineHeight: 13,
    },
    topicBulletText: {
      color: colors.text,
      fontSize: 10.5,
      fontWeight: "600",
      flex: 1,
    },
    bulletDotSubtopic: {
      color: isDark ? "#14B8A6" : "#0D9488",
      fontSize: 11,
      lineHeight: 13,
    },
    subtopicBulletText: {
      color: colors.textMuted,
      fontSize: 10,
      flex: 1,
    },
    scoreCol: {
      justifyContent: "center",
      alignItems: "flex-start",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 6,
      gap: 3,
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    scoreCorrectText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: "700",
    },
    scoreIncorrectText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: "700",
    },
    loadingContainer: {
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 8,
    },
    emptyIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(148, 163, 184, 0.12)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
    },
    clearAllButton: {
      marginTop: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    clearAllButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
    },
    loadingMoreContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      gap: 8,
    },
    loadingMoreText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    endOfResultsContainer: {
      alignItems: "center",
      paddingVertical: 16,
    },
    endOfResultsText: {
      color: colors.textPlaceholder,
      fontSize: 12,
    },
  });
