import { migrateToRelativePaths } from "@/functions/migrateToRelativePaths";
import { OtaUpdateNotification } from "@/components/OtaUpdateNotification";
import {
  GeistMono_400Regular,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Keep the splash screen visible until fonts are ready
SplashScreen.preventAutoHideAsync();

import { ExamProvider } from "@/context/ExamContext";
import { OnboardingModal } from "@/components/OnboardingModal";

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
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded (or failed)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ExamProvider>
          <Slot />
          <OnboardingModal />
          <OtaUpdateNotification />
        </ExamProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
