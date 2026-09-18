import { migrateToRelativePaths } from "@/functions/migrateToRelativePaths";
import { OtaUpdateNotification } from "@/components/OtaUpdateNotification";
import {
  GeistMono_400Regular,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/context/ThemeContext";
import { ExamProvider } from "@/context/ExamContext";
import { CloudSyncProvider } from "@/context/CloudSyncContext";
import { OnboardingModal } from "@/components/OnboardingModal";
import { TutorialProvider } from "@/context/TutorialContext";
import { AppTutorialModal } from "@/components/AppTutorialModal";

import { initNotifications } from "@/services/notificationService";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Keep the splash screen visible until fonts are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GeistMono_400Regular,
    GeistMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      // Run one-time migration to convert absolute image URIs to relative paths
      migrateToRelativePaths().catch(() => {});
      // Initialize daily revision notifications
      initNotifications().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Handle tap on initial notification when app is launched cold
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      router.push("/(tabs)/revision/revision");
    }

    // Handle notification interaction while app is running
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/revision/revision");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Render centered logo on black background until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("../../assets/images/splash-icon.png")}
          style={{ width: 220, height: 220, resizeMode: "contain" }}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ExamProvider>
            <CloudSyncProvider>
              <TutorialProvider>
                <Slot />
                <OnboardingModal />
                <AppTutorialModal />
                <OtaUpdateNotification />
              </TutorialProvider>
            </CloudSyncProvider>
          </ExamProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
