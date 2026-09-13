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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Mini Top Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Log Out of Drive</Text>

          {/* Refined Compact Message */}
          <Text style={styles.message}>
            Existing cloud backups stay safe. New questions won&apos;t sync until you reconnect.
          </Text>

          {/* Micro Reassurance Pill */}
          <View style={styles.safePill}>
            <Ionicons name="shield-checkmark-outline" size={11} color="#10B981" />
            <Text style={styles.safePillText}>Backups remain safe on Drive</Text>
          </View>

          {/* Compact Button Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#1C1D24",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  safePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  safePillText: {
    color: "#34D399",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1.1,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EF4444",
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
