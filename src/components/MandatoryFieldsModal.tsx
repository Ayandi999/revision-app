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
  const { colors } = useTheme();

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
          {/* Warning Icon Badge */}
          <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.text }]}>Mandatory Fields Required</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Please complete the following required fields marked with an
            asterisk (*) to add this question:
          </Text>

          {/* Missing Fields List */}
          <View
            style={[
              styles.missingListContainer,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
          >
            {missingFields.map((field, idx) => (
              <View key={idx} style={styles.missingItemRow}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text style={[styles.missingItemText, { color: colors.text }]}>{field}</Text>
              </View>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 14,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 6,
  },
  missingListContainer: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    gap: 10,
  },
  missingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missingItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
