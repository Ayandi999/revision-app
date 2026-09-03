import neetData from "@/assets/syllabus/neet.json";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { OptionLetter } from "@/types/question";
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

// ─── Constants ────────────────────────────────────────────────────────────────

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QuestionTypeOption {
  key: "MCQ" | "MSQ" | "NAT";
  label: string;
}

const QUESTION_TYPES: QuestionTypeOption[] = [
  { key: "MCQ", label: "One Option is Correct" },
  { key: "MSQ", label: "Multiple Options are correct" },
  { key: "NAT", label: "numerical" },
];

const QUESTION_TYPE_ITEMS = QUESTION_TYPES.map((t) => ({
  value: t.key,
  badge: t.key,
  label: t.label,
}));

const OPTIONS = ["A", "B", "C", "D"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Runs a LayoutAnimation then toggles a boolean setter */
function animatedToggle(setter: React.Dispatch<React.SetStateAction<boolean>>) {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setter((prev) => !prev);
}

// ─── Component ────────────────────────────────────────────────────────────────

const AddQuestion = () => {
  // ── Question-type picker state ──────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<QuestionTypeOption>(
    QUESTION_TYPES[0],
  );
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // ── Syllabus state ──────────────────────────────────────────────────────
  const [syllabus] = useState<SyllabusSchema>(
    neetData as unknown as SyllabusSchema,
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

  // ── Dropdown open/close state ───────────────────────────────────────────
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);

  const closeAllDropdowns = useCallback(() => {
    setIsSubjectDropdownOpen(false);
    setIsTopicDropdownOpen(false);
    setIsSubtopicDropdownOpen(false);
  }, []);

  // ── Derived syllabus lists ──────────────────────────────────────────────
  const availableSubjects = useMemo(() => getSubjects(syllabus), [syllabus]);
  const availableTopics = useMemo(
    () => getTopics(syllabus, selectedSubject),
    [syllabus, selectedSubject],
  );
  const availableSubtopics = useMemo(
    () => getSubtopicsForTopics(syllabus, selectedSubject, selectedTopics),
    [syllabus, selectedSubject, selectedTopics],
  );

  // ── Syllabus handlers ───────────────────────────────────────────────────
  const handleSelectSubject = (subj: string) => {
    setSelectedSubject(subj);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    setIsSubjectDropdownOpen(false);
  };

  const handleToggleTopic = (top: string) => {
    if (selectedTopics.includes(top)) {
      const remaining = selectedTopics.filter((t) => t !== top);
      setSelectedTopics(remaining);
      const stillAvailable = getSubtopicsForTopics(syllabus, selectedSubject, remaining);
      setSelectedSubtopics((prev) =>
        prev.filter((sub) => stillAvailable.includes(sub)),
      );
    } else {
      setSelectedTopics((prev) => [...prev, top]);
    }
  };

  const handleToggleSubtopic = (subtop: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(subtop)
        ? prev.filter((s) => s !== subtop)
        : [...prev, subtop],
    );
  };

  // ── Answer state ────────────────────────────────────────────────────────
  const [mcqSelected, setMcqSelected] = useState<OptionLetter | null>(null);
  const [msqSelected, setMsqSelected] = useState<OptionLetter[]>([]);
  const [natAnswer, setNatAnswer] = useState("");
  const [personalNote, setPersonalNote] = useState("");

  const handleMsqToggle = (opt: OptionLetter) => {
    setMsqSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  };

  // ── Collapsible section state ───────────────────────────────────────────
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  const [isSolutionCollapsed, setIsSolutionCollapsed] = useState(true);

  // Reset sections whenever the user navigates to this tab
  useFocusEffect(
    useCallback(() => {
      setIsQuestionCollapsed(false);
      setIsSolutionCollapsed(true);
    }, []),
  );

  // ─── Chip renderers ──────────────────────────────────────────────────────

  const topicChips =
    selectedTopics.length > 0 ? (
      <View style={styles.chipRow}>
        {selectedTopics.map((top) => (
          <View key={top} style={styles.dottedChip}>
            <Ionicons name="layers-outline" size={12} color="#a6f63cff" />
            <Text style={styles.dottedChipText} numberOfLines={1}>
              {top}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => handleToggleTopic(top)}
            >
              <Ionicons name="close-circle" size={15} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ) : null;

  const subtopicChips =
    selectedSubtopics.length > 0 ? (
      <View style={styles.chipRow}>
        {selectedSubtopics.map((subtop) => (
          <View key={subtop} style={styles.dottedChip}>
            <Ionicons name="pricetag-outline" size={12} color="#a6f63cff" />
            <Text style={styles.dottedChipText} numberOfLines={1}>
              {subtop}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => handleToggleSubtopic(subtop)}
            >
              <Ionicons name="close-circle" size={15} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Add a new Question</Text>

        {/* ── Question Section ─────────────────────────────────────────── */}
        <CollapsibleSection
          title="Question"
          icon="help-circle-outline"
          isCollapsed={isQuestionCollapsed}
          onToggle={() => animatedToggle(setIsQuestionCollapsed)}
        >
          {/* Question image placeholder */}
          <View style={styles.cameraSection}>
            <Text style={styles.sectionLabel}>Question image</Text>
            <View style={styles.iconBox}>
              <Ionicons name="camera-outline" size={68} color="#a6f63cff" />
            </View>
          </View>

          {/* Subject */}
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
            placeholder="Select Subject"
            selectedPreview={
              selectedSubject ? (
                <View style={styles.selectedSyllabusPreview}>
                  <View style={styles.syllabusIconTag}>
                    <Ionicons
                      name="book-outline"
                      size={14}
                      color="#a6f63cff"
                    />
                  </View>
                  <Text style={styles.selectedTypeDesc}>{selectedSubject}</Text>
                </View>
              ) : undefined
            }
          />

          {/* Topics */}
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
                  ? `Add / remove topics (${selectedTopics.length} selected)`
                  : "Select Topics"
            }
            hint={
              !selectedSubject ? (
                <Text style={styles.hintSubtle}>Pick a subject first</Text>
              ) : selectedTopics.length > 0 ? (
                <Text style={styles.badgeCounterText}>
                  {selectedTopics.length} selected
                </Text>
              ) : undefined
            }
            chips={topicChips}
          />

          {/* Subtopics */}
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
                  ? `Add / remove subtopics (${selectedSubtopics.length} selected)`
                  : "Select Subtopics"
            }
            hint={
              selectedTopics.length === 0 ? (
                <Text style={styles.hintSubtle}>Pick at least 1 topic first</Text>
              ) : selectedSubtopics.length > 0 ? (
                <Text style={styles.badgeCounterText}>
                  {selectedSubtopics.length} selected
                </Text>
              ) : undefined
            }
            chips={subtopicChips}
          />
        </CollapsibleSection>

        {/* ── Solution Section ─────────────────────────────────────────── */}
        <CollapsibleSection
          title="Solution"
          icon="bulb-outline"
          isCollapsed={isSolutionCollapsed}
          onToggle={() => animatedToggle(setIsSolutionCollapsed)}
        >
          {/* Solution image placeholder */}
          <View style={styles.solutionCameraBox}>
            <Ionicons name="camera-outline" size={46} color="#a6f63cff" />
            <Text style={styles.solutionCameraText}>Add solution image</Text>
          </View>

          {/* Question / Answer type dropdown */}
          <SyllabusDropdown
            label="Solution type"
            isOpen={isTypeDropdownOpen}
            onToggleOpen={() => setIsTypeDropdownOpen((p) => !p)}
            items={QUESTION_TYPE_ITEMS}
            selectedValues={[selectedType.key]}
            onSelectItem={(val) => {
              const found = QUESTION_TYPES.find((t) => t.key === val);
              if (found) setSelectedType(found);
              setIsTypeDropdownOpen(false);
            }}
            placeholder="Select type"
            selectedPreview={
              <View style={styles.selectedTypePreview}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{selectedType.key}</Text>
                </View>
                <Text style={styles.selectedTypeDesc}>{selectedType.label}</Text>
              </View>
            }
          />

          {/* Answer input — varies by type */}
          <View style={styles.answerSection}>
            {/* MCQ & MSQ share the same A/B/C/D grid */}
            {(selectedType.key === "MCQ" || selectedType.key === "MSQ") && (
              <>
                <View style={styles.answerHeader}>
                  <Text style={styles.sectionLabel}>
                    {selectedType.key === "MCQ"
                      ? "Select correct option"
                      : "Select correct options"}
                  </Text>
                  <Text style={styles.answerHint}>
                    {selectedType.key === "MCQ" ? "Pick 1 option" : "One or more"}
                  </Text>
                </View>
                <View style={styles.optionsRow}>
                  {OPTIONS.map((opt) => {
                    const isSelected =
                      selectedType.key === "MCQ"
                        ? mcqSelected === opt
                        : msqSelected.includes(opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        activeOpacity={0.7}
                        style={[
                          styles.optionCircle,
                          isSelected && styles.optionCircleSelected,
                        ]}
                        onPress={() =>
                          selectedType.key === "MCQ"
                            ? setMcqSelected(opt)
                            : handleMsqToggle(opt)
                        }
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
                  <Text style={styles.sectionLabel}>Enter numerical answer</Text>
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

          {/* Personal note */}
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
        </CollapsibleSection>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddQuestion;

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // ── Camera placeholders ──────────────────────────────────────────────────
  cameraSection: {
    marginTop: 6,
    alignItems: "flex-start",
    gap: 10,
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
  // ── Shared label/hint ────────────────────────────────────────────────────
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  hintSubtle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400",
  },
  badgeCounterText: {
    color: "#a6f63cff",
    fontSize: 12,
    fontWeight: "600",
  },
  // ── Subject preview inside trigger ──────────────────────────────────────
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
  selectedTypeDesc: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  // ── Question-type badge inside trigger ───────────────────────────────────
  selectedTypePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeBadge: {
    backgroundColor: "#1c1b1b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typeBadgeText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // ── Chips ────────────────────────────────────────────────────────────────
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
  // ── Answer section ───────────────────────────────────────────────────────
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
  // ── NAT input ────────────────────────────────────────────────────────────
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
  // ── Personal note ────────────────────────────────────────────────────────
  noteSection: {
    gap: 8,
    marginTop: 24,
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
});
