import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useActiveExam } from "@/context/ExamContext";

const TUTORIAL_STORAGE_KEY = "@revlog_tutorial_seen";

interface TutorialContextType {
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  resetTutorialState: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  const { isOnboardingCompleted, isModalOpen } = useActiveExam();

  // Load persisted tutorial seen state
  useEffect(() => {
    async function checkTutorialSeen() {
      try {
        const val = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (val === "true") {
          setHasSeenTutorial(true);
        }
      } catch (err) {
        console.error("[TutorialContext] Error reading tutorial state:", err);
      } finally {
        setHasCheckedStorage(true);
      }
    }
    checkTutorialSeen();
  }, []);

  // Auto-open on initial onboarding completion
  useEffect(() => {
    if (
      hasCheckedStorage &&
      isOnboardingCompleted &&
      !isModalOpen &&
      !hasSeenTutorial &&
      !isTutorialOpen
    ) {
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCheckedStorage, isOnboardingCompleted, isModalOpen, hasSeenTutorial, isTutorialOpen]);

  const openTutorial = useCallback(() => {
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(async () => {
    setIsTutorialOpen(false);
    setHasSeenTutorial(true);
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch (err) {
      console.error("[TutorialContext] Error saving tutorial state:", err);
    }
  }, []);

  const resetTutorialState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
    } catch (err) {
      console.error("[TutorialContext] Error resetting tutorial state:", err);
    }
    setHasSeenTutorial(false);
    setIsTutorialOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isTutorialOpen,
      openTutorial,
      closeTutorial,
      resetTutorialState,
    }),
    [isTutorialOpen, openTutorial, closeTutorial, resetTutorialState]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextType {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}
