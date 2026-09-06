import neetData from "@/assets/syllabus/neet.json";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import type { Question } from "@/database/schema";
import { backfillExtractedText } from "@/functions/backfillExtractedText";
import { isOcrSupported } from "@/functions/extractText";
import { searchQuestions, type SearchFilters } from "@/functions/searchQuestions";
import {
  SyllabusSchema,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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

const PAGE_SIZE = 20;

export default function SearchScreen() {
  // ─── Search & Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [syllabus] = useState<SyllabusSchema>(
    neetData as unknown as SyllabusSchema
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

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

  // ─── Image Zoom Modal State ───────────────────────────────────────────────
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState("Question Image");

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

  // Trigger search when query or filters change
  useEffect(() => {
    fetchResults(0, true);
  }, [fetchResults]);

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
  const renderQuestionCard = ({
    item,
    index,
  }: {
    item: Question;
    index: number;
  }) => {
    const subjColor = getSubjectColor(item.subject);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => {
          // TODO: Open full question detail view or review modal in future update
        }}
      >
        {/* Card Header: Subject, Type & Stats */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.subjectBadge,
                { backgroundColor: `${subjColor}20`, borderColor: `${subjColor}55` },
              ]}
            >
              <View
                style={[styles.subjectDot, { backgroundColor: subjColor }]}
              />
              <Text style={[styles.subjectText, { color: subjColor }]}>
                {item.subject}
              </Text>
            </View>

            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.questionType}</Text>
            </View>
          </View>

          {/* Correct / Incorrect mini stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.statText}>{item.correct}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={14} color="#EF4444" />
              <Text style={styles.statText}>{item.incorrect}</Text>
            </View>
          </View>
        </View>

        {/* Card Body: Thumbnail & Content Snippet */}
        <View style={styles.cardBody}>
          {item.questionImageUri ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.thumbnailWrapper}
              onPress={() => {
                setZoomImageUri(item.questionImageUri);
                setZoomTitle(`${item.subject} Question`);
              }}
            >
              <Image
                source={{ uri: item.questionImageUri }}
                style={styles.thumbnailImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.zoomOverlay}>
                <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.cardTextContent}>
            {/* Extracted OCR Text preview if available */}
            {item.extractedText ? (
              <View style={styles.ocrSnippetContainer}>
                <View style={styles.ocrLabelRow}>
                  <Ionicons name="text-outline" size={12} color="#94A3B8" />
                  <Text style={styles.ocrLabel}>Extracted Text</Text>
                </View>
                <Text style={styles.ocrTextSnippet} numberOfLines={2}>
                  {item.extractedText}
                </Text>
              </View>
            ) : null}

            {/* Personal Note if present */}
            {item.personalNote ? (
              <View style={styles.noteContainer}>
                <Ionicons name="document-text-outline" size={12} color="#F59E0B" />
                <Text style={styles.noteText} numberOfLines={2}>
                  {item.personalNote}
                </Text>
              </View>
            ) : null}

            {!item.extractedText && !item.personalNote ? (
              <Text style={styles.noTextNotice}>
                Question #{item.id} — image stored
              </Text>
            ) : null}
          </View>
        </View>

        {/* Card Footer: Topic Chips */}
        {item.topics && item.topics.length > 0 ? (
          <View style={styles.topicsFooter}>
            {item.topics.slice(0, 3).map((topic, i) => (
              <View key={i} style={styles.topicChip}>
                <Ionicons name="pricetag-outline" size={10} color="#94A3B8" />
                <Text style={styles.topicChipText} numberOfLines={1}>
                  {topic}
                </Text>
              </View>
            ))}
            {item.topics.length > 3 ? (
              <Text style={styles.moreTopicsText}>
                +{item.topics.length - 3} more
              </Text>
            ) : null}
          </View>
        ) : null}
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
      {/* ── Top Bar with Search & Filter Toggle ────────────────────────────── */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarWrapper}>
          <Ionicons
            name="search"
            size={18}
            color="#94A3B8"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by text, note, or subject..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
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
              activeFiltersCount > 0 || isFilterPanelOpen ? "#FFFFFF" : "#94A3B8"
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
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />
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
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Fetching questions...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="search-outline" size={40} color="#475569" />
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
              <ActivityIndicator size="small" color="#3B82F6" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1c1b1b",
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
    backgroundColor: "#262626",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#262626",
    borderWidth: 1,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonOpen: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  filterButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#1c1b1b",
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
    backgroundColor: "#1E293B",
    borderColor: "#3B82F6",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  activePillText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "500",
  },
  clearAllFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearAllFiltersText: {
    color: "#94A3B8",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: "#93C5FD",
    fontSize: 12,
    lineHeight: 16,
  },
  filterPanel: {
    backgroundColor: "#242424",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#374151",
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  resetFiltersText: {
    color: "#3B82F6",
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
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  selectedFilterChipText: {
    color: "#F1F5F9",
    fontSize: 11,
    maxWidth: 160,
  },
  applyFilterButton: {
    backgroundColor: "#3B82F6",
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
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#242424",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333333",
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  cardBody: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1c1b1b",
    borderWidth: 1,
    borderColor: "#374151",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  zoomOverlay: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    padding: 3,
  },
  cardTextContent: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  ocrSnippetContainer: {
    backgroundColor: "#1c1b1b",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#2d2d2d",
    gap: 3,
  },
  ocrLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ocrLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ocrTextSnippet: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#F59E0B",
    gap: 6,
  },
  noteText: {
    flex: 1,
    color: "#FDE68A",
    fontSize: 11,
    lineHeight: 15,
  },
  noTextNotice: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
  },
  topicsFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#2d2d2d",
    paddingTop: 8,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1b1b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  topicChipText: {
    color: "#94A3B8",
    fontSize: 11,
    maxWidth: 150,
  },
  moreTopicsText: {
    color: "#64748B",
    fontSize: 11,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
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
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  clearAllButton: {
    marginTop: 12,
    backgroundColor: "#3B82F6",
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
    color: "#94A3B8",
    fontSize: 12,
  },
  endOfResultsContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  endOfResultsText: {
    color: "#64748B",
    fontSize: 12,
  },
});
