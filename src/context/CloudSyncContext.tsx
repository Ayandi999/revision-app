import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import * as Network from "expo-network";
import {
  configureGoogleAuth,
  getStoredUser,
  getSyncMetadata,
  getValidAccessToken,
  isGoogleSigninSupported,
  signInSilentlyWithGoogle,
  signInWithGoogle,
  signOutFromGoogle,
  type GoogleAuthUser,
} from "@/services/googleAuth";
import {
  canSyncNow,
  restoreFromManifest,
  syncDatabaseOnly,
  syncPendingImages,
} from "@/services/backupService";
import { getPendingCount } from "@/services/imageBackupRepo";
import {
  getBackupSettings,
  setBackupEnabled as saveBackupEnabled,
  setWifiOnly as saveWifiOnly,
} from "@/services/backupSettingsRepo";
import { isAuthError } from "@/services/googleDrive";

async function withTokenRetry<T>(
  fn: (token: string) => Promise<T>,
  onProgress?: (step: string) => void
): Promise<T> {
  let token = await getValidAccessToken();
  try {
    return await fn(token);
  } catch (err: any) {
    if (isAuthError(err)) {
      onProgress?.("Refreshing authentication session...");
      token = await getValidAccessToken(true);
      return await fn(token);
    }
    throw err;
  }
}

export interface CloudSyncContextValue {
  user: GoogleAuthUser | null;
  isAuthenticated: boolean;
  isNativeSupported: boolean;
  isInitializing: boolean;
  isSigningIn: boolean;
  isSyncing: boolean;
  isRestoring: boolean;
  progressMessage: string | null;
  waitingReason: string | null;
  lastSyncAt: string | null;
  lastBackupSize: string | null;
  backupEnabled: boolean;
  wifiOnly: boolean;
  pendingCount: number;
  toggleBackupEnabled: (val: boolean) => Promise<void>;
  toggleWifiOnly: (val: boolean) => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export const CloudSyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<GoogleAuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [waitingReason, setWaitingReason] = useState<string | null>(null);

  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastBackupSize, setLastBackupSize] = useState<string | null>(null);

  const [backupEnabled, setBackupEnabled] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const isSyncingRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);
  const userRef = useRef(user);
  userRef.current = user;
  const isRestoringRef = useRef(isRestoring);
  isRestoringRef.current = isRestoring;

  const isNativeSupported = isGoogleSigninSupported();

  const loadMetadata = useCallback(async () => {
    const meta = await getSyncMetadata();
    setLastSyncAt(meta.lastSyncAt);
    setLastBackupSize(meta.lastBackupSize);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (err) {
      console.warn("[CloudSyncContext] refreshPendingCount error:", err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await getBackupSettings();
      setBackupEnabled(settings.backupEnabled);
      setWifiOnly(settings.wifiOnly);
      await refreshPendingCount();
    } catch (err) {
      console.warn("[CloudSyncContext] loadSettings error:", err);
    }
  }, [refreshPendingCount]);

  // ─── Automatic Sync Pipeline ────────────────────────────────────────────────
  const runAutoSync = useCallback(
    async (force = false) => {
      if (isSyncingRef.current || isRestoringRef.current || !userRef.current) {
        return;
      }

      // Cooldown guard: prevent automatic sync from running more than once every 45s unless forced
      const now = Date.now();
      if (!force && now - lastSyncAttemptRef.current < 45_000) {
        return;
      }
      lastSyncAttemptRef.current = now;

      const settings = await getBackupSettings();
      if (!settings.backupEnabled) {
        setWaitingReason(null);
        return;
      }

      // Check network & Wi-Fi conditions upfront BEFORE setting isSyncing
      const allowedCheck = await canSyncNow();
      if (!allowedCheck.allowed) {
        setWaitingReason(allowedCheck.reason || "Sync paused");
        // Do not turn on isSyncing if conditions are not satisfied
        return;
      }
      setWaitingReason(null);

      isSyncingRef.current = true;
      setIsSyncing(true);

      const HARD_TIMEOUT_MS = 35_000;

      try {
        await Promise.race([
          (async () => {
            // 1. Check current pending images
            const count = await getPendingCount();
            setPendingCount(count);

            // 2. Upload any pending images
            if (count > 0) {
              await syncPendingImages();
              const updatedCount = await getPendingCount();
              setPendingCount(updatedCount);
            }

            // 3. Upload standalone database snapshot if no images are pending
            await syncDatabaseOnly();

            // 4. Reload metadata
            await loadMetadata();
          })(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error("Sync operation exceeded safety timeout (35s).")
                ),
              HARD_TIMEOUT_MS
            )
          ),
        ]);
      } catch (err) {
        console.warn("[CloudSyncContext] runAutoSync error:", err);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [loadMetadata]
  );

  // ─── Network & AppState Listeners ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Trigger auto-sync when network reconnects or switches
    const netSub = Network.addNetworkStateListener((state) => {
      if (state.isConnected) {
        runAutoSync();
      }
    });

    // Trigger auto-sync when app returns to foreground
    const appSub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          runAutoSync();
        }
      }
    );

    // Initial check on login
    runAutoSync();

    return () => {
      netSub.remove();
      appSub.remove();
    };
  }, [user?.id, runAutoSync]);

  // ─── App Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const storedUser = await getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }

        if (isNativeSupported) {
          await configureGoogleAuth();

          // Silent re-auth to refresh tokens in the background
          const silentResult = await signInSilentlyWithGoogle();
          if (silentResult?.user) {
            setUser(silentResult.user);
          }
        }

        await loadMetadata();
        await loadSettings();
        if (storedUser) {
          runAutoSync(true);
        }
      } catch (err) {
        console.warn("[CloudSyncContext] Init silent sign-in error:", err);
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, [isNativeSupported, loadMetadata, loadSettings, runAutoSync]);

  // ─── Setting Toggles ────────────────────────────────────────────────────────
  const toggleBackupEnabled = useCallback(
    async (enabled: boolean) => {
      setBackupEnabled(enabled);
      await saveBackupEnabled(enabled);
      if (enabled) {
        runAutoSync(true);
      }
    },
    [runAutoSync]
  );

  const toggleWifiOnly = useCallback(
    async (wifi: boolean) => {
      setWifiOnly(wifi);
      await saveWifiOnly(wifi);
      runAutoSync(true);
    },
    [runAutoSync]
  );

  // ─── Auth Operations ────────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    if (!isNativeSupported) {
      Alert.alert(
        "Native Build Required",
        "Google Sign-In requires native compilation. Please run a native development build ('npx expo run:android' or 'npx expo run:ios')."
      );
      return false;
    }

    try {
      setIsSigningIn(true);
      const result = await signInWithGoogle();
      if (!result.success) {
        if (result.cancelled) {
          return false;
        }
        Alert.alert("Sign In Failed", result.error || "Could not link Google Drive.");
        return false;
      }
      setUser(result.user);
      await loadMetadata();
      await refreshPendingCount();
      return true;
    } catch (err: any) {
      console.error("[CloudSyncContext] Sign-in failed:", err);
      Alert.alert("Sign In Failed", err?.message || "Could not link Google Drive.");
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [isNativeSupported, loadMetadata, refreshPendingCount]);

  const signOut = useCallback(async () => {
    try {
      await signOutFromGoogle();
    } catch (err: any) {
      console.error("[CloudSyncContext] Sign-out failed:", err);
    } finally {
      setUser(null);
    }
  }, []);

  // ─── Restore Pipeline ───────────────────────────────────────────────────────
  const restore = useCallback(async () => {
    if (isSyncing || isRestoring) return;

    if (!isNativeSupported) {
      Alert.alert(
        "Native Build Required",
        "Google Drive restore requires native compilation. Please run a native development build ('npx expo run:android' or 'npx expo run:ios')."
      );
      return;
    }

    Alert.alert(
      "Restore from Drive",
      "This will replace your current local revision database and download missing images from your Google Drive backup. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            try {
              setIsRestoring(true);
              setProgressMessage("Connecting to Google Drive...");

              const result = await withTokenRetry(
                (token) =>
                  restoreFromManifest(token, (step) => {
                    setProgressMessage(step);
                  }),
                (progress) => setProgressMessage(progress)
              );

              await loadMetadata();
              await refreshPendingCount();

              Alert.alert(
                "Restore Completed",
                `Successfully restored database and verified ${result.imageCount} image(s) from your Google Drive.`
              );
            } catch (err: any) {
              console.error("[CloudSyncContext] Restore failed:", err);
              Alert.alert(
                "Restore Failed",
                err?.message || "Could not complete backup restoration. Your local data was preserved."
              );
            } finally {
              setIsRestoring(false);
              setProgressMessage(null);
            }
          },
        },
      ]
    );
  }, [isNativeSupported, isSyncing, isRestoring, loadMetadata, refreshPendingCount]);

  return (
    <CloudSyncContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
        refreshPendingCount,
        signIn,
        signOut,
        restore,
      }}
    >
      {children}
    </CloudSyncContext.Provider>
  );
};

export function useCloudSync(): CloudSyncContextValue {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error("useCloudSync must be used within a CloudSyncProvider");
  }
  return context;
}
