import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ImageZoomModal({
  visible,
  imageUri,
  onClose,
  title = "Solution",
}: ImageZoomModalProps) {
  // Animated transforms
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Track raw values for calculations
  const scaleVal = useRef(1);
  const translateXVal = useRef(0);
  const translateYVal = useRef(0);

  // State to update UI indicators (like percentage pill)
  const [displayScale, setDisplayScale] = useState(1);

  // Touch tracking refs
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const initialPanX = useRef(0);
  const initialPanY = useRef(0);
  const lastTap = useRef(0);

  // Sync listener
  useEffect(() => {
    const sId = scale.addListener((v) => {
      scaleVal.current = v.value;
      setDisplayScale(Math.round(v.value * 10) / 10);
    });
    const xId = translateX.addListener((v) => {
      translateXVal.current = v.value;
    });
    const yId = translateY.addListener((v) => {
      translateYVal.current = v.value;
    });

    return () => {
      scale.removeListener(sId);
      translateX.removeListener(xId);
      translateY.removeListener(yId);
    };
  }, [scale, translateX, translateY]);

  // Reset transforms whenever the modal opens or closes
  useEffect(() => {
    if (visible) {
      resetZoom(false);
    }
  }, [visible]);

  const resetZoom = (animated = true) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      scaleVal.current = 1;
      translateXVal.current = 0;
      translateYVal.current = 0;
      setDisplayScale(1);
    }
  };

  const handleDoubleTap = () => {
    if (scaleVal.current > 1.2) {
      resetZoom(true);
    } else {
      Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
    }
  };

  const zoomIn = () => {
    const next = Math.min(scaleVal.current + 0.5, 4);
    Animated.spring(scale, { toValue: next, useNativeDriver: true }).start();
  };

  const zoomOut = () => {
    const next = Math.max(scaleVal.current - 0.5, 1);
    if (next <= 1) {
      resetZoom(true);
    } else {
      Animated.spring(scale, { toValue: next, useNativeDriver: true }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.numberActiveTouches > 1 ||
          (scaleVal.current > 1.05 &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2))
        );
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistance.current = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          initialScale.current = scaleVal.current;
        } else if (touches.length === 1) {
          initialPanX.current = translateXVal.current;
          initialPanY.current = translateYVal.current;

          // Double tap detection
          const now = Date.now();
          if (now - lastTap.current < 300) {
            handleDoubleTap();
          }
          lastTap.current = now;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && initialDistance.current > 0) {
          const currentDistance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          const factor = currentDistance / initialDistance.current;
          const newScale = Math.min(
            Math.max(initialScale.current * factor, 0.7),
            5,
          );
          scale.setValue(newScale);
        } else if (touches.length === 1 && scaleVal.current > 1.05) {
          translateX.setValue(initialPanX.current + gestureState.dx);
          translateY.setValue(initialPanY.current + gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        if (scaleVal.current < 1) {
          resetZoom(true);
        } else if (scaleVal.current === 1) {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0C10" />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleWrapper}>
            <Ionicons name="image" size={18} color="#3B82F6" />
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Zoomable Image Container */}
        <View style={styles.contentArea}>
          <Animated.View
            style={[
              styles.imageContainer,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.fullImage}
              contentFit="contain"
              transition={200}
            />
          </Animated.View>
        </View>

        {/* Bottom Control Pill */}
        <View style={styles.bottomBar}>
          <View style={styles.controlsPill}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={zoomOut}
              disabled={displayScale <= 1}
              activeOpacity={0.7}
            >
              <Ionicons
                name="remove"
                size={20}
                color={displayScale <= 1 ? "#4B5563" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scaleIndicator}
              onPress={() => resetZoom(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.scaleText}>
                {Math.round(displayScale * 100)}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={zoomIn}
              disabled={displayScale >= 4}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add"
                size={20}
                color={displayScale >= 4 ? "#4B5563" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Pinch or double-tap to zoom</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0B0C10F8",
    justifyContent: "space-between",
  },
  topBar: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  bottomBar: {
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  controlsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2028",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  scaleText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  hintText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
});
