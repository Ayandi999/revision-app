import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  DevSettings,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTO_DISMISS_DELAY_MS = 10000; // Auto-dismiss after 10 seconds

export function OtaUpdateNotification() {
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [visible, setVisible] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Slide & Fade animation
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopup = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Clear any existing timer and auto-dismiss after delay
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
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
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
            // Once fetched, isUpdatePending turns true automatically
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

  const handleRestart = async () => {
    try {
      setIsRestarting(true);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (__DEV__ || !Updates.isEnabled) {
        if (DevSettings?.reload) {
          DevSettings.reload();
          return;
        }
        setTimeout(() => {
          setIsRestarting(false);
          hidePopup();
        }, 800);
        return;
      }
      await Updates.reloadAsync();
    } catch (err) {
      console.warn("[OTA Updates] Restart error:", err);
      setIsRestarting(false);
      hidePopup();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 8, 16),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left update icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={16} color="#38BDF8" />
        </View>

        {/* Text details */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.subtitle}>
            A fresh update was downloaded. Restart to apply.
          </Text>
        </View>

        {/* Restart action button */}
        <TouchableOpacity
          style={styles.restartButton}
          activeOpacity={0.8}
          onPress={handleRestart}
          disabled={isRestarting}
        >
          <Ionicons
            name="refresh"
            size={14}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.restartButtonText}>
            {isRestarting ? "Restarting..." : "Restart"}
          </Text>
        </TouchableOpacity>

        {/* Close (X) cross button */}
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.7}
          onPress={hidePopup}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2028",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  restartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
});
