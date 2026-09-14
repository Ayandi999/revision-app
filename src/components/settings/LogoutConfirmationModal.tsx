import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
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
          {/* Mini Top Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Log Out of Drive</Text>

          {/* Refined Compact Message */}
          <Text style={[styles.message, { color: colors.textMuted }]}>
            Existing cloud backups stay safe. New questions won&apos;t sync until you reconnect.
          </Text>

          {/* Micro Reassurance Pill */}
          <View
            style={[
              styles.safePill,
              {
                backgroundColor: colors.successBg,
                borderColor: "rgba(16, 185, 129, 0.2)",
              },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={11} color={colors.success} />
            <Text style={[styles.safePillText, { color: colors.success }]}>
              Backups remain safe on Drive
            </Text>
          </View>

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
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.error }]}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onConfirm();
              }}
            >
              <Ionicons name="log-out-outline" size={13} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Log Out</Text>
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
    maxWidth: 280,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  safePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  safePillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 6,
  },
  cancelButton: {
    flex: 1,
    height: 32,
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
    flex: 1.1,
    height: 32,
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
});
