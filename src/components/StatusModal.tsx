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
  const config = {
    success: {
      icon: "checkmark-circle" as const,
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.14)",
      borderColor: "rgba(16, 185, 129, 0.32)",
      btnBg: "#10B981",
    },
    error: {
      icon: "close-circle" as const,
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.14)",
      borderColor: "rgba(239, 68, 68, 0.32)",
      btnBg: "#EF4444",
    },
    warning: {
      icon: "alert-circle" as const,
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.32)",
      btnBg: "#F59E0B",
    },
    info: {
      icon: "information-circle" as const,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.14)",
      borderColor: "rgba(59, 130, 246, 0.32)",
      btnBg: "#3B82F6",
    },
  }[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

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
    backgroundColor: "rgba(0, 0, 0, 0.76)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1E2028",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
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
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: "#94A3B8",
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
