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

export type StatusModalType = "success" | "error" | "warning" | "info";

interface StatusModalProps {
  visible: boolean;
  type?: StatusModalType;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function StatusModal({
  visible,
  type = "success",
  title,
  message,
  buttonText = "Done",
  onClose,
}: StatusModalProps) {
  const { colors } = useTheme();

  const config = {
    success: {
      icon: "checkmark-circle" as const,
      color: colors.success,
      bgColor: colors.successBg,
      borderColor: "rgba(16, 185, 129, 0.32)",
      btnBg: colors.success,
    },
    error: {
      icon: "close-circle" as const,
      color: colors.error,
      bgColor: colors.errorBg,
      borderColor: "rgba(239, 68, 68, 0.32)",
      btnBg: colors.error,
    },
    warning: {
      icon: "alert-circle" as const,
      color: colors.warning,
      bgColor: colors.warningBg,
      borderColor: "rgba(245, 158, 11, 0.32)",
      btnBg: colors.warning,
    },
    info: {
      icon: "information-circle" as const,
      color: colors.primary,
      bgColor: colors.primaryLight,
      borderColor: "rgba(59, 130, 246, 0.32)",
      btnBg: colors.primary,
    },
  }[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
          {/* Status Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
              },
            ]}
          >
            <Ionicons name={config.icon} size={36} color={config.color} />
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.btnBg }]}
            activeOpacity={0.82}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  button: {
    width: "100%",
    height: 42,
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
