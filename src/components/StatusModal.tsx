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
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
