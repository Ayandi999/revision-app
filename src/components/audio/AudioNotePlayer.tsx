import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useTheme } from "@/context/ThemeContext";
import { resolveAudioUri } from "@/functions/audioHelpers";
import { hapticSelection } from "@/functions/hapticFeedback";

interface AudioNotePlayerProps {
  audioUri: string | null | undefined;
  compact?: boolean;
  onDelete?: () => void;
  showDelete?: boolean;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const AudioNotePlayer: React.FC<AudioNotePlayerProps> = ({
  audioUri,
  compact = false,
  onDelete,
  showDelete = false,
}) => {
  const { colors } = useTheme();

  // Resolve relative path (e.g. "revision-app/audio/note_123.m4a") to file:// URI
  const resolvedUri = useMemo(() => resolveAudioUri(audioUri), [audioUri]);

  // Hook automatically manages player lifecycle and cleanup
  const player = useAudioPlayer(resolvedUri ?? undefined);
  const status = useAudioPlayerStatus(player);

  const durationSec = status.duration > 0 ? status.duration : 0;
  const currentSec = status.currentTime > 0 ? status.currentTime : 0;
  const progressPercent =
    durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  const handleTogglePlay = () => {
    if (!resolvedUri) return;
    hapticSelection();
    if (status.playing) {
      player.pause();
    } else {
      // If reached the end, seek back to 0 before playing
      if (durationSec > 0 && currentSec >= durationSec - 0.2) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const handleSeek = (percentage: number) => {
    if (durationSec > 0) {
      hapticSelection();
      const target = (percentage / 100) * durationSec;
      player.seekTo(target);
    }
  };

  if (!resolvedUri) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        compact ? styles.containerCompact : null,
        {
          backgroundColor: colors.cardSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {/* ── Play / Pause Button ────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.playButton,
          compact && styles.playButtonCompact,
          { backgroundColor: colors.primary },
        ]}
        activeOpacity={0.8}
        onPress={handleTogglePlay}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={compact ? 16 : 20}
          color="#FFFFFF"
          style={!status.playing ? { marginLeft: 2 } : undefined}
        />
      </TouchableOpacity>

      {/* ── Progress & Waveform Track ──────────────────────────────── */}
      <View style={styles.trackContent}>
        <View style={styles.topRow}>
          <View style={styles.metaRow}>
            <Ionicons
              name="mic"
              size={compact ? 12 : 14}
              color={colors.primary}
            />
            <Text
              style={[
                styles.voiceLabel,
                compact && styles.voiceLabelCompact,
                { color: colors.text },
              ]}
            >
              Voice Note
            </Text>
          </View>
          <Text
            style={[
              styles.timeText,
              compact && styles.timeTextCompact,
              { color: colors.textTertiary },
            ]}
          >
            {formatDuration(currentSec)}{" "}
            {durationSec > 0 ? `/ ${formatDuration(durationSec)}` : ""}
          </Text>
        </View>

        {/* Clickable Progress Bar */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.progressBarWrapper}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            // Approximate bar width
            const estimatedWidth = compact ? 160 : 200;
            const pct = Math.max(0, Math.min(100, (locationX / estimatedWidth) * 100));
            handleSeek(pct);
          }}
        >
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.borderSubtle },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Optional Delete Button ─────────────────────────────────── */}
      {showDelete && onDelete && (
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => {
            hapticSelection();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    gap: 10,
  },
  containerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 0,
    gap: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonCompact: {
    width: 26,
    height: 26,
    borderRadius: 0,
  },
  trackContent: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  voiceLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  voiceLabelCompact: {
    fontSize: 11,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  timeTextCompact: {
    fontSize: 10,
  },
  progressBarWrapper: {
    paddingVertical: 3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 0,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 0,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
