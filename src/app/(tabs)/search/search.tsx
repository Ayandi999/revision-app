import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import { DeleteQuestionModal } from "@/components/search/DeleteQuestionModal";
import { EditQuestionModal } from "@/components/search/EditQuestionModal";
import { QuestionDetailModal } from "@/components/search/QuestionDetailModal";
import { StatusModal } from "@/components/StatusModal";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import type { ThemeColors } from "@/constants/theme";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import { isAudioPath } from "@/functions/audioHelpers";
import { backfillExtractedText } from "@/functions/backfillExtractedText";
import { isOcrSupported } from "@/functions/extractText";
import { hapticSelection } from "@/functions/hapticFeedback";
import { resolveImageUri } from "@/functions/imageHelpers";
import { deleteQuestionFromLocalDb } from "@/functions/queries";
import {
  searchQuestions,
  type SearchFilters,
  type SearchSortBy,
} from "@/functions/searchQuestions";
import {
  compareLexicographic,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 30;

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
  const [sortBy, setSortBy] = useState<SearchSortBy>("most-correct");

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

  // Pagination scroll refs: prevents premature loading before user reaches end
  const onEndReachedCalledDuringMomentum = useRef(true);
  const isFetchingRef = useRef(false);

  // ─── OCR Support Notice State ─────────────────────────────────────────────
  const [isOcrAvailable, setIsOcrAvailable] = useState<boolean | null>(null);
  const [isOcrNoticeDismissed, setIsOcrNoticeDismissed] = useState(false);
  const [showOcrUnavailableModal, setShowOcrUnavailableModal] = useState(false);

  // ─── Image Zoom Modal State ───────────────────────────────────────────────
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState("Question Image");

  // ─── Selected Question for Detail Modal ───────────────────────────────────
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );

  // ─── Delete & Edit Question Modal State ───────────────────────────────────
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  );
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

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
    [syllabus, selectedSubject],
  );
  const availableSubtopics = useMemo(
    () => getSubtopicsForTopics(syllabus, selectedSubject, selectedTopics),
    [syllabus, selectedSubject, selectedTopics],
  );

  // Active filter count indicator
  const activeFiltersCount =
    (selectedSubject ? 1 : 0) +
    selectedTopics.length +
    selectedSubtopics.length;

  // ─── Filter Toggle & Reset Handlers ───────────────────────────────────────
  const toggleFilterPanel = () => {
    hapticSelection();
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
        remaining,
      );
      setSelectedSubtopics((prev) =>
        prev.filter((s) => stillAvailable.includes(s)),
      );
    } else {
      setSelectedTopics((prev) => [...prev, topic].sort(compareLexicographic));
    }
  };

  const handleToggleSubtopic = (subtopic: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(subtopic)
        ? prev.filter((s) => s !== subtopic)
        : [...prev, subtopic].sort(compareLexicographic),
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

  const handleToggleSort = () => {
    hapticSelection();
    setSortBy((prev) =>
      prev === "most-correct" ? "most-incorrect" : "most-correct",
    );
  };

  // ─── Fetch Search Results ─────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (pageToFetch: number, isInitial = false) => {
      if (pageToFetch > 0 && isFetchingRef.current) return;
      isFetchingRef.current = true;

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
        sortBy,
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
        isFetchingRef.current = false;
      }
    },
    [
      debouncedQuery,
      selectedSubject,
      selectedTopics,
      selectedSubtopics,
      sortBy,
    ],
  );

  // Re-fetch search results when tab is focused
  useFocusEffect(
    useCallback(() => {
      onEndReachedCalledDuringMomentum.current = true;
      fetchResults(0, false);
    }, [fetchResults]),
  );

  // Trigger search when query, filters, or cloud restore state changes
  useEffect(() => {
    onEndReachedCalledDuringMomentum.current = true;
    fetchResults(0, true);
  }, [fetchResults, lastRestoredAt]);

  const handleRefresh = () => {
    onEndReachedCalledDuringMomentum.current = true;
    setIsRefreshing(true);
    fetchResults(0, false);
  };

  const handleLoadMore = () => {
    if (onEndReachedCalledDuringMomentum.current) return;
    if (!isLoading && !isLoadingMore && hasMore && !isFetchingRef.current) {
      onEndReachedCalledDuringMomentum.current = true;
      fetchResults(page + 1, false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    setIsDeletingQuestion(true);
    try {
      const result = await deleteQuestionFromLocalDb(questionToDelete.id);
      if (result.success) {
        setQuestionsList((prev) =>
          prev.filter((q) => q.id !== questionToDelete.id),
        );
        setTotalCount((prev) => Math.max(0, prev - 1));
        if (selectedQuestion?.id === questionToDelete.id) {
          setSelectedQuestion(null);
        }
        setQuestionToDelete(null);
      } else {
        console.error(
          "[SearchScreen] Failed to delete question:",
          result.error,
        );
      }
    } catch (err) {
      console.error("[SearchScreen] Delete error:", err);
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  const handleQuestionUpdated = (updated: Question) => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q)),
    );
    if (selectedQuestion?.id === updated.id) {
      setSelectedQuestion(updated);
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
  const renderQuestionCard = ({
    item,
    index,
  }: {
    item: Question;
    index: number;
  }) => {
    const subjColor = getSubjectColor(item.subject);
    const resolvedImageUri = resolveImageUri(item.questionImageUri);
    const cleanExtractedText = item.extractedText?.replace(/\s+/g, " ").trim();

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => {
          hapticSelection();
          setSelectedQuestion(item);
        }}
      >
        {/* 3-Column Compact Row: [Image w/ Type] | [Subject & Extracted OCR Text] | [Scores] */}
        <View style={styles.cardColumnsRow}>
          {/* Column 1: Image Thumbnail with Question Type pinned on top */}
          <View style={styles.imageCol}>
            {resolvedImageUri ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.thumbnailWrapper}
                onPress={() => {
                  hapticSelection();
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
                  <Text style={styles.imageTypeBadgeText}>
                    {item.questionType}
                  </Text>
                </View>
                <View style={styles.zoomOverlay}>
                  <Ionicons name="scan-outline" size={9} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.thumbnailWrapper}>
                <View style={styles.imageTypeBadge}>
                  <Text style={styles.imageTypeBadgeText}>
                    {item.questionType}
                  </Text>
                </View>
                <View style={styles.noImageInner}>
                  <Ionicons name="image-outline" size={16} color="#475569" />
                </View>
              </View>
            )}
          </View>

          {/* Column 2 (Middle): Subject on top and OCR extracted text snippet below */}
          <View style={styles.middleCol}>
            <View style={styles.subjectRow}>
              <Text
                style={[styles.colSubjectText, { color: subjColor }]}
                numberOfLines={1}
              >
                {item.subject}
              </Text>
              {item.personalNote && isAudioPath(item.personalNote) ? (
                <View
                  style={[
                    styles.audioBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(20, 184, 166, 0.15)"
                        : "rgba(13, 148, 136, 0.1)",
                    },
                  ]}
                >
                  <Ionicons name="mic" size={9} color={colors.primary} />
                  <Text
                    style={[styles.audioBadgeText, { color: colors.primary }]}
                  >
                    Voice
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.extractedSnippetText,
                !cleanExtractedText && styles.extractedSnippetPlaceholder,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {cleanExtractedText || "No text extracted"}
            </Text>
          </View>

          {/* Column 3: Revision scores (correct green tick on top, incorrect red cross below) */}
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
            color={
              isOcrAvailable === false
                ? colors.textPlaceholder
                : colors.textMuted
            }
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
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
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
              activeFiltersCount > 0 || isFilterPanelOpen
                ? "#FFFFFF"
                : colors.textMuted
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
                {selectedTopics.length} topic
                {selectedTopics.length > 1 ? "s" : ""}
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
            Image OCR search is unavailable on this device/runtime. Subject,
            topic & note search works normally.
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
        <View style={styles.resultsCountRow}>
          <Text style={styles.resultsCountText}>
            {isLoading
              ? "Searching..."
              : `${totalCount} question${totalCount === 1 ? "" : "s"} found`}
          </Text>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginLeft: 6 }}
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.sortTogglePill}
          onPress={handleToggleSort}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={13} color={colors.primary} />
          <Text style={styles.sortToggleText}>
            {sortBy === "most-correct" ? "Most Correct" : "Most Incorrect"}
          </Text>
        </TouchableOpacity>
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
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        onScrollBeginDrag={() => {
          onEndReachedCalledDuringMomentum.current = false;
        }}
        onMomentumScrollBegin={() => {
          onEndReachedCalledDuringMomentum.current = false;
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.05}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching questions...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons
                  name="search-outline"
                  size={40}
                  color={colors.textPlaceholder}
                />
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
        onEdit={(q) => setQuestionToEdit(q)}
        onDelete={(q) => setQuestionToDelete(q)}
      />

      {/* ── Delete Question Modal ──────────────────────────────────────────── */}
      <DeleteQuestionModal
        visible={!!questionToDelete}
        question={questionToDelete}
        isDeleting={isDeletingQuestion}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* ── Edit Question Modal ────────────────────────────────────────────── */}
      <EditQuestionModal
        visible={!!questionToEdit}
        question={questionToEdit}
        onClose={() => setQuestionToEdit(null)}
        onSaveSuccess={handleQuestionUpdated}
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
      borderRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      height: 40,
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
      fontSize: 14,
      paddingVertical: 0,
    },
    searchInputDisabled: {
      color: colors.textPlaceholder,
    },
    clearButton: {
      padding: 4,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 0,
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
      top: -3,
      right: -3,
      backgroundColor: colors.danger,
      borderRadius: 0,
      minWidth: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 3,
      borderWidth: 1,
      borderColor: colors.bg,
    },
    filterBadgeText: {
      color: "#FFFFFF",
      fontSize: 9.5,
      fontWeight: "800",
    },
    quickActiveFiltersRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 6,
      flexWrap: "wrap",
    },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 0,
      gap: 5,
    },
    activePillText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "600",
    },
    clearAllFiltersBtn: {
      paddingVertical: 3,
      paddingHorizontal: 5,
    },
    clearAllFiltersText: {
      color: colors.textMuted,
      fontSize: 11,
      textDecorationLine: "underline",
    },
    noticeBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 0,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      gap: 8,
    },
    noticeText: {
      flex: 1,
      color: colors.primary,
      fontSize: 11.5,
      lineHeight: 15,
    },
    filterPanel: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 0,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPanelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    filterPanelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    filterPanelTitle: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: "700",
    },
    resetFiltersText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
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
      borderRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 7,
      paddingVertical: 3,
      gap: 4,
    },
    selectedFilterChipText: {
      color: colors.text,
      fontSize: 10.5,
      maxWidth: 160,
    },
    applyFilterButton: {
      backgroundColor: colors.primary,
      borderRadius: 0,
      paddingVertical: 7,
      alignItems: "center",
      marginTop: 8,
    },
    applyFilterButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    resultsCountRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    resultsCountText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    sortTogglePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.cardSecondary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortToggleText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "700",
    },
    listContent: {
      paddingHorizontal: 14,
      paddingBottom: 72,
      gap: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 0,
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
      width: 48,
      height: 48,
    },
    thumbnailWrapper: {
      width: 48,
      height: 48,
      borderRadius: 0,
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
      backgroundColor: isDark
        ? "rgba(15, 23, 42, 0.88)"
        : "rgba(15, 23, 42, 0.75)",
      paddingVertical: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    imageTypeBadgeText: {
      color: isDark ? "#38BDF8" : "#0284C7",
      fontSize: 8,
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
      borderRadius: 0,
      padding: 1.5,
      zIndex: 2,
    },
    middleCol: {
      flex: 1,
      justifyContent: "center",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 8,
      gap: 2,
    },
    subjectRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    audioBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 0,
    },
    audioBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    colSubjectText: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.1,
      flexShrink: 1,
    },
    extractedSnippetText: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    extractedSnippetPlaceholder: {
      color: colors.textPlaceholder,
      fontStyle: "italic",
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
      width: 56,
      height: 56,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 16,
    },
    clearAllButton: {
      marginTop: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 0,
    },
    clearAllButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
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
