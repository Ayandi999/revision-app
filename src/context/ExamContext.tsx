import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_EXAM_ID,
  DEFAULT_STREAM_ID,
  getExamDisplayInfo,
  getSyllabusForStream,
} from "@/config/exams";
import type { SyllabusSchema } from "@/types/syllabus";

const EXAM_STORAGE_KEY = "@revision_app_user_exam";

interface ExamStoragePayload {
  examId: string;
  streamId: string;
  completedAt: string;
}

interface ExamContextType {
  examId: string;
  streamId: string;
  syllabus: SyllabusSchema;
  examTitle: string;
  streamTitle: string;
  shortBadge: string;
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  setExamAndStream: (examId: string, streamId: string) => Promise<void>;
  openExamSwitcher: () => void;
  closeExamSwitcher: () => void;
}

const ExamContext = createContext<ExamContextType | null>(null);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [examId, setExamId] = useState<string>(DEFAULT_EXAM_ID);
  const [streamId, setStreamId] = useState<string>(DEFAULT_STREAM_ID);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load saved preference on mount
  useEffect(() => {
    async function loadSavedExam() {
      try {
        const raw = await AsyncStorage.getItem(EXAM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ExamStoragePayload;
          if (parsed && parsed.examId && parsed.streamId) {
            setExamId(parsed.examId);
            setStreamId(parsed.streamId);
            setIsOnboardingCompleted(true);
          }
        } else {
          // First install / no preference saved
          setIsOnboardingCompleted(false);
          setIsModalOpen(true);
        }
      } catch (err) {
        console.error("Failed to load exam selection from storage:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedExam();
  }, []);

  const setExamAndStream = useCallback(
    async (newExamId: string, newStreamId: string) => {
      try {
        const payload: ExamStoragePayload = {
          examId: newExamId,
          streamId: newStreamId,
          completedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(payload));
        setExamId(newExamId);
        setStreamId(newStreamId);
        setIsOnboardingCompleted(true);
        setIsModalOpen(false);
      } catch (err) {
        console.error("Failed to save exam selection to storage:", err);
      }
    },
    []
  );

  const openExamSwitcher = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeExamSwitcher = useCallback(() => {
    // Only allow closing if onboarding has already been completed in the past
    if (isOnboardingCompleted) {
      setIsModalOpen(false);
    }
  }, [isOnboardingCompleted]);

  const syllabus = useMemo(() => getSyllabusForStream(streamId), [streamId]);

  const displayInfo = useMemo(
    () => getExamDisplayInfo(examId, streamId),
    [examId, streamId]
  );

  const value: ExamContextType = useMemo(
    () => ({
      examId,
      streamId,
      syllabus,
      examTitle: displayInfo.exam.name,
      streamTitle: displayInfo.stream.name,
      shortBadge: displayInfo.shortBadge,
      isOnboardingCompleted,
      isLoading,
      isModalOpen,
      setExamAndStream,
      openExamSwitcher,
      closeExamSwitcher,
    }),
    [
      examId,
      streamId,
      syllabus,
      displayInfo,
      isOnboardingCompleted,
      isLoading,
      isModalOpen,
      setExamAndStream,
      openExamSwitcher,
      closeExamSwitcher,
    ]
  );

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useActiveExam(): ExamContextType {
  const ctx = useContext(ExamContext);
  if (!ctx) {
    throw new Error("useActiveExam must be used within an ExamProvider");
  }
  return ctx;
}
