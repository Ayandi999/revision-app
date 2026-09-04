import neetData from "@/assets/syllabus/neet.json";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { MandatoryFieldsModal } from "@/components/MandatoryFieldsModal";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { insertIntoLocalDb } from "@/database/queries";
import { useImagePicker } from "@/hooks/useImagePicker";
import { AddQuestionFormData, OptionLetter } from "@/types/question";
import {
  SyllabusSchema,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
      const stillAvailable = getSubtopicsForTopics(
        syllabus,
        selectedSubject,
        remaining,
      );
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

  // ── Image pickers ───────────────────────────────────────────────────────
  const [questionImageUri, setQuestionImageUri] = useState<string | null>(null);
  const [solutionImageUri, setSolutionImageUri] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<
    "question" | "solution" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [isMissingModalVisible, setIsMissingModalVisible] = useState(false);

  const questionPicker = useImagePicker({ folder: "questions" });
  const solutionPicker = useImagePicker({ folder: "solutions" });

  const handleSelectCamera = async () => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (!target) return;

    const picker = target === "question" ? questionPicker : solutionPicker;
    const result = await picker.launchCamera();
    if (result.success) {
      if (target === "question") {
        setQuestionImageUri(result.uri);
      } else {
        setSolutionImageUri(result.uri);
      }
      console.log(
        `[${target === "question" ? "Question" : "Solution"} Image URI]:`,
        result.uri,
      );
    } else if (result.error !== "Camera cancelled.") {
      console.error(`[${target} Camera Error]:`, result.error);
    }
  };

  const handleSelectGallery = async () => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (!target) return;

    const picker = target === "question" ? questionPicker : solutionPicker;
    const result = await picker.launchGallery();
    if (result.success) {
      if (target === "question") {
        setQuestionImageUri(result.uri);
      } else {
        setSolutionImageUri(result.uri);
      }
      console.log(
        `[${target === "question" ? "Question" : "Solution"} Image URI]:`,
        result.uri,
      );
    } else if (result.error !== "Picker cancelled.") {
      console.error(`[${target} Gallery Error]:`, result.error);
    }
  };

  // ── Form reset ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setQuestionImageUri(null);
    setSolutionImageUri(null);
    setSelectedSubject(null);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    setSelectedType(QUESTION_TYPES[0]);
    setMcqSelected(null);
    setMsqSelected([]);
    setNatAnswer("");
    setPersonalNote("");
    setIsQuestionCollapsed(false);
    setIsSolutionCollapsed(true);
  };

  // ── Missing mandatory fields check ──────────────────────────────────────
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!questionImageUri) missing.push("Question image");
    if (!solutionImageUri) missing.push("Solution image");
    if (selectedType.key === "MCQ" && !mcqSelected)
      missing.push("Correct option");
    if (selectedType.key === "MSQ" && msqSelected.length === 0)
      missing.push("Correct option(s)");
    if (selectedType.key === "NAT" && !natAnswer.trim())
      missing.push("Numerical answer");
    if (!personalNote.trim()) missing.push("Personal note");
    return missing;
  };

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setMissingFieldsList(missing);
      setIsMissingModalVisible(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: AddQuestionFormData = {
        questionImageUri,
        subject: selectedSubject ?? null,
        topics: selectedTopics,
        subtopics: selectedSubtopics,
        solutionImageUri,
        questionType: selectedType.key,
        mcqAnswer: selectedType.key === "MCQ" ? mcqSelected : null,
        msqAnswer: selectedType.key === "MSQ" ? msqSelected : null,
        natAnswer: selectedType.key === "NAT" ? natAnswer.trim() : null,
        personalNote: personalNote.trim(),
      };

      const result = await insertIntoLocalDb(payload);
      if (result.success) {
        Alert.alert(
          "Question Saved",
          "The question has been added successfully!",
          [{ text: "OK", onPress: resetForm }],
        );
      } else {
        Alert.alert("Failed to Save", result.error);
      }
    } catch (err) {
      console.error("[handleSubmit] Error:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save question.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Ionicons name="layers-outline" size={12} color="#0739ed" />
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
            <Ionicons name="pricetag-outline" size={12} color="#9d00ff" />
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
            <Text style={styles.sectionLabel}>
              Question image <Text style={styles.mandatoryAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.iconBox, questionImageUri && styles.iconBoxFilled]}
              onPress={() => setPickerTarget("question")}
              disabled={questionPicker.isProcessing}
            >
              {questionPicker.isProcessing ? (
                <ActivityIndicator size="large" color="#0739ed" />
              ) : questionImageUri ? (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: questionImageUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.deleteCrossButton}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      setQuestionImageUri(null);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="camera-outline" size={68} color="#0739ed" />
              )}
            </TouchableOpacity>
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
                    <Ionicons name="book-outline" size={14} color="#0739ed" />
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
                <Text style={styles.hintSubtle}>
                  Pick at least 1 topic first
                </Text>
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
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.solutionCameraBox,
              solutionImageUri && styles.iconBoxFilled,
            ]}
            onPress={() => setPickerTarget("solution")}
            disabled={solutionPicker.isProcessing}
          >
            {solutionPicker.isProcessing ? (
              <ActivityIndicator size="small" color="#0739ed" />
            ) : solutionImageUri ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: solutionImageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.deleteCrossButton}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSolutionImageUri(null);
                  }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Ionicons name="camera-outline" size={46} color="#0739ed" />
                <Text style={styles.solutionCameraText}>
                  Add solution image{" "}
                  <Text style={styles.mandatoryAsterisk}>*</Text>
                </Text>
              </>
            )}
          </TouchableOpacity>

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
                <Text style={styles.selectedTypeDesc}>
                  {selectedType.label}
                </Text>
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
                      : "Select correct options"}{" "}
                    <Text style={styles.mandatoryAsterisk}>*</Text>
                  </Text>
                  <Text style={styles.answerHint}>
                    {selectedType.key === "MCQ"
                      ? "Pick 1 option"
                      : "One or more"}
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
                  <Text style={styles.sectionLabel}>
                    Enter numerical answer{" "}
                    <Text style={styles.mandatoryAsterisk}>*</Text>
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

          {/* Personal note */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>
              Personal note <Text style={styles.mandatoryAsterisk}>*</Text>
            </Text>
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

        {/* ── Submit Button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#1c1b1b" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#1c1b1b" />
              <Text style={styles.submitButtonText}>Add Question</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Custom styled modal for picking image source */}
      <ImagePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        title={
          pickerTarget === "question"
            ? "Add Question Image"
            : "Add Solution Image"
        }
        onSelectCamera={handleSelectCamera}
        onSelectGallery={handleSelectGallery}
      />

      {/* Custom styled modal for mandatory fields warning */}
      <MandatoryFieldsModal
        visible={isMissingModalVisible}
        onClose={() => setIsMissingModalVisible(false)}
        missingFields={missingFieldsList}
      />
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
    color: "#0739ed",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  mandatoryAsterisk: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "700",
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
    borderColor: "#0739ed88",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7, 57, 237, 0.04)",
  },
  solutionCameraBox: {
    width: "100%",
    height: 130,
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#0739ed88",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7, 57, 237, 0.04)",
    gap: 8,
  },
  solutionCameraText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  iconBoxFilled: {
    borderStyle: "solid",
    borderWidth: 1.5,
    borderColor: "rgba(7, 57, 237, 0.4)",
    padding: 0,
    overflow: "hidden",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  deleteCrossButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // ── Submit button ────────────────────────────────────────────────────────
  submitButton: {
    marginTop: 26,
    marginBottom: 20,
    backgroundColor: "#0739ed",
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#0739ed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  // ── Shared label/hint ────────────────────────────────────────────────────
  labelWithHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
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
    color: "#0739ed",
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
    backgroundColor: "rgba(7, 57, 237, 0.12)",
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
    borderColor: "#0739ed88",
    backgroundColor: "rgba(7, 57, 237, 0.08)",
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
    borderColor: "#0739ed",
    backgroundColor: "rgba(7, 57, 237, 0.12)",
  },
  optionCircleText: {
    color: "#D1D5DB",
    fontSize: 18,
    fontWeight: "700",
  },
  optionCircleTextSelected: {
    color: "#0739ed",
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
