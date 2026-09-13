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
import { GoogleDriveLogo } from "@/components/icons/GoogleDriveLogo";
import { LogoutConfirmationModal } from "@/components/settings/LogoutConfirmationModal";

export const GoogleDriveCard: React.FC = () => {
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
  } = useCloudSync();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isBusy = isSyncing || isRestoring;

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
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Checking Google Drive status...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* ─── Header with Top-Right Status ─────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={styles.driveIconWrap}>
          <GoogleDriveLogo size={20} />
        </View>
        <View style={styles.headerTextGroup}>
          <Text style={styles.cardTitle}>Google Drive Cloud Sync</Text>
          <Text style={styles.cardSubtitle}>
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
          <View style={styles.unlinkedBadge}>
            <Text style={styles.unlinkedText}>Not Linked</Text>
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

          <View style={styles.privacyBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
            <Text style={styles.privacyText}>
              Private app scope • Cannot view or modify your personal files
            </Text>
          </View>

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
          <View style={styles.userRow}>
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                style={styles.userAvatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || "Google User"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          {/* Sync status overview */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>LAST SYNCED</Text>
              <Text style={styles.statValue}>{formattedLastSync}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>BACKUP SIZE</Text>
              <Text style={styles.statValue}>{lastBackupSize || "—"}</Text>
            </View>
          </View>

          {/* Image Sync Status Badge */}
          <View style={styles.syncStatusBadge}>
            {isSyncing ? (
              <>
                <ActivityIndicator size="small" color="#3B82F6" />
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
          <View style={styles.settingsSection}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Auto Backup</Text>
                <Text style={styles.settingSubtitle}>
                  Automatically upload images and data in background
                </Text>
              </View>
              <Switch
                value={backupEnabled}
                onValueChange={toggleBackupEnabled}
                trackColor={{ false: "#334155", true: "#2563EB" }}
                thumbColor={backupEnabled ? "#FFFFFF" : "#94A3B8"}
                style={styles.compactSwitch}
              />
            </View>

            {backupEnabled && (
              <View style={[styles.settingRow, styles.settingRowBorder]}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Wi-Fi Only</Text>
                  <Text style={styles.settingSubtitle}>
                    Only upload when connected to Wi-Fi to save mobile data
                  </Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={toggleWifiOnly}
                  trackColor={{ false: "#334155", true: "#2563EB" }}
                  thumbColor={wifiOnly ? "#FFFFFF" : "#94A3B8"}
                  style={styles.compactSwitch}
                />
              </View>
            )}
          </View>

          {/* Progress message banner */}
          {isBusy && progressMessage && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.progressText}>{progressMessage}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {/* Full-width Restore Button */}
            <TouchableOpacity
              style={[styles.restoreButtonFull, isBusy && styles.buttonDisabled]}
              onPress={restore}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={16} color="#CBD5E1" />
                  <Text style={styles.restoreButtonText}>Restore from Drive</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Unlink / Logout Button at bottom */}
            <TouchableOpacity
              style={[styles.logoutButton, isBusy && styles.buttonDisabled]}
              onPress={() => setShowLogoutModal(true)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={15} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stylized App Theme Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={signOut}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    padding: 12,
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
    width: 32,
    height: 32,
    borderRadius: 8,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignSelf: "flex-start",
  },
  connectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    alignSelf: "flex-start",
  },
  unlinkedText: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "600",
  },
  unlinkedContainer: {
    marginTop: 10,
    gap: 8,
  },
  nativeWarningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  privacyText: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "500",
    flex: 1,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  linkedContainer: {
    marginTop: 10,
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 8,
    borderRadius: 10,
    gap: 10,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  userEmail: {
    color: "#64748B",
    fontSize: 11,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 8,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValue: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  syncStatusText: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "500",
  },
  syncStatusPendingText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "500",
  },
  syncStatusCompleteText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "500",
  },
  settingsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
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
    fontSize: 12.5,
    fontWeight: "600",
  },
  settingSubtitle: {
    color: "#64748B",
    fontSize: 10.5,
    marginTop: 1,
    lineHeight: 14,
  },
  compactSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  progressText: {
    color: "#93C5FD",
    fontSize: 11,
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
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  restoreButtonText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 8,
    paddingVertical: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginTop: 0,
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
