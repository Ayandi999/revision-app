import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTheme } from "@/context/ThemeContext";
import {
  deleteAudioFile,
  isAudioPath,
  persistAudioRecording,
} from "@/functions/audioHelpers";
import { AudioNotePlayer } from "./AudioNotePlayer";

interface AudioNoteFieldProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

function formatRecordingTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const AudioNoteField: React.FC<AudioNoteFieldProps> = ({
  value,
  onChange,
}) => {
  const { colors, isDark } = useTheme();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  // Initialize expo-audio recorder with high quality preset
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  // Start recording handler
  const handleStartRecording = async () => {
    try {
      setIsPreparing(true);

      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone Permission Required",
          "Please allow microphone access in your device settings to record personal voice notes."
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error("[AudioNoteField] Failed to start recording:", err);
      Alert.alert("Recording Error", "Could not start audio recording. Please try again.");
    } finally {
      setIsPreparing(false);
    }
  };

  // Stop recording handler
  const handleStopRecording = async () => {
    try {
      setIsPersisting(true);
      await recorder.stop();
      const recordedUri = recorder.uri;

      if (!recordedUri) {
        console.warn("[AudioNoteField] No recording URI returned after stop");
        return;
      }

      // Move from temporary cache to app sandbox /revision-app/audio
      const { relativePath } = await persistAudioRecording(recordedUri);

      // If there was an existing audio file, clean it up
      if (value && isAudioPath(value)) {
        deleteAudioFile(value);
      }

      onChange(relativePath);
    } catch (err) {
      console.error("[AudioNoteField] Failed to save recording:", err);
      Alert.alert("Save Error", "Failed to save the audio recording.");
    } finally {
      setIsPersisting(false);
    }
  };

  // Delete recorded audio handler
  const handleDeleteRecordedNote = () => {
    if (value && isAudioPath(value)) {
      deleteAudioFile(value);
    }
    onChange(null);
  };

  const hasAudioNote = value && isAudioPath(value);
  const hasLegacyTextNote = value && !isAudioPath(value) && value.trim().length > 0;

  // ── State 1: Recorded Audio Exists ─────────────────────────────────────────
  if (hasAudioNote) {
    return (
      <View style={styles.wrapper}>
        <AudioNotePlayer
          audioUri={value}
          showDelete
          onDelete={handleDeleteRecordedNote}
        />
      </View>
    );
  }

  // ── State 2: Legacy Text Note Exists ───────────────────────────────────────
  if (hasLegacyTextNote) {
    return (
      <View
        style={[
          styles.legacyContainer,
          {
            backgroundColor: colors.cardSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.legacyHeader}>
          <View style={styles.legacyTitleRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={[styles.legacyTitle, { color: colors.text }]}>
              Legacy Text Note
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.replaceButton,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            activeOpacity={0.7}
            onPress={() => onChange(null)}
          >
            <Ionicons name="mic" size={12} color={colors.primary} />
            <Text style={[styles.replaceButtonText, { color: colors.primary }]}>
              Replace with Voice
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.legacyText, { color: colors.textSecondary }]}>
          {value}
        </Text>
      </View>
    );
  }

  const isRecording = recorderState.isRecording;
  const isBusy = isPreparing || isPersisting;

  // ── State 3: Default Card / Active Recording ───────────────────────────────
  return (
    <View
      style={[
        styles.emptyContainer,
        {
          backgroundColor: colors.cardSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.emptyLeft}>
        <View
          style={[
            styles.micIconWrap,
            { backgroundColor: isDark ? "rgba(20, 184, 166, 0.12)" : "rgba(13, 148, 136, 0.08)" },
          ]}
        >
          <Ionicons name="mic-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.emptyTextCol}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Voice Note
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            {isRecording
              ? `Recording... ${formatRecordingTime(recorderState.durationMillis)}`
              : "Tap to record an audio explanation"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.recordTriggerButton,
          { backgroundColor: isRecording ? colors.danger : colors.primary },
        ]}
        activeOpacity={0.8}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
        disabled={isBusy}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={isRecording ? "stop" : "radio-button-on"}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.recordTriggerText}>
              {isRecording ? "Stop" : "Record"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  emptyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  emptyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  micIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextCol: {
    gap: 2,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 11.5,
    fontWeight: "400",
  },
  recordTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  recordTriggerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  legacyContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  legacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legacyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legacyTitle: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  replaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  replaceButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  legacyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
