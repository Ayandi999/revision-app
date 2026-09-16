import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { ImageZoomModal } from "@/components/revision/ImageZoomModal";
import { SyllabusDropdown } from "@/components/SyllabusDropdown";
import { AudioNoteField } from "@/components/audio/AudioNoteField";
import { useActiveExam } from "@/context/ExamContext";
import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import { resolveImageUri } from "@/functions/imageHelpers";
import { updateQuestionInLocalDb } from "@/functions/queries";
import { hapticError, hapticSuccess } from "@/functions/hapticFeedback";
import { useImagePicker } from "@/hooks/useImagePicker";
import type { OptionLetter, QuestionType } from "@/types/question";
import {
  getSubjects,
  getSubtopicsForTopics,
  getTopics,
} from "@/types/syllabus";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface EditQuestionModalProps {
  visible: boolean;
  question: Question | null;
  onClose: () => void;
  onSaveSuccess: (updatedQuestion: Question) => void;
}

const QUESTION_TYPES: { key: QuestionType; label: string }[] = [
  { key: "MCQ", label: "One Option is Correct" },
  { key: "MSQ", label: "Multiple Options are correct" },
  { key: "NAT", label: "Numerical" },
];

const QUESTION_TYPE_ITEMS = QUESTION_TYPES.map((t) => ({
  value: t.key,
  badge: t.key,
  label: t.label,
}));

const OPTIONS: OptionLetter[] = ["A", "B", "C", "D"];

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  visible,
  question,
  onClose,
  onSaveSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { syllabus } = useActiveExam();

  // ── Form State ────────────────────────────────────────────────────────────
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<QuestionType>("MCQ");
  const [mcqSelected, setMcqSelected] = useState<OptionLetter | null>(null);
  const [msqSelected, setMsqSelected] = useState<OptionLetter[]>([]);
  const [natAnswer, setNatAnswer] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [questionImageUris, setQuestionImageUris] = useState<string[]>([]);
  const [solutionImageUris, setSolutionImageUris] = useState<string[]>([]);

  // ── Dropdown Open/Close ───────────────────────────────────────────────────
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // ── Collapsible Sections ──────────────────────────────────────────────────
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  const [isSolutionCollapsed, setIsSolutionCollapsed] = useState(false);

  // ── Media & Zoom Modal ────────────────────────────────────────────────────
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("Image");
  const [pickerTarget, setPickerTarget] = useState<
    "question" | "solution" | null
  >(null);

  // ── UI / Saving State ─────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const questionPicker = useImagePicker({ folder: "questions" });
  const solutionPicker = useImagePicker({ folder: "solutions" });

  // ── Initialize Form when Question Changes ─────────────────────────────────
  useEffect(() => {
    if (question && visible) {
      setSelectedSubject(question.subject || null);
      setSelectedTopics(
        Array.isArray(question.topics) ? [...question.topics] : [],
      );
      setSelectedSubtopics(
        Array.isArray(question.subtopics) ? [...question.subtopics] : [],
      );
      setSelectedType(
        (question.questionType as QuestionType) || "MCQ",
      );
      setMcqSelected(
        (question.mcqAnswer as OptionLetter) || null,
      );
      setMsqSelected(
        Array.isArray(question.msqAnswer)
          ? (question.msqAnswer as OptionLetter[])
          : [],
      );
      setNatAnswer(question.natAnswer || "");
      setPersonalNote(question.personalNote || "");
      setExtractedText(question.extractedText || "");

      // Normalize question images
      const qImgs =
        Array.isArray(question.questionImageUris) &&
        question.questionImageUris.length > 0
          ? [...question.questionImageUris]
          : question.questionImageUri
            ? [question.questionImageUri]
            : [];
      setQuestionImageUris(qImgs);

      // Normalize solution images
      const sImgs =
        Array.isArray(question.solutionImageUris) &&
        question.solutionImageUris.length > 0
          ? [...question.solutionImageUris]
          : question.solutionImageUri
            ? [question.solutionImageUri]
            : [];
      setSolutionImageUris(sImgs);

      setErrorMessage(null);
      setIsSubjectDropdownOpen(false);
      setIsTopicDropdownOpen(false);
      setIsSubtopicDropdownOpen(false);
      setIsTypeDropdownOpen(false);
    }
  }, [question, visible]);

  // ── Derived Syllabus Options ──────────────────────────────────────────────
  const availableSubjects = useMemo(() => getSubjects(syllabus), [syllabus]);
  const availableTopics = useMemo(
    () => getTopics(syllabus, selectedSubject),
    [syllabus, selectedSubject],
  );
  const availableSubtopics = useMemo(
    () => getSubtopicsForTopics(syllabus, selectedSubject, selectedTopics),
    [syllabus, selectedSubject, selectedTopics],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  const handleMsqToggle = (opt: OptionLetter) => {
    setMsqSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  };

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
    }
  };

  // ── Save Changes Handler ──────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    if (!question) return;

    // Validation
    if (!selectedSubject || !selectedSubject.trim()) {
      setErrorMessage("Please select a subject.");
      return;
    }

    if (selectedType === "MCQ" && !mcqSelected) {
      setErrorMessage("Please select the correct option for MCQ.");
      return;
    }

    if (selectedType === "MSQ" && msqSelected.length === 0) {
      setErrorMessage("Please select at least one option for MSQ.");
      return;
    }

    if (selectedType === "NAT" && !natAnswer.trim()) {
      setErrorMessage("Please enter the numerical answer for NAT.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const result = await updateQuestionInLocalDb(question.id, {
        subject: selectedSubject.trim(),
        topics: selectedTopics,
        subtopics: selectedSubtopics,
        questionType: selectedType,
        questionImageUris,
        solutionImageUris,
        mcqAnswer: selectedType === "MCQ" ? mcqSelected : null,
        msqAnswer: selectedType === "MSQ" ? msqSelected : null,
        natAnswer: selectedType === "NAT" ? natAnswer.trim() : null,
        personalNote: personalNote.trim() ? personalNote.trim() : null,
        extractedText: extractedText.trim() ? extractedText.trim() : null,
      });

      if (result.success && result.data) {
        hapticSuccess();
        onSaveSuccess(result.data);
        onClose();
      } else {
        hapticError();
        setErrorMessage(result.error || "Failed to update question.");
      }
    } catch (err) {
      hapticError();
      console.error("[EditQuestionModal] Save error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!question) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg }]}
        edges={["top", "bottom"]}
      >
        {/* ── Top Header Bar ────────────────────────────────────────────── */}
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.18)"
                    : "rgba(59, 130, 246, 0.12)",
                },
              ]}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Edit Question
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textMuted }]}
              >
                Modify details, answers, or OCR text
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
            activeOpacity={0.7}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.errorBg,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* ── Scrollable Form Body ──────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Question & Syllabus */}
          <CollapsibleSection
            title="Question & Syllabus"
            icon="help-circle-outline"
            isCollapsed={isQuestionCollapsed}
            onToggle={() => setIsQuestionCollapsed((p) => !p)}
            accentColor="#14B8A6"
          >
            {/* Question Images */}
            <View style={styles.fieldBlock}>
              <View style={styles.sectionLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Question Images
                </Text>
                {questionImageUris.length > 0 && (
                  <Text
                    style={[
                      styles.imageCountBadge,
                      { color: colors.textMuted },
                    ]}
                  >
                    {questionImageUris.length}{" "}
                    {questionImageUris.length === 1 ? "page" : "pages"}
                  </Text>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageScrollRow}
              >
                {questionImageUris.map((uri, idx) => {
                  const displayUri = resolveImageUri(uri);
                  return (
                    <TouchableOpacity
                      key={`${uri}-${idx}`}
                      activeOpacity={0.85}
                      style={[
                        styles.imageCard,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        setZoomImageUri(displayUri);
                        setZoomTitle(`Question Image ${idx + 1}`);
                      }}
                    >
                      <Image
                        source={{ uri: displayUri! }}
                        style={styles.imageThumb}
                        contentFit="cover"
                      />
                      <View style={styles.pageNumberBadge}>
                        <Text style={styles.pageNumberText}>#{idx + 1}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.imageDeleteBtn}
                        activeOpacity={0.8}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setQuestionImageUris((prev) =>
                            prev.filter((_, i) => i !== idx),
                          );
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.addImageCard,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setPickerTarget("question")}
                  disabled={questionPicker.isProcessing}
                >
                  {questionPicker.isProcessing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.addImageText,
                          { color: colors.primary },
                        ]}
                      >
                        + Add page
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
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
              placeholder="Select Subject"
              selectedPreview={
                selectedSubject ? (
                  <View style={styles.selectedSyllabusPreview}>
                    <Ionicons name="book-outline" size={14} color="#14B8A6" />
                    <Text
                      style={[
                        styles.selectedPreviewText,
                        { color: colors.text },
                      ]}
                    >
                      {selectedSubject}
                    </Text>
                  </View>
                ) : undefined
              }
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
                    ? `Topics (${selectedTopics.length} selected)`
                    : "Select Topics"
              }
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
                    ? `Subtopics (${selectedSubtopics.length} selected)`
                    : "Select Subtopics"
              }
            />
          </CollapsibleSection>

          {/* Section 2: Solution & Correct Answer */}
          <CollapsibleSection
            title="Solution & Answer"
            icon="bulb-outline"
            isCollapsed={isSolutionCollapsed}
            onToggle={() => setIsSolutionCollapsed((p) => !p)}
            accentColor="#3B82F6"
          >
            {/* Question / Solution Type dropdown */}
            <SyllabusDropdown
              label="Question type"
              isOpen={isTypeDropdownOpen}
              onToggleOpen={() => setIsTypeDropdownOpen((p) => !p)}
              items={QUESTION_TYPE_ITEMS}
              selectedValues={[selectedType]}
              onSelectItem={(val) => {
                setSelectedType(val as QuestionType);
                setIsTypeDropdownOpen(false);
              }}
              placeholder="Select type"
              selectedPreview={
                <View style={styles.selectedTypePreview}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{selectedType}</Text>
                  </View>
                  <Text
                    style={[
                      styles.selectedTypeDesc,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {QUESTION_TYPES.find((t) => t.key === selectedType)?.label}
                  </Text>
                </View>
              }
            />

            {/* Answer Selector (MCQ / MSQ / NAT) */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {selectedType === "MCQ"
                  ? "Correct Option (Pick 1)"
                  : selectedType === "MSQ"
                    ? "Correct Options (One or more)"
                    : "Numerical Answer"}
              </Text>

              {(selectedType === "MCQ" || selectedType === "MSQ") && (
                <View style={styles.optionsRow}>
                  {OPTIONS.map((opt) => {
                    const isSelected =
                      selectedType === "MCQ"
                        ? mcqSelected === opt
                        : msqSelected.includes(opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        activeOpacity={0.7}
                        style={[
                          styles.optionCircle,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.cardSecondary,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() =>
                          selectedType === "MCQ"
                            ? setMcqSelected(opt)
                            : handleMsqToggle(opt)
                        }
                      >
                        <Text
                          style={[
                            styles.optionCircleText,
                            {
                              color: isSelected ? "#FFFFFF" : colors.text,
                              fontWeight: isSelected ? "800" : "600",
                            },
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {selectedType === "NAT" && (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter numerical value"
                    placeholderTextColor={colors.textPlaceholder}
                    value={natAnswer}
                    onChangeText={setNatAnswer}
                    keyboardType="default"
                  />
                </View>
              )}
            </View>

            {/* Solution Images */}
            <View style={styles.fieldBlock}>
              <View style={styles.sectionLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Solution Images
                </Text>
                {solutionImageUris.length > 0 && (
                  <Text
                    style={[
                      styles.imageCountBadge,
                      { color: colors.textMuted },
                    ]}
                  >
                    {solutionImageUris.length}{" "}
                    {solutionImageUris.length === 1 ? "page" : "pages"}
                  </Text>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageScrollRow}
              >
                {solutionImageUris.map((uri, idx) => {
                  const displayUri = resolveImageUri(uri);
                  return (
                    <TouchableOpacity
                      key={`${uri}-${idx}`}
                      activeOpacity={0.85}
                      style={[
                        styles.imageCard,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        setZoomImageUri(displayUri);
                        setZoomTitle(`Solution Image ${idx + 1}`);
                      }}
                    >
                      <Image
                        source={{ uri: displayUri! }}
                        style={styles.imageThumb}
                        contentFit="cover"
                      />
                      <View style={styles.pageNumberBadge}>
                        <Text style={styles.pageNumberText}>#{idx + 1}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.imageDeleteBtn}
                        activeOpacity={0.8}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSolutionImageUris((prev) =>
                            prev.filter((_, i) => i !== idx),
                          );
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.addImageCard,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.cardSecondaryBorder,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setPickerTarget("solution")}
                  disabled={solutionPicker.isProcessing}
                >
                  {solutionPicker.isProcessing ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color="#3B82F6"
                      />
                      <Text style={[styles.addImageText, { color: "#3B82F6" }]}>
                        + Add page
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </CollapsibleSection>

          {/* Section 3: OCR Extracted Text */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                OCR Extracted Text
              </Text>
            </View>
            <Text
              style={[
                styles.helperText,
                { color: colors.textMuted, marginBottom: 8 },
              ]}
            >
              Used for keyword searches across questions. You can edit OCR
              mistakes here.
            </Text>
            <View
              style={[
                styles.multilineInputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.multilineInput, { color: colors.text }]}
                placeholder="No extracted text. You can type or paste question text here..."
                placeholderTextColor={colors.textPlaceholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={extractedText}
                onChangeText={setExtractedText}
              />
            </View>
          </View>

          {/* Section 4: Personal Note */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="mic-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Voice Note / Explanation
              </Text>
            </View>
            <AudioNoteField
              value={personalNote}
              onChange={(val) => setPersonalNote(val || "")}
            />
          </View>
        </ScrollView>

        {/* ── Fixed Footer Action Bar ───────────────────────────────────── */}
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.footerCancelBtn,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
            activeOpacity={0.8}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={[styles.footerCancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.footerSaveBtn,
              { backgroundColor: colors.primary },
              isSaving && styles.buttonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                <Text style={styles.footerSaveText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Modals: Picker & Zoom ─────────────────────────────────────── */}
        <ImagePickerModal
          visible={pickerTarget !== null}
          onClose={() => setPickerTarget(null)}
          onSelectCamera={handleSelectCamera}
          onSelectGallery={handleSelectGallery}
          title={
            pickerTarget === "question"
              ? "Add Question Image"
              : "Add Solution Image"
          }
        />

        <ImageZoomModal
          visible={zoomImageUri !== null}
          imageUri={zoomImageUri}
          title={zoomTitle}
          onClose={() => setZoomImageUri(null)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  fieldBlock: {
    marginTop: 10,
    gap: 6,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  imageCountBadge: {
    fontSize: 11,
    fontWeight: "500",
  },
  imageScrollRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  imageCard: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  pageNumberBadge: {
    position: "absolute",
    bottom: 3,
    left: 3,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pageNumberText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  imageDeleteBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "rgba(239, 68, 68, 0.88)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addImageCard: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addImageText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  selectedSyllabusPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedPreviewText: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectedTypePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  selectedTypeDesc: {
    fontSize: 12.5,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  optionCircle: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCircleText: {
    fontSize: 15,
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  textInput: {
    fontSize: 13.5,
    padding: 0,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 15,
  },
  multilineInputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    minHeight: 80,
  },
  multilineInput: {
    fontSize: 12.5,
    lineHeight: 17,
    padding: 0,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  footerCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCancelText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  footerSaveBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerSaveText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
