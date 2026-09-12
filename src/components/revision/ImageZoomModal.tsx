import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
  type PinchGestureHandlerGestureEvent,
  type PinchGestureHandlerStateChangeEvent,
  type TapGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";

export interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  title?: string;
  /** When true, renders as an absolute overlay instead of a nested native Modal (fixes Android nested modal issues) */
  embedded?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ImageZoomModal({
  visible,
  imageUri,
  onClose,
  title = "Image",
  embedded = false,
}: ImageZoomModalProps) {
  // Animated transforms
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Track transform state synchronously in refs to prevent drift
  const baseScale = useRef(1);
  const currentScale = useRef(1);
  const basePan = useRef({ x: 0, y: 0 });
  const currentPan = useRef({ x: 0, y: 0 });

  // Handler refs for simultaneous gesture composition
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const doubleTapRef = useRef<TapGestureHandler>(null);

  // Reset transforms whenever the modal opens or image changes
  useEffect(() => {
    if (visible) {
      resetZoom(false);
    }
  }, [visible, imageUri]);

  const resetZoom = (animated = true) => {
    baseScale.current = 1;
    currentScale.current = 1;
    basePan.current = { x: 0, y: 0 };
    currentPan.current = { x: 0, y: 0 };

    if (animated) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      overlayOpacity.setValue(1);
    }
  };

  // ─── Double Tap Gesture ───────────────────────────────────────────────────
  const onDoubleTap = (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const tapX = event.nativeEvent.x;
      const tapY = event.nativeEvent.y;

      if (currentScale.current > 1.2) {
        // Zoomed in -> Reset to 1x
        resetZoom(true);
      } else {
        // Zoom in to 2.5x with focal point toward tap
        const targetScale = 2.5;
        baseScale.current = targetScale;
        currentScale.current = targetScale;

        const offsetX = SCREEN_WIDTH / 2 - tapX;
        const offsetY = SCREEN_HEIGHT / 2 - tapY;
        let targetX = offsetX * (targetScale - 1);
        let targetY = offsetY * (targetScale - 1);

        const maxPanX = (SCREEN_WIDTH * targetScale - SCREEN_WIDTH) / 2;
        const maxPanY =
          (SCREEN_HEIGHT * 0.85 * targetScale - SCREEN_HEIGHT * 0.85) / 2;

        targetX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
        targetY = Math.max(-maxPanY, Math.min(maxPanY, targetY));

        basePan.current = { x: targetX, y: targetY };
        currentPan.current = { x: targetX, y: targetY };

        Animated.parallel([
          Animated.spring(scale, {
            toValue: targetScale,
            useNativeDriver: true,
            friction: 7,
            tension: 35,
          }),
          Animated.spring(translateX, {
            toValue: targetX,
            useNativeDriver: true,
            friction: 7,
            tension: 35,
          }),
          Animated.spring(translateY, {
            toValue: targetY,
            useNativeDriver: true,
            friction: 7,
            tension: 35,
          }),
        ]).start();
      }
    }
  };

  // ─── Native Pinch Gesture (Native Android ScaleGestureDetector) ───────────
  const onPinchEvent = (event: PinchGestureHandlerGestureEvent) => {
    const pinchScale = event.nativeEvent.scale;
    let nextScale = baseScale.current * pinchScale;

    // Rubber-band resistance beyond limits
    if (nextScale < 0.8) {
      nextScale = 0.8 - (0.8 - nextScale) * 0.3;
    } else if (nextScale > 5.0) {
      nextScale = 5.0 + (nextScale - 5.0) * 0.3;
    }

    scale.setValue(nextScale);
    currentScale.current = nextScale;
  };

  const onPinchStateChange = (event: PinchGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      let finalScale = currentScale.current;

      if (finalScale < 1.0) {
        // Under-pinched -> Spring back to 1x centered
        resetZoom(true);
      } else if (finalScale > 4.5) {
        // Over-pinched -> Snap back to 4x
        finalScale = 4.0;
        baseScale.current = 4.0;
        currentScale.current = 4.0;

        Animated.spring(scale, {
          toValue: 4.0,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }).start();
      } else {
        baseScale.current = finalScale;
      }
    }
  };

  // ─── Native Pan Gesture (One-finger traversal & swipe dismiss) ────────────
  const onPanEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;

    if (currentScale.current > 1.05) {
      // One-finger traversal when zoomed in
      const maxPanX = Math.max(
        0,
        (SCREEN_WIDTH * currentScale.current - SCREEN_WIDTH) / 2,
      );
      const maxPanY = Math.max(
        0,
        (SCREEN_HEIGHT * 0.85 * currentScale.current - SCREEN_HEIGHT * 0.85) /
          2,
      );

      let nextX = basePan.current.x + translationX;
      let nextY = basePan.current.y + translationY;

      // Soft rubber-band resistance beyond boundaries
      if (nextX > maxPanX) {
        nextX = maxPanX + (nextX - maxPanX) * 0.3;
      } else if (nextX < -maxPanX) {
        nextX = -maxPanX + (nextX + maxPanX) * 0.3;
      }

      if (nextY > maxPanY) {
        nextY = maxPanY + (nextY - maxPanY) * 0.3;
      } else if (nextY < -maxPanY) {
        nextY = -maxPanY + (nextY + maxPanY) * 0.3;
      }

      translateX.setValue(nextX);
      translateY.setValue(nextY);
      currentPan.current = { x: nextX, y: nextY };
    } else {
      // At 1x: Swipe down to dismiss
      if (translationY > 0) {
        translateY.setValue(translationY);
        currentPan.current.y = translationY;
        const opacity = Math.max(0.3, 1 - translationY / (SCREEN_HEIGHT * 0.6));
        overlayOpacity.setValue(opacity);
      }
    }
  };

  const onPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent;

      if (currentScale.current <= 1.05) {
        // Swipe down threshold for closing
        if (translationY > 110) {
          onClose();
          return;
        }

        // Rebound back to 0
        currentPan.current = { x: 0, y: 0 };
        basePan.current = { x: 0, y: 0 };

        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 40,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Clamping within viewport
        const maxPanX = Math.max(
          0,
          (SCREEN_WIDTH * currentScale.current - SCREEN_WIDTH) / 2,
        );
        const maxPanY = Math.max(
          0,
          (SCREEN_HEIGHT * 0.85 * currentScale.current - SCREEN_HEIGHT * 0.85) /
            2,
        );

        let targetX = currentPan.current.x;
        let targetY = currentPan.current.y;
        let needsSnap = false;

        if (targetX > maxPanX) {
          targetX = maxPanX;
          needsSnap = true;
        } else if (targetX < -maxPanX) {
          targetX = -maxPanX;
          needsSnap = true;
        }

        if (targetY > maxPanY) {
          targetY = maxPanY;
          needsSnap = true;
        } else if (targetY < -maxPanY) {
          targetY = -maxPanY;
          needsSnap = true;
        }

        basePan.current = { x: targetX, y: targetY };
        currentPan.current = { x: targetX, y: targetY };

        if (needsSnap) {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: targetX,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
            Animated.spring(translateY, {
              toValue: targetY,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
          ]).start();
        }
      }
    }
  };

  if (!visible || !imageUri) return null;

  const modalBody = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
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

        {/* Native Gesture Viewport */}
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onHandlerStateChange={onDoubleTap}
        >
          <Animated.View style={styles.gestureContainer}>
            <PanGestureHandler
              ref={panRef}
              simultaneousHandlers={[pinchRef]}
              minPointers={1}
              maxPointers={1}
              onGestureEvent={onPanEvent}
              onHandlerStateChange={onPanStateChange}
            >
              <Animated.View style={styles.gestureContainer}>
                <PinchGestureHandler
                  ref={pinchRef}
                  simultaneousHandlers={[panRef]}
                  onGestureEvent={onPinchEvent}
                  onHandlerStateChange={onPinchStateChange}
                >
                  <Animated.View style={styles.contentArea}>
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
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.fullImage}
                        contentFit="contain"
                        transition={200}
                      />
                    </Animated.View>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>

        {/* Subtle Bottom Hint */}
        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>Pinch or double-tap • Drag to pan</Text>
        </View>
      </Animated.View>
    </GestureHandlerRootView>
  );

  if (embedded) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.embeddedWrapper]}>
        {modalBody}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {modalBody}
    </Modal>
  );
}

const styles = StyleSheet.create({
  embeddedWrapper: {
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#0B0C10F8",
    justifyContent: "space-between",
  },
  topBar: {
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  gestureContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  bottomBar: {
    paddingBottom: Platform.OS === "ios" ? 42 : 24,
    paddingHorizontal: 20,
    alignItems: "center",
    zIndex: 20,
  },
  hintText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
