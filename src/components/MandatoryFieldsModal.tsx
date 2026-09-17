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
    maxWidth: 340,
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  missingListContainer: {
    width: "100%",
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    gap: 8,
  },
  missingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missingItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    width: "100%",
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
