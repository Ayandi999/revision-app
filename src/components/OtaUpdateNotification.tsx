import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

const AUTO_DISMISS_DELAY_MS = 8000; // Auto-dismiss after 8 seconds

export function OtaUpdateNotification() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [visible, setVisible] = useState(false);

  // Slide & Fade animation
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopup = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      hidePopup();
    }, AUTO_DISMISS_DELAY_MS);
  };

  const hidePopup = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  // Check for updates on mount in production standalone builds
  useEffect(() => {
    if (!__DEV__ && Updates.isEnabled) {
      Updates.checkForUpdateAsync()
        .then(async (update) => {
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
          }
        })
        .catch((err) => {
          console.log("[OTA Updates] Check skipped or unavailable:", err);
        });
    }
  }, []);

  // When an update is downloaded and pending restart, show notification
  useEffect(() => {
    if (isUpdatePending) {
      showPopup();
    }
  }, [isUpdatePending]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 6, 12),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {/* Left update icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>

        {/* Text details */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Update Ready</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Reboot the app to install update
          </Text>
        </View>

        {/* Close (X) cross button */}
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.6}
          onPress={hidePopup}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 999999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 0.5,
  },
  closeButton: {
    padding: 2,
  },
});
