import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  title?: string;
}

export function ImagePickerModal({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
  title = "Add Image",
}: ImagePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [active, setActive] = useState(visible);
  const slideAnim = useRef(new Animated.Value(320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActive(true);
      slideAnim.setValue(320);
      fadeAnim.setValue(0);

      Animated.sequence([
        // Step 1: Backdrop dims in first
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 110,
          useNativeDriver: true,
        }),
        // Step 2: Pop-up slides up at its original smooth speed
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (active) {
      Animated.sequence([
        // Step 1: Pop-up slides down first
        Animated.timing(slideAnim, {
          toValue: 320,
          duration: 170,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Step 2: Backdrop dims out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setActive(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActive(false);
      onClose();
    });
  };

  const handleSelect = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActive(false);
      callback();
    });
  };

  if (!active) return null;

  return (
    <Modal
      visible={active}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.modalBackdrop,
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.modalCard,
              borderTopColor: colors.modalBorder,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Minimalist Top Indicator */}
          <View style={styles.indicatorContainer}>
            <View
              style={[styles.indicator, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBox,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Choose photo source
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Camera Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleSelect(onSelectCamera)}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="camera" size={18} color={colors.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Take Photo
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  Use camera to snap a photo
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textPlaceholder}
              />
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardSecondaryBorder,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleSelect(onSelectGallery)}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="images" size={18} color={colors.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Choose from Gallery
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  Pick an existing photo or screenshot
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textPlaceholder}
              />
            </TouchableOpacity>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardSecondaryBorder,
              },
            ]}
            activeOpacity={0.75}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderRadius: 0,
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },
  indicatorContainer: {
    alignItems: "center",
    paddingVertical: 6,
  },
  indicator: {
    width: 32,
    height: 3,
    borderRadius: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.12)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 30,
    height: 30,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 1,
    letterSpacing: -0.1,
  },
  optionSubtitle: {
    fontSize: 11,
    fontWeight: "400",
  },
  cancelButton: {
    width: "100%",
    height: 38,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
