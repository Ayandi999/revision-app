import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useCloudSync } from "@/hooks/useCloudSync";

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
    lastSyncAt,
    lastBackupSize,
    signIn,
    signOut,
    sync,
    restore,
  } = useCloudSync();

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
      {/* ─── Header ────────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={styles.driveIconWrap}>
          <Ionicons name="cloud-done-outline" size={20} color="#3B82F6" />
        </View>
        <View style={styles.headerTextGroup}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Google Drive Cloud Sync</Text>
            {isAuthenticated && (
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle}>
            {isAuthenticated
              ? "Your data is privately backed up to your Google Drive App Data folder"
              : "Link your Google account to back up questions and diagrams securely"}
          </Text>
        </View>
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
          {/* User profile row */}
          <View style={styles.userRow}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.userAvatar} />
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

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={signOut}
              disabled={isBusy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={16} color="#94A3B8" />
              <Text style={styles.disconnectText}>Unlink</Text>
            </TouchableOpacity>
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

          {/* Progress message banner */}
          {isBusy && progressMessage && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.progressText}>{progressMessage}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.syncButton, isBusy && styles.buttonDisabled]}
              onPress={sync}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.syncButtonText}>Sync Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.restoreButton, isBusy && styles.buttonDisabled]}
              onPress={restore}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#94A3B8" />
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A22",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  driveIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerTextGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  connectedText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  unlinkedContainer: {
    marginTop: 16,
    gap: 12,
  },
  nativeWarningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  nativeWarningText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  privacyText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  linkedContainer: {
    marginTop: 16,
    gap: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 14,
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
    marginTop: 1,
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  disconnectText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 12,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValue: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  progressText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  syncButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  restoreButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  restoreButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
