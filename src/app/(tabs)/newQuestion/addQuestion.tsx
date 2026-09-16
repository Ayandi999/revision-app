import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { MandatoryFieldsModal } from "@/components/MandatoryFieldsModal";
import { StatusModal, StatusModalType } from "@/components/StatusModal";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeColors } from "@/constants/theme";
import { resolveImageUri } from "@/functions/imageHelpers";
import { insertIntoLocalDb } from "@/functions/queries";
import { useImagePicker } from "@/hooks/useImagePicker";
import { AddQuestionFormData, OptionLetter } from "@/types/question";
import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import { AudioNoteField } from "@/components/audio/AudioNoteField";
import {
  hapticError,
  hapticImpactMedium,
  hapticSuccess,
  hapticWarning,
} from "@/functions/hapticFeedback";
import {
  SyllabusSchema,
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ── Question-type picker state ──────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<QuestionTypeOption>(
    QUESTION_TYPES[0],
  );
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // ── Syllabus state ──────────────────────────────────────────────────────
  const { syllabus } = useActiveExam();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

  // Reset selections when syllabus changes
  useEffect(() => {
    setSelectedSubject(null);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
  }, [syllabus]);

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
  const [questionImageUris, setQuestionImageUris] = useState<string[]>([]);
  const [solutionImageUris, setSolutionImageUris] = useState<string[]>([]);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("Image");
  const [pickerTarget, setPickerTarget] = useState<
    "question" | "solution" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [isMissingModalVisible, setIsMissingModalVisible] = useState(false);

  // ── Custom Status Alert Modal ───────────────────────────────────────────
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: StatusModalType;
    title: string;
    message: string;
    buttonText?: string;
    onClose?: () => void;
  }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const showStatusModal = (
    type: StatusModalType,
    title: string,
    message: string,
    buttonText: string = "Done",
    onCloseCallback?: () => void,
  ) => {
    setStatusModal({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onClose: onCloseCallback,
    });
  };

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
        setQuestionImageUris((prev) => [...prev, result.uri]);
      } else {
        setSolutionImageUris((prev) => [...prev, result.uri]);
      }
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
        setQuestionImageUris((prev) => [...prev, result.uri]);
      } else {
        setSolutionImageUris((prev) => [...prev, result.uri]);
      }
    } else if (result.error !== "Picker cancelled.") {
      console.error(`[${target} Gallery Error]:`, result.error);
    }
  };

  // ── Form reset ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setQuestionImageUris([]);
    setSolutionImageUris([]);
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
    if (questionImageUris.length === 0) missing.push("Question image (at least 1)");
    // Solution image is now optional per user request
    if (selectedType.key === "MCQ" && !mcqSelected)
      missing.push("Correct option");
    if (selectedType.key === "MSQ" && msqSelected.length === 0)
      missing.push("Correct option(s)");
    if (selectedType.key === "NAT" && !natAnswer.trim())
      missing.push("Numerical answer");
    // Personal notes is now optional per user request
    return missing;
  };

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    hapticImpactMedium();
    const missing = getMissingFields();
    if (missing.length > 0) {
      hapticWarning();
      setMissingFieldsList(missing);
      setIsMissingModalVisible(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: AddQuestionFormData = {
        questionImageUri: questionImageUris[0] ?? null,
        questionImageUris,
        subject: selectedSubject ?? null,
        topics: selectedTopics,
        subtopics: selectedSubtopics,
        solutionImageUri: solutionImageUris[0] ?? null,
        solutionImageUris,
        questionType: selectedType.key,
        mcqAnswer: selectedType.key === "MCQ" ? mcqSelected : null,
        msqAnswer: selectedType.key === "MSQ" ? msqSelected : null,
        natAnswer: selectedType.key === "NAT" ? natAnswer.trim() : null,
        personalNote: personalNote.trim() ? personalNote.trim() : null,
      };

      const result = await insertIntoLocalDb(payload);
      if (result.success) {
        hapticSuccess();
        showStatusModal(
          "success",
          "Question Saved!",
          "The question has been added to your revision bank successfully.",
          "Done",
          resetForm,
        );
      } else {
        hapticError();
        showStatusModal(
          "error",
          "Failed to Save",
          result.error || "Could not save the question to the database.",
          "Try Again",
        );
      }
    } catch (err) {
      hapticError();
      console.error("[handleSubmit] Error:", err);
      showStatusModal(
        "error",
        "Error",
        err instanceof Error ? err.message : "Failed to save question.",
        "Dismiss",
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
            <Ionicons name="layers-outline" size={11} color="#14B8A6" />
            <Text style={styles.dottedChipText} numberOfLines={1}>
              {top}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => handleToggleTopic(top)}
            >
              <Ionicons name="close-circle" size={13} color="#9CA3AF" />
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
            <Ionicons name="pricetag-outline" size={11} color="#14B8A6" />
            <Text style={styles.dottedChipText} numberOfLines={1}>
              {subtop}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => handleToggleSubtopic(subtop)}
            >
              <Ionicons name="close-circle" size={13} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Add Question</Text>
        <Text style={styles.titleSubtext}>Capture and categorize a new problem</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Question Section ─────────────────────────────────────────── */}
        <CollapsibleSection
          title="Question"
          icon="help-circle-outline"
          isCollapsed={isQuestionCollapsed}
          onToggle={() => animatedToggle(setIsQuestionCollapsed)}
          accentColor="#14B8A6"
        >
          {/* Question image placeholder / Multi-image strip */}
          <View style={styles.cameraSection}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>
                Question {questionImageUris.length > 1 ? "images" : "image"}{" "}
                <Text style={styles.mandatoryAsterisk}>*</Text>
              </Text>
              {questionImageUris.length > 0 && (
                <Text style={styles.imageCountBadge}>
                  {questionImageUris.length} {questionImageUris.length === 1 ? "page" : "pages"}
                </Text>
              )}
            </View>

            {questionImageUris.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.iconBox}
                onPress={() => setPickerTarget("question")}
                disabled={questionPicker.isProcessing}
              >
                {questionPicker.isProcessing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={38} color="#3B82F6" />
                    <Text style={styles.emptyPickerHint}>Tap to add question image</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.multiImageScroll}
              >
                {questionImageUris.map((uri, idx) => {
                  const displayUri = resolveImageUri(uri);
                  return (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    activeOpacity={0.85}
                    style={styles.multiImageCard}
                    onPress={() => {
                      setZoomImageUri(displayUri);
                      setZoomTitle(`Question Image ${idx + 1}`);
                    }}
                  >
                    <Image source={{ uri: displayUri! }} style={styles.multiImageThumb} contentFit="cover" />
                    <View style={styles.pageNumberBadge}>
                      <Text style={styles.pageNumberText}>#{idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.multiImageDeleteBtn}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        setQuestionImageUris((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" style={styles.multiImageCloseIcon} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addMoreCard}
                  activeOpacity={0.75}
                  onPress={() => setPickerTarget("question")}
                  disabled={questionPicker.isProcessing}
                >
                  {questionPicker.isProcessing ? (
                    <ActivityIndicator size="small" color="#60A5FA" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color="#60A5FA" />
                      <Text style={styles.addMoreText}>+ Add page</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
                    <Ionicons name="book-outline" size={14} color="#14B8A6" />
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
          accentColor="#3B82F6"
        >
          {/* Solution image placeholder / Multi-image strip */}
          <View style={styles.cameraSection}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.solutionCameraText}>
                Solution {solutionImageUris.length > 1 ? "images" : "image"}
              </Text>
              {solutionImageUris.length > 0 && (
                <Text style={styles.imageCountBadge}>
                  {solutionImageUris.length} {solutionImageUris.length === 1 ? "page" : "pages"}
                </Text>
              )}
            </View>

            {solutionImageUris.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.solutionCameraBox}
                onPress={() => setPickerTarget("solution")}
                disabled={solutionPicker.isProcessing}
              >
                {solutionPicker.isProcessing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={30} color="#3B82F6" />
                    <Text style={styles.solutionCameraText}>
                      Add solution image
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.multiImageScroll}
              >
                {solutionImageUris.map((uri, idx) => {
                  const displayUri = resolveImageUri(uri);
                  return (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    activeOpacity={0.85}
                    style={styles.multiImageCard}
                    onPress={() => {
                      setZoomImageUri(displayUri);
                      setZoomTitle(`Solution Image ${idx + 1}`);
                    }}
                  >
                    <Image source={{ uri: displayUri! }} style={styles.multiImageThumb} contentFit="cover" />
                    <View style={styles.pageNumberBadge}>
                      <Text style={styles.pageNumberText}>#{idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.multiImageDeleteBtn}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSolutionImageUris((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" style={styles.multiImageCloseIcon} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addMoreCard}
                  activeOpacity={0.75}
                  onPress={() => setPickerTarget("solution")}
                  disabled={solutionPicker.isProcessing}
                >
                  {solutionPicker.isProcessing ? (
                    <ActivityIndicator size="small" color="#60A5FA" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color="#60A5FA" />
                      <Text style={styles.addMoreText}>+ Add page</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
                    placeholderTextColor={colors.textPlaceholder}
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

          {/* Personal voice note */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>
              Voice note <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <AudioNoteField
              value={personalNote}
              onChange={(val) => setPersonalNote(val || "")}
            />
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
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
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

      {/* Custom styled modal for feedback alerts */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        buttonText={statusModal.buttonText}
        onClose={() => {
          const callback = statusModal.onClose;
          setStatusModal((prev) => ({ ...prev, visible: false }));
          if (callback) {
            callback();
          }
        }}
      />

      {/* Embedded Zoom Modal for image preview */}
      <ImageZoomModal
        visible={!!zoomImageUri}
        imageUri={zoomImageUri}
        title={zoomTitle}
        onClose={() => setZoomImageUri(null)}
      />
    </SafeAreaView>
  );
};

export default AddQuestion;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 90, // clears the floating bottom tab bar
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    titleSubtext: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "400",
      marginTop: 3,
    },
    titleBlock: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
    },
    mandatoryAsterisk: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "700",
    },
    // ── Camera placeholders ──────────────────────────────────────────────────
    cameraSection: {
      marginTop: 6,
      alignItems: "flex-start",
      gap: 8,
    },
    iconBox: {
      width: "100%",
      height: 125,
      borderWidth: 1.5,
      borderStyle: "dotted",
      borderColor: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(37, 99, 235, 0.3)",
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.04)" : "rgba(37, 99, 235, 0.04)",
      gap: 8,
    },
    emptyPickerHint: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    imageCountBadge: {
      color: isDark ? "#14B8A6" : "#0D9488",
      fontSize: 11,
      fontWeight: "700",
      backgroundColor: isDark ? "rgba(20, 184, 166, 0.12)" : "rgba(13, 148, 136, 0.12)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    multiImageScroll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    multiImageCard: {
      width: 105,
      height: 105,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.cardSecondary,
    },
    multiImageThumb: {
      width: "100%",
      height: "100%",
    },
    pageNumberBadge: {
      position: "absolute",
      bottom: 5,
      left: 5,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    pageNumberText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },
    multiImageDeleteBtn: {
      position: "absolute",
      top: 3,
      right: 3,
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    multiImageCloseIcon: {
      textShadowColor: isDark ? "rgba(0, 0, 0, 0.85)" : "rgba(0, 0, 0, 0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    addMoreCard: {
      width: 85,
      height: 105,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: "dotted",
      borderColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.35)",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.05)" : "rgba(37, 99, 235, 0.05)",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    addMoreText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "600",
    },
    solutionCameraBox: {
      width: "100%",
      height: 95,
      borderWidth: 1.5,
      borderStyle: "dotted",
      borderColor: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(37, 99, 235, 0.3)",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.04)" : "rgba(37, 99, 235, 0.04)",
      gap: 6,
    },
    solutionCameraText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 0.1,
    },
    optionalLabel: {
      color: colors.textPlaceholder,
      fontSize: 11.5,
      fontWeight: "400",
    },
    // ── Submit button ────────────────────────────────────────────────────────
    submitButton: {
      marginTop: 20,
      marginBottom: 24,
      backgroundColor: colors.primary,
      borderRadius: 12,
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    // ── Shared label/hint ────────────────────────────────────────────────────
    labelWithHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 0.1,
    },
    hintSubtle: {
      color: colors.textPlaceholder,
      fontSize: 11.5,
      fontWeight: "400",
    },
    badgeCounterText: {
      color: colors.primary,
      fontSize: 11.5,
      fontWeight: "600",
    },
    // ── Subject preview inside trigger ──────────────────────────────────────
    selectedSyllabusPreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    syllabusIconTag: {
      backgroundColor: isDark ? "rgba(20, 184, 166, 0.12)" : "rgba(13, 148, 136, 0.12)",
      padding: 3.5,
      borderRadius: 6,
    },
    selectedTypeDesc: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
    },
    // ── Question-type badge inside trigger ───────────────────────────────────
    selectedTypePreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    typeBadge: {
      backgroundColor: colors.cardSecondary,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBadgeText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    // ── Chips ────────────────────────────────────────────────────────────────
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 4,
    },
    dottedChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderStyle: "dotted",
      borderColor: isDark ? "rgba(20, 184, 166, 0.4)" : "rgba(13, 148, 136, 0.4)",
      backgroundColor: isDark ? "rgba(20, 184, 166, 0.08)" : "rgba(13, 148, 136, 0.08)",
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 8,
    },
    dottedChipText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "500",
      maxWidth: 200,
    },
    // ── Answer section ───────────────────────────────────────────────────────
    answerSection: {
      marginTop: 16,
      gap: 10,
    },
    answerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    answerHint: {
      color: colors.textPlaceholder,
      fontSize: 11.5,
      fontWeight: "500",
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    optionCircle: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionCircleSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionCircleText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "700",
    },
    optionCircleTextSelected: {
      color: colors.primary,
    },
    // ── NAT input ────────────────────────────────────────────────────────────
    natInputContainer: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 44,
      justifyContent: "center",
    },
    natInput: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      padding: 0,
    },
    // ── Personal note ────────────────────────────────────────────────────────
    noteSection: {
      gap: 6,
      marginTop: 14,
    },
    noteLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    noteInputContainer: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 85,
    },
    noteInput: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      padding: 0,
    },
  });
