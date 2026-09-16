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
          onPress={onDelete}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  containerCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 8,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  trackContent: {
    flex: 1,
    gap: 6,
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
    fontSize: 13,
    fontWeight: "600",
  },
  voiceLabelCompact: {
    fontSize: 11.5,
  },
  timeText: {
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  timeTextCompact: {
    fontSize: 10.5,
  },
  progressBarWrapper: {
    paddingVertical: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
