import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

// ─── 1. Restore Confirmation Modal ───────────────────────────────────────────

interface RestoreConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreConfirmationModal: React.FC<RestoreConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();

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
        onPress={onClose}
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
          {/* Top Icon Circle */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.primaryLight,
                borderColor: "rgba(59, 130, 246, 0.25)",
              },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={16} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Restore from Drive</Text>

          {/* Compact Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            This will replace your current local revision database and download missing images from your Google Drive backup. Continue?
          </Text>

          {/* Micro Information Pill */}
          <View
            style={[
              styles.infoPill,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={11} color={colors.primary} />
            <Text style={[styles.infoPillText, { color: colors.textMuted }]}>
              Replaces local database with cloud copy
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onConfirm();
              }}
            >
              <Ionicons name="cloud-download-outline" size={13} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Restore</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── 2. Restore Success Modal ────────────────────────────────────────────────

interface RestoreSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  questionCount: number;
  imageCount: number;
}

export const RestoreSuccessModal: React.FC<RestoreSuccessModalProps> = ({
  visible,
  onClose,
  questionCount,
  imageCount,
}) => {
  const { colors } = useTheme();

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
        onPress={onClose}
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
          {/* Top Success Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.successBg,
                borderColor: "rgba(16, 185, 129, 0.25)",
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Restore Completed</Text>

          {/* Compact Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            Successfully restored {questionCount} question(s) and verified {imageCount} image(s) from your Google Drive.
          </Text>

          {/* Micro Status Pill */}
          <View
            style={[
              styles.infoPill,
              {
                backgroundColor: colors.successBg,
                borderColor: "rgba(16, 185, 129, 0.2)",
              },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={11} color={colors.success} />
            <Text style={[styles.infoPillText, { color: colors.success }]}>
              Database & content in sync
            </Text>
          </View>

          {/* Single Compact Done Button */}
          <TouchableOpacity
            style={[styles.fullButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── 3. Restore Error Modal ──────────────────────────────────────────────────

interface RestoreErrorModalProps {
  visible: boolean;
  onClose: () => void;
  errorMessage: string;
}

export const RestoreErrorModal: React.FC<RestoreErrorModalProps> = ({
  visible,
  onClose,
  errorMessage,
}) => {
  const { colors } = useTheme();

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
        onPress={onClose}
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
          {/* Top Error Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.errorBg,
                borderColor: "rgba(239, 68, 68, 0.25)",
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Restore Failed</Text>

          {/* Compact Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {errorMessage || "Could not complete backup restoration. Your local data was preserved."}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.fullButton,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
                borderWidth: 1,
              },
            ]}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Dismiss</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 285,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1.15,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  fullButton: {
    width: "100%",
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
