import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useTutorial } from "@/context/TutorialContext";
import { hapticSelection, hapticSuccess } from "@/functions/hapticFeedback";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TutorialSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image?: any;
  images?: any[];
  color: string;
  tabIcon: keyof typeof Ionicons.glyphMap;
  tabLabel: string;
  contentFit?: "contain" | "cover";
  contentPosition?: any;
  scale?: number;
  translateY?: number;
}

const SLIDES: TutorialSlide[] = [
  {
    id: "step1",
    badge: "STEP 1 • ADD QUESTION & SOLUTION",
    title: "Capture Every Mistake",
    subtitle: "Add questions you missed that u want to revise",
    image: require("@/assets/tutorial/add_question_tour.jpg"),
    color: "#38BDF8",
    tabIcon: "add-circle",
    tabLabel: "ADD Q",
    contentFit: "contain",
  },
  {
    id: "step2",
    badge: "STEP 2 • SEARCH & FILTER",
    title: "Your Revision Bank",
    subtitle: "All added questions appear in the Search tab",
    image: require("@/assets/tutorial/seach-rab.png"),
    color: "#38BDF8",
    tabIcon: "search",
    tabLabel: "SEARCH",
    contentFit: "cover",
    contentPosition: { top: "12%", left: "50%" },
    scale: 1.15,
    translateY: 10,
  },
  {
    id: "step3",
    badge: "STEP 3 • TRACK & REVISE",
    title: "Analyze & Improve Daily",
    subtitle: "Review test results, question accuracy, and track your progress in the Revision tab",
    image: require("@/assets/tutorial/revision-page-image.png"),
    color: "#38BDF8",
    tabIcon: "eye",
    tabLabel: "REVISION",
    contentFit: "contain",
  },
  {
    id: "step4",
    badge: "STEP 4 • GOOGLE DRIVE BACKUP",
    title: "Link Google Drive for Backup",
    subtitle: "Make sure to allow permission for backup",
    color: "#38BDF8",
    tabIcon: "settings",
    tabLabel: "SETTINGS",
    contentFit: "contain",
    images: [
      require("@/assets/tutorial/one.jpeg"),
      require("@/assets/tutorial/two.jpeg"),
    ],
  },
];

export function AppTutorialModal() {
  const { isTutorialOpen, closeTutorial } = useTutorial();
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Reset slide index whenever modal opens
  useEffect(() => {
    if (isTutorialOpen) {
      setActiveIndex(0);
    }
  }, [isTutorialOpen]);

  const handleClose = () => {
    hapticSuccess();
    closeTutorial();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      hapticSelection();
      const next = activeIndex + 1;
      setActiveIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      handleClose();
    }
  };

  const goToPrev = () => {
    if (activeIndex > 0) {
      hapticSelection();
      const prev = activeIndex - 1;
      setActiveIndex(prev);
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    }
  };

  if (!isTutorialOpen) return null;

  // Deep blue/black shade matching the screenshot backgrounds
  const fadeColor = isDark ? "#060913" : "#0A0F1D";
  const currentSlide = SLIDES[activeIndex];

  return (
    <Modal
      visible={isTutorialOpen}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={closeTutorial}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: fadeColor }]}
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Top Header Bar */}
        <View style={[styles.headerBar, { borderBottomColor: "rgba(255,255,255,0.08)" }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <Ionicons name="sparkles" size={14} color="#38BDF8" />
            </View>
            <Text style={styles.headerTitle}>REVLOG GUIDE</Text>
            <View style={styles.stepIndicatorBadge}>
              <Text style={styles.stepIndicatorText}>
                {activeIndex + 1} / {SLIDES.length}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              hapticSelection();
              closeTutorial();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Paging Carousel */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          renderItem={({ item }) => (
            <View style={[styles.slideWrapper, { width: SCREEN_WIDTH }]}>
              {/* Centered Image with Top & Bottom Fade Overlays */}
              <View style={styles.imageCardContainer}>
                {item.images && item.images.length >= 2 ? (
                  <View style={styles.stackedImagesContainer}>
                    <Image
                      source={item.images[0]}
                      style={styles.stackedImageTop}
                      contentFit="contain"
                      priority="high"
                    />
                    <Image
                      source={item.images[1]}
                      style={styles.stackedImageBottom}
                      contentFit="contain"
                      priority="high"
                    />
                  </View>
                ) : (
                  <Image
                    source={item.image}
                    style={[
                      styles.tutorialImage,
                      item.scale
                        ? {
                            transform: [
                              { scale: item.scale },
                              { translateY: item.translateY || 0 },
                            ],
                          }
                        : null,
                    ]}
                    contentFit={item.contentFit || "contain"}
                    contentPosition={item.contentPosition || "center"}
                    priority="high"
                  />
                )}

                {/* Top Fade Gradient - Thinner & closer to top edge */}
                <View style={styles.topGradient} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={fadeColor} stopOpacity="0.95" />
                        <Stop offset="40%" stopColor={fadeColor} stopOpacity="0.5" />
                        <Stop offset="100%" stopColor={fadeColor} stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#topFade)" />
                  </Svg>
                </View>

                {/* Bottom Fade Gradient */}
                <View style={styles.bottomGradient} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={fadeColor} stopOpacity="0" />
                        <Stop offset="70%" stopColor={fadeColor} stopOpacity="0.85" />
                        <Stop offset="100%" stopColor={fadeColor} stopOpacity="1" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#bottomFade)" />
                  </Svg>
                </View>
              </View>

              {/* Bottom Descriptive Text Block */}
              <View style={styles.textBlock}>
                {/* Active Tab Highlighted Square (matching selected bottom tab style) */}
                <View style={styles.activeTabSquare}>
                  <Ionicons name={item.tabIcon} size={20} color="#38BDF8" />
                  <Text style={styles.activeTabSquareText} numberOfLines={1}>
                    {item.tabLabel}
                  </Text>
                </View>

                <Text style={styles.headingTitle}>{item.title}</Text>

                <Text style={styles.subtext}>{item.subtitle}</Text>
              </View>
            </View>
          )}
        />

        {/* Bottom CTA Footer Bar */}
        <View style={[styles.footerBar, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
          {/* Pagination Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => {
              const isActive = idx === activeIndex;
              return (
                <View
                  key={s.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isActive ? "#38BDF8" : "rgba(255,255,255,0.2)",
                      width: isActive ? 20 : 6,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {activeIndex > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={goToPrev}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                activeIndex > 0 && { paddingHorizontal: 22 },
              ]}
              onPress={goToNext}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {activeIndex === SLIDES.length - 1 ? "Start Revising" : "Next"}
              </Text>
              <Ionicons
                name={activeIndex === SLIDES.length - 1 ? "rocket" : "arrow-forward"}
                size={15}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#FFFFFF",
  },
  stepIndicatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  stepIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  closeBtn: {
    padding: 4,
  },
  slideWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  imageCardContainer: {
    width: "100%",
    height: Math.min(SCREEN_HEIGHT * 0.49, 390),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  tutorialImage: {
    width: "100%",
    height: "100%",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  stackedImagesContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  stackedImageTop: {
    width: "100%",
    height: "38%",
  },
  stackedImageBottom: {
    width: "100%",
    height: "58%",
  },
  textBlock: {
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  activeTabSquare: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#38BDF8",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginBottom: 4,
  },
  activeTabSquareText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#38BDF8",
    textTransform: "uppercase",
  },
  headingTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtext: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  footerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
