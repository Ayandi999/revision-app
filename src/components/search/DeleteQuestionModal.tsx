import { useTheme } from "@/context/ThemeContext";
import type { Question } from "@/database/schema";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DeleteQuestionModalProps {
  visible: boolean;
  question: Question | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteQuestionModal: React.FC<DeleteQuestionModalProps> = ({
  visible,
  question,
  isDeleting = false,
  onClose,
  onConfirm,
}) => {
  const { colors, isDark } = useTheme();

  if (!question) return null;

  const rawSnippet = question.extractedText?.replace(/\s+/g, " ").trim();
  const snippet =
    rawSnippet && rawSnippet.length > 75
      ? `${rawSnippet.slice(0, 75)}…`
      : rawSnippet;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.modalBackdrop }]}
        onPress={isDeleting ? undefined : onClose}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.modalCard,
              borderColor: colors.modalBorder,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Row: Icon + Title + Meta */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? "rgba(239, 68, 68, 0.14)"
                    : "rgba(239, 68, 68, 0.1)",
                  borderColor: isDark
                    ? "rgba(239, 68, 68, 0.28)"
                    : "rgba(239, 68, 68, 0.2)",
                },
              ]}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </View>

            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: colors.text }]}>
                Delete Question
              </Text>
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {question.subject} • {question.questionType}
              </Text>
            </View>
          </View>

          {/* Snippet / Warning Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {snippet ? (
              <Text
                style={[styles.snippetText, { color: colors.textSecondary }]}
              >
                &ldquo;{snippet}&rdquo;
              </Text>
            ) : (
              "This question will be permanently removed from your revision bank."
            )}
          </Text>

          {/* Compact Button Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
              activeOpacity={0.75}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.danger },
                isDeleting && styles.buttonDisabled,
              ]}
              activeOpacity={0.82}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash" size={13} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 295,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  snippetText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  cancelButton: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
