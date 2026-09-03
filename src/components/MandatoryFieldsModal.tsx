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

interface MandatoryFieldsModalProps {
  visible: boolean;
  onClose: () => void;
  missingFields: string[];
}

export function MandatoryFieldsModal({
  visible,
  onClose,
  missingFields,
}: MandatoryFieldsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Warning Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>Mandatory Fields Required</Text>
          <Text style={styles.subtitle}>
            Please complete the following required fields marked with an
            asterisk (*) to add this question:
          </Text>

          {/* Missing Fields List */}
          <View style={styles.missingListContainer}>
            {missingFields.map((field, idx) => (
              <View key={idx} style={styles.missingItemRow}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.missingItemText}>{field}</Text>
              </View>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#222121",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    marginTop: 14,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 6,
  },
  missingListContainer: {
    width: "100%",
    backgroundColor: "#1c1b1b",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 10,
  },
  missingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missingItemText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    width: "100%",
    height: 48,
    backgroundColor: "#0739ed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#0739ed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
