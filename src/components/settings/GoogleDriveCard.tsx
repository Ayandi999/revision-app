import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useTheme } from "@/context/ThemeContext";
import { GoogleDriveLogo } from "@/components/icons/GoogleDriveLogo";
import { LogoutConfirmationModal } from "@/components/settings/LogoutConfirmationModal";
import {
  RestoreConfirmationModal,
  RestoreErrorModal,
  RestoreSuccessModal,
} from "@/components/settings/RestoreModals";
import type { RestoreResult } from "@/services/backupService";
import {
  hapticError,
  hapticImpactMedium,
  hapticSelection,
  hapticSuccess,
} from "@/functions/hapticFeedback";

export const GoogleDriveCard: React.FC = () => {
  const { colors } = useTheme();
  const {
    user,
    isAuthenticated,
    isNativeSupported,
    isInitializing,
    isSigningIn,
    isSyncing,
    isRestoring,
    progressMessage,
    waitingReason,
    lastSyncAt,
    lastBackupSize,
    backupEnabled,
    wifiOnly,
    pendingCount,
    toggleBackupEnabled,
    toggleWifiOnly,
    signIn,
    signOut,
    restore,
    refreshMetadata,
  } = useCloudSync();

  React.useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata, isSyncing]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const isBusy = isSyncing || isRestoring;

  const handleConfirmRestore = async () => {
    setShowRestoreModal(false);
    try {
      const res = await restore();
      if (res) {
        hapticSuccess();
        setRestoreSuccess(res);
      }
    } catch (err: any) {
      hapticError();
      console.error("[GoogleDriveCard] Restore failed:", err);
      setRestoreError(
        err?.message || "Could not complete backup restoration. Your local data was preserved."
      );
    }
  };

  // Format date nicely
  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  if (isInitializing) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Checking Google Drive status...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* ─── Header with Top-Right Status ─────────────────────── */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.driveIconWrap,
            { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
          ]}
        >
          <GoogleDriveLogo size={20} />
        </View>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Google Drive Cloud Sync</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Sync your data with your Google Drive
          </Text>
        </View>

        {/* Top-Right Connected Status Pill */}
        {isAuthenticated ? (
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : (
          <View
            style={[
              styles.unlinkedBadge,
              { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
            ]}
          >
            <Text style={[styles.unlinkedText, { color: colors.textMuted }]}>Not Linked</Text>
          </View>
        )}
      </View>

      {/* ─── Unauthenticated State ─────────────────────────────── */}
      {!isAuthenticated ? (
        <View style={styles.unlinkedContainer}>
          {!isNativeSupported && (
            <View style={styles.nativeWarningBadge}>
              <Ionicons name="construct-outline" size={14} color="#F59E0B" />
              <Text style={styles.nativeWarningText}>
                Native build required: Run &apos;npx expo run:android&apos; or &apos;npx expo run:ios&apos; to enable Google Sign-In in your dev client.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.signInButton}
            onPress={signIn}
            disabled={isSigningIn}
            activeOpacity={0.8}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text style={styles.signInButtonText}>Link Google Drive</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* ─── Authenticated State ───────────────────────────────── */
        <View style={styles.linkedContainer}>
          {/* User profile info */}
          <View style={[styles.userRow, { backgroundColor: colors.cardSecondary }]}>
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                style={styles.userAvatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarFallbackText}>
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user?.name || "Google User"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          {/* Sync status overview */}
          <View style={[styles.statsRow, { backgroundColor: colors.cardSecondary }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>LAST SYNCED</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formattedLastSync}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>BACKUP SIZE</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{lastBackupSize || "0 B"}</Text>
            </View>
          </View>

          {/* Image Sync Status Badge */}
          <View
            style={[
              styles.syncStatusBadge,
              { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
            ]}
          >
            {isSyncing ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.syncStatusText}>Backing up changes...</Text>
              </>
            ) : waitingReason && pendingCount > 0 ? (
              <>
                <Ionicons name="wifi-outline" size={16} color="#F59E0B" />
                <Text style={styles.syncStatusPendingText}>
                  {waitingReason} ({pendingCount} queued)
                </Text>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#F59E0B" />
                <Text style={styles.syncStatusPendingText}>
                  {pendingCount} {pendingCount === 1 ? "image" : "images"} queued for cloud backup
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                <Text style={styles.syncStatusCompleteText}>All images backed up</Text>
              </>
            )}
          </View>

          {/* Auto Backup & Wi-Fi Settings Toggles */}
          <View
            style={[
              styles.settingsSection,
              { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Auto Backup</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Automatically upload images and data in background
                </Text>
              </View>
              <Switch
                value={backupEnabled}
                onValueChange={(val) => {
                  hapticSelection();
                  toggleBackupEnabled(val);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={backupEnabled ? "#FFFFFF" : colors.textMuted}
                style={styles.compactSwitch}
              />
            </View>

            {backupEnabled && (
              <View style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Wi-Fi Only</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                    Only upload when connected to Wi-Fi to save mobile data
                  </Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={(val) => {
                    hapticSelection();
                    toggleWifiOnly(val);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={wifiOnly ? "#FFFFFF" : colors.textMuted}
                  style={styles.compactSwitch}
                />
              </View>
            )}
          </View>

          {/* Progress message banner */}
          {isBusy && progressMessage && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.progressText}>{progressMessage}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {/* Full-width Restore Button */}
            <TouchableOpacity
              style={[
                styles.restoreButtonFull,
                { backgroundColor: colors.cardSecondary, borderColor: colors.cardSecondaryBorder },
                isBusy && styles.buttonDisabled,
              ]}
              onPress={() => {
                hapticImpactMedium();
                setShowRestoreModal(true);
              }}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isRestoring ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.restoreButtonText, { color: colors.text }]}>Restoring Backup...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={colors.primary} />
                  <Text style={[styles.restoreButtonText, { color: colors.text }]}>Restore Cloud Backup</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Subtle Compact Logout Link Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => setShowLogoutModal(true)}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={14} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={signOut}
      />

      {/* Restore Confirmation Modal */}
      <RestoreConfirmationModal
        visible={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleConfirmRestore}
      />

      {/* Restore Success Modal */}
      <RestoreSuccessModal
        visible={!!restoreSuccess}
        onClose={() => setRestoreSuccess(null)}
        questionCount={restoreSuccess?.questionCount ?? 0}
        imageCount={restoreSuccess?.imageCount ?? 0}
      />

      {/* Restore Error Modal */}
      <RestoreErrorModal
        visible={!!restoreError}
        onClose={() => setRestoreError(null)}
        errorMessage={restoreError || ""}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A22",
    borderRadius: 0,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  driveIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 4,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignSelf: "flex-start",
  },
  connectedDot: {
    width: 4,
    height: 4,
    borderRadius: 0,
    backgroundColor: "#10B981",
  },
  connectedText: {
    color: "#10B981",
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  unlinkedBadge: {
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    alignSelf: "flex-start",
  },
  unlinkedText: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  unlinkedContainer: {
    marginTop: 10,
    gap: 8,
  },
  nativeWarningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 0,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  nativeWarningText: {
    color: "#FBBF24",
    fontSize: 10.5,
    fontWeight: "500",
    flex: 1,
    lineHeight: 15,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 0,
    paddingVertical: 8,
    gap: 6,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  linkedContainer: {
    marginTop: 10,
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 7,
    borderRadius: 0,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  userEmail: {
    color: "#64748B",
    fontSize: 10.5,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 8,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: {
    color: "#E2E8F0",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 1,
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  syncStatusText: {
    color: "#93C5FD",
    fontSize: 10.5,
    fontWeight: "500",
  },
  syncStatusPendingText: {
    color: "#FBBF24",
    fontSize: 10.5,
    fontWeight: "500",
  },
  syncStatusCompleteText: {
    color: "#10B981",
    fontSize: 10.5,
    fontWeight: "500",
  },
  settingsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  settingTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  settingSubtitle: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 1,
    lineHeight: 13,
  },
  compactSwitch: {
    transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  progressText: {
    color: "#93C5FD",
    fontSize: 10.5,
    fontWeight: "500",
    flex: 1,
  },
  actionsContainer: {
    gap: 6,
    marginTop: 2,
  },
  restoreButtonFull: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 0,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  restoreButtonText: {
    color: "#CBD5E1",
    fontSize: 11.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  logoutButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 0,
    paddingVertical: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginTop: 0,
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
