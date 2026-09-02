import neetData from "@/assets/syllabus/neet.json";
import {
  SyllabusSchema,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface QuestionTypeOption {
  key: "MCQ" | "MSQ" | "NAT";
  label: string;
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUESTION_TYPES: QuestionTypeOption[] = [
  { key: "MCQ", label: "One Option is Correct" },
  { key: "MSQ", label: "Multiple Options are correct" },
  { key: "NAT", label: "numerical" },
];

const OPTIONS = ["A", "B", "C", "D"] as const;
type OptionLetter = (typeof OPTIONS)[number];

const AddQuestion = () => {
  const [selectedType, setSelectedType] = useState<QuestionTypeOption>(
    QUESTION_TYPES[0],
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Syllabus schema state (defaults to neetData, can be swapped or fetched from an API)
  const [syllabus] = useState<SyllabusSchema>(
    neetData as unknown as SyllabusSchema,
  );

  // Cascading Syllabus states
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

  // Dropdown open states
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);

  // Derived filtered lists
  const availableSubjects = useMemo(() => getSubjects(syllabus), [syllabus]);
  const availableTopics = useMemo(
    () => getTopics(syllabus, selectedSubject),
    [syllabus, selectedSubject],
  );
  const availableSubtopics = useMemo(
    () => getSubtopicsForTopics(syllabus, selectedSubject, selectedTopics),
    [syllabus, selectedSubject, selectedTopics],
  );

  // Cascading handlers
  const handleSelectSubject = (subj: string) => {
    setSelectedSubject(subj);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    setIsSubjectDropdownOpen(false);
  };

  const handleToggleTopic = (top: string) => {
    if (selectedTopics.includes(top)) {
      // Remove topic & any of its associated subtopics
      setSelectedTopics((prev) => prev.filter((t) => t !== top));
      const remainingTopics = selectedTopics.filter((t) => t !== top);
      const remainingAvailableSubtopics = getSubtopicsForTopics(
        syllabus,
        selectedSubject,
        remainingTopics,
      );
      setSelectedSubtopics((prev) =>
        prev.filter((sub) => remainingAvailableSubtopics.includes(sub)),
      );
    } else {
      setSelectedTopics((prev) => [...prev, top]);
    }
  };

  const handleRemoveTopic = (top: string) => {
    handleToggleTopic(top);
  };

  const handleToggleSubtopic = (subtop: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(subtop)
        ? prev.filter((s) => s !== subtop)
        : [...prev, subtop],
    );
  };

  const handleRemoveSubtopic = (subtop: string) => {
    setSelectedSubtopics((prev) => prev.filter((s) => s !== subtop));
  };

  // Solution answers
  const [mcqSelected, setMcqSelected] = useState<OptionLetter | null>(null);
  const [msqSelected, setMsqSelected] = useState<OptionLetter[]>([]);
  const [natAnswer, setNatAnswer] = useState("");

  const handleMsqToggle = (opt: OptionLetter) => {
    setMsqSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  };

  const [personalNote, setPersonalNote] = useState("");

  // Collapsible section states (Question is open, Solution is collapsed by default)
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  const [isSolutionCollapsed, setIsSolutionCollapsed] = useState(true);

  // Whenever the user switches to this tab, ensure Question is open and Solution is collapsed
  useFocusEffect(
    useCallback(() => {
      setIsQuestionCollapsed(false);
      setIsSolutionCollapsed(true);
    }, []),
  );

  const toggleQuestionSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsQuestionCollapsed((prev) => !prev);
  };

  const toggleSolutionSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSolutionCollapsed((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Add a new Question</Text>

        {/* ================= Question Section (Foldable) ================= */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.sectionHeader}
            onPress={toggleQuestionSection}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons
                name="help-circle-outline"
                size={18}
                color="#a6f63cff"
              />
              <Text style={styles.sectionHeaderTitle}>Question</Text>
            </View>
            <Ionicons
              name={isQuestionCollapsed ? "chevron-forward" : "chevron-down"}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {!isQuestionCollapsed && (
            <View style={styles.sectionBody}>
              {/* Camera Section */}
              <View style={styles.cameraSection}>
                <Text style={styles.sectionLabel}>Question image</Text>
                <View style={styles.iconBox}>
                  <Ionicons name="camera-outline" size={68} color="#a6f63cff" />
                </View>
              </View>

              {/* ================= Cascading Syllabus Dropdowns ================= */}

              {/* 1. Subject Dropdown */}
              <View style={styles.dropdownSection}>
                <Text style={styles.sectionLabel}>Subject</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.dropdownInput,
                    isSubjectDropdownOpen && styles.dropdownInputActive,
                  ]}
                  onPress={() => {
                    setIsSubjectDropdownOpen((prev) => !prev);
                    setIsTopicDropdownOpen(false);
                    setIsSubtopicDropdownOpen(false);
                  }}
                >
                  <View style={styles.dropdownInputValueContainer}>
                    {selectedSubject ? (
                      <View style={styles.selectedSyllabusPreview}>
                        <View style={styles.syllabusIconTag}>
                          <Ionicons
                            name="book-outline"
                            size={14}
                            color="#a6f63cff"
                          />
                        </View>
                        <Text style={styles.selectedTypeDesc}>
                          {selectedSubject}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>
                        Select Subject
                      </Text>
                    )}
                  </View>

                  <Ionicons
                    name={isSubjectDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={isSubjectDropdownOpen ? "#a6f63cff" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                {isSubjectDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.dropdownScrollContainer}
                      showsVerticalScrollIndicator={true}
                    >
                      {availableSubjects.map((subj, index) => {
                        const isSelected = selectedSubject === subj;
                        return (
                          <TouchableOpacity
                            key={subj}
                            activeOpacity={0.7}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                              index === availableSubjects.length - 1 &&
                                styles.lastDropdownItem,
                            ]}
                            onPress={() => handleSelectSubject(subj)}
                          >
                            <Text
                              style={[
                                styles.itemBadgeLabel,
                                isSelected && styles.itemBadgeLabelSelected,
                              ]}
                            >
                              {subj}
                            </Text>

                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color="#a6f63cff"
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 2. Topic Dropdown (Multi-select, Filtered by selected Subject) */}
              <View style={styles.dropdownSection}>
                <View style={styles.labelWithHint}>
                  <Text style={styles.sectionLabel}>Topics</Text>
                  {!selectedSubject ? (
                    <Text style={styles.hintSubtle}>Pick a subject first</Text>
                  ) : (
                    selectedTopics.length > 0 && (
                      <Text style={styles.badgeCounterText}>
                        {selectedTopics.length} selected
                      </Text>
                    )
                  )}
                </View>

                {/* Selected Topics Dotted Chips (removable) */}
                {selectedTopics.length > 0 && (
                  <View style={styles.chipRow}>
                    {selectedTopics.map((top) => (
                      <View key={top} style={styles.dottedChip}>
                        <Ionicons
                          name="layers-outline"
                          size={12}
                          color="#a6f63cff"
                        />
                        <Text style={styles.dottedChipText} numberOfLines={1}>
                          {top}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.6}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleRemoveTopic(top)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={15}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!selectedSubject}
                  style={[
                    styles.dropdownInput,
                    !selectedSubject && styles.dropdownInputDisabled,
                    isTopicDropdownOpen && styles.dropdownInputActive,
                  ]}
                  onPress={() => {
                    setIsTopicDropdownOpen((prev) => !prev);
                    setIsSubjectDropdownOpen(false);
                    setIsSubtopicDropdownOpen(false);
                  }}
                >
                  <View style={styles.dropdownInputValueContainer}>
                    <Text style={styles.dropdownPlaceholder}>
                      {!selectedSubject
                        ? "Select Subject first"
                        : selectedTopics.length > 0
                          ? `Add / remove topics (${selectedTopics.length} selected)`
                          : "Select Topics"}
                    </Text>
                  </View>

                  <Ionicons
                    name={isTopicDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={
                      !selectedSubject
                        ? "#4B5563"
                        : isTopicDropdownOpen
                          ? "#a6f63cff"
                          : "#9CA3AF"
                    }
                  />
                </TouchableOpacity>

                {isTopicDropdownOpen && selectedSubject && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.dropdownScrollContainer}
                      showsVerticalScrollIndicator={true}
                    >
                      {availableTopics.map((top, index) => {
                        const isSelected = selectedTopics.includes(top);
                        return (
                          <TouchableOpacity
                            key={top}
                            activeOpacity={0.7}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                              index === availableTopics.length - 1 &&
                                styles.lastDropdownItem,
                            ]}
                            onPress={() => handleToggleTopic(top)}
                          >
                            <Text
                              style={[
                                styles.itemBadgeLabel,
                                isSelected && styles.itemBadgeLabelSelected,
                              ]}
                            >
                              {top}
                            </Text>

                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={18}
                              color={isSelected ? "#a6f63cff" : "#6B7280"}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. Subtopic Dropdown (Multi-select, Filtered by selected Topics) */}
              <View style={styles.dropdownSection}>
                <View style={styles.labelWithHint}>
                  <Text style={styles.sectionLabel}>Subtopics</Text>
                  {selectedTopics.length === 0 ? (
                    <Text style={styles.hintSubtle}>
                      Pick at least 1 topic first
                    </Text>
                  ) : (
                    selectedSubtopics.length > 0 && (
                      <Text style={styles.badgeCounterText}>
                        {selectedSubtopics.length} selected
                      </Text>
                    )
                  )}
                </View>

                {/* Selected Subtopics Dotted Chips (removable) */}
                {selectedSubtopics.length > 0 && (
                  <View style={styles.chipRow}>
                    {selectedSubtopics.map((subtop) => (
                      <View key={subtop} style={styles.dottedChip}>
                        <Ionicons
                          name="pricetag-outline"
                          size={12}
                          color="#a6f63cff"
                        />
                        <Text style={styles.dottedChipText} numberOfLines={1}>
                          {subtop}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.6}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleRemoveSubtopic(subtop)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={15}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={selectedTopics.length === 0}
                  style={[
                    styles.dropdownInput,
                    selectedTopics.length === 0 && styles.dropdownInputDisabled,
                    isSubtopicDropdownOpen && styles.dropdownInputActive,
                  ]}
                  onPress={() => {
                    setIsSubtopicDropdownOpen((prev) => !prev);
                    setIsSubjectDropdownOpen(false);
                    setIsTopicDropdownOpen(false);
                  }}
                >
                  <View style={styles.dropdownInputValueContainer}>
                    <Text style={styles.dropdownPlaceholder}>
                      {selectedTopics.length === 0
                        ? "Select Topic(s) first"
                        : selectedSubtopics.length > 0
                          ? `Add / remove subtopics (${selectedSubtopics.length} selected)`
                          : "Select Subtopics"}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      isSubtopicDropdownOpen ? "chevron-up" : "chevron-down"
                    }
                    size={18}
                    color={
                      selectedTopics.length === 0
                        ? "#4B5563"
                        : isSubtopicDropdownOpen
                          ? "#a6f63cff"
                          : "#9CA3AF"
                    }
                  />
                </TouchableOpacity>

                {isSubtopicDropdownOpen && selectedTopics.length > 0 && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.dropdownScrollContainer}
                      showsVerticalScrollIndicator={true}
                    >
                      {availableSubtopics.map((subtop, index) => {
                        const isSelected = selectedSubtopics.includes(subtop);
                        return (
                          <TouchableOpacity
                            key={subtop}
                            activeOpacity={0.7}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                              index === availableSubtopics.length - 1 &&
                                styles.lastDropdownItem,
                            ]}
                            onPress={() => handleToggleSubtopic(subtop)}
                          >
                            <Text
                              style={[
                                styles.itemBadgeLabel,
                                isSelected && styles.itemBadgeLabelSelected,
                              ]}
                            >
                              {subtop}
                            </Text>

                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={18}
                              color={isSelected ? "#a6f63cff" : "#6B7280"}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ================= Solution Section (Foldable) ================= */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.sectionHeader}
            onPress={toggleSolutionSection}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="bulb-outline" size={18} color="#a6f63cff" />
              <Text style={styles.sectionHeaderTitle}>Solution</Text>
            </View>
            <Ionicons
              name={isSolutionCollapsed ? "chevron-forward" : "chevron-down"}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {!isSolutionCollapsed && (
            <View style={styles.sectionBody}>
              {/* Solution Image (Compact Camera Box) */}
              <View style={styles.solutionCameraBox}>
                <Ionicons name="camera-outline" size={46} color="#a6f63cff" />
                <Text style={styles.solutionCameraText}>
                  Add solution image
                </Text>
              </View>

              {/* Solution / Question Type Section */}
              <View style={styles.dropdownSection}>
                <Text style={styles.sectionLabel}>Solution type</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.dropdownInput,
                    isDropdownOpen && styles.dropdownInputActive,
                  ]}
                  onPress={() => setIsDropdownOpen((prev) => !prev)}
                >
                  <View style={styles.dropdownInputValueContainer}>
                    <View style={styles.selectedTypePreview}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {selectedType.key}
                        </Text>
                      </View>
                      <Text style={styles.selectedTypeDesc}>
                        {selectedType.label}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={isDropdownOpen ? "#a6f63cff" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {QUESTION_TYPES.map((item, index) => {
                      const isSelected = selectedType.key === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          activeOpacity={0.7}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                            index === QUESTION_TYPES.length - 1 &&
                              styles.lastDropdownItem,
                          ]}
                          onPress={() => {
                            setSelectedType(item);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <View
                              style={[
                                styles.typeBadge,
                                isSelected && styles.typeBadgeSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBadgeText,
                                  isSelected && styles.typeBadgeTextSelected,
                                ]}
                              >
                                {item.key}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.itemBadgeLabel,
                                isSelected && styles.itemBadgeLabelSelected,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color="#a6f63cff"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Dynamic Answer Section */}
              <View style={styles.answerSection}>
                {selectedType.key === "MCQ" && (
                  <>
                    <View style={styles.answerHeader}>
                      <Text style={styles.sectionLabel}>
                        Select correct option
                      </Text>
                      <Text style={styles.answerHint}>Pick 1 option</Text>
                    </View>
                    <View style={styles.optionsRow}>
                      {OPTIONS.map((opt) => {
                        const isSelected = mcqSelected === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            activeOpacity={0.7}
                            style={[
                              styles.optionCircle,
                              isSelected && styles.optionCircleSelected,
                            ]}
                            onPress={() => setMcqSelected(opt)}
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
                  </>
                )}

                {selectedType.key === "MSQ" && (
                  <>
                    <View style={styles.answerHeader}>
                      <Text style={styles.sectionLabel}>
                        Select correct options
                      </Text>
                      <Text style={styles.answerHint}>One or more</Text>
                    </View>
                    <View style={styles.optionsRow}>
                      {OPTIONS.map((opt) => {
                        const isSelected = msqSelected.includes(opt);
                        return (
                          <TouchableOpacity
                            key={opt}
                            activeOpacity={0.7}
                            style={[
                              styles.optionCircle,
                              isSelected && styles.optionCircleSelected,
                            ]}
                            onPress={() => handleMsqToggle(opt)}
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
                  </>
                )}

                {selectedType.key === "NAT" && (
                  <>
                    <View style={styles.answerHeader}>
                      <Text style={styles.sectionLabel}>
                        Enter numerical answer
                      </Text>
                      <Text style={styles.answerHint}>Exact value</Text>
                    </View>
                    <View style={styles.natInputContainer}>
                      <TextInput
                        style={styles.natInput}
                        placeholder="Type in your answer"
                        placeholderTextColor="#6B7280"
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={natAnswer}
                        onChangeText={setNatAnswer}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* Personal Note */}
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Personal note</Text>
                <View style={styles.noteInputContainer}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Write your explanation, key insights, or mistakes to avoid..."
                    placeholderTextColor="#6B7280"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={personalNote}
                    onChangeText={setPersonalNote}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddQuestion;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1b1b",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // clears the floating bottom tab bar
  },
  title: {
    color: "#a6f63cff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  collapsibleSection: {
    marginTop: 20,
    backgroundColor: "#222121",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cameraSection: {
    marginTop: 6,
    alignItems: "flex-start",
    gap: 10,
  },
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  iconBox: {
    width: "100%",
    height: 220,
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#a6f63c88",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(166, 246, 60, 0.04)",
  },
  dropdownSection: {
    marginTop: 24,
    gap: 12,
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262525",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownInputActive: {
    borderColor: "#a6f63c88",
  },
  dropdownInputValueContainer: {
    flex: 1,
    marginRight: 10,
  },
  dropdownPlaceholder: {
    color: "#6B7280",
    fontSize: 14,
  },
  selectedTypePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedTypeDesc: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownMenu: {
    backgroundColor: "#262525",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(166, 246, 60, 0.07)",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeBadge: {
    backgroundColor: "#1c1b1b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typeBadgeSelected: {
    borderColor: "#a6f63c88",
    backgroundColor: "rgba(166, 246, 60, 0.15)",
  },
  typeBadgeText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeBadgeTextSelected: {
    color: "#a6f63cff",
  },
  itemBadgeLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  itemBadgeLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  answerSection: {
    marginTop: 28,
    gap: 14,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerHint: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  optionCircle: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#262525",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCircleSelected: {
    borderColor: "#a6f63cff",
    backgroundColor: "rgba(166, 246, 60, 0.12)",
  },
  optionCircleText: {
    color: "#D1D5DB",
    fontSize: 18,
    fontWeight: "700",
  },
  optionCircleTextSelected: {
    color: "#a6f63cff",
  },
  natInputContainer: {
    backgroundColor: "#262525",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
  },
  natInput: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
  },
  solutionSection: {
    marginTop: 28,
    gap: 16,
  },
  solutionCameraBox: {
    width: "100%",
    height: 130,
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#a6f63c88",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(166, 246, 60, 0.04)",
    gap: 8,
  },
  solutionCameraText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  noteSection: {
    gap: 8,
  },
  noteLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  noteInputContainer: {
    backgroundColor: "#262525",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 110,
  },
  noteInput: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
  },
  dropdownInputDisabled: {
    opacity: 0.45,
  },
  dropdownScrollContainer: {
    maxHeight: 220,
  },
  labelWithHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintSubtle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400",
  },
  selectedSyllabusPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syllabusIconTag: {
    backgroundColor: "rgba(166, 246, 60, 0.12)",
    padding: 4,
    borderRadius: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  dottedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dotted",
    borderColor: "#a6f63c88",
    backgroundColor: "rgba(166, 246, 60, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dottedChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 220,
  },
  badgeCounterText: {
    color: "#a6f63cff",
    fontSize: 12,
    fontWeight: "600",
  },
});
