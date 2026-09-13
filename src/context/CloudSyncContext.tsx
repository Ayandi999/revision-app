import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
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
import { createBackup, restoreBackup } from "@/services/backupService";
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
  lastSyncAt: string | null;
  lastBackupSize: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  sync: () => Promise<void>;
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

  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastBackupSize, setLastBackupSize] = useState<string | null>(null);

  const isNativeSupported = isGoogleSigninSupported();

  const loadMetadata = useCallback(async () => {
    const meta = await getSyncMetadata();
    setLastSyncAt(meta.lastSyncAt);
    setLastBackupSize(meta.lastBackupSize);
  }, []);

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
      } catch (err) {
        console.warn("[CloudSyncContext] Init silent sign-in error:", err);
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, [isNativeSupported, loadMetadata]);

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
      return true;
    } catch (err: any) {
      console.error("[CloudSyncContext] Sign-in failed:", err);
      Alert.alert("Sign In Failed", err?.message || "Could not link Google Drive.");
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [isNativeSupported, loadMetadata]);

  const signOut = useCallback(async () => {
    try {
      await signOutFromGoogle();
    } catch (err: any) {
      console.error("[CloudSyncContext] Sign-out failed:", err);
    } finally {
      setUser(null);
    }
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing || isRestoring) return;

    if (!isNativeSupported) {
      Alert.alert(
        "Native Build Required",
        "Google Drive sync requires native compilation. Please run a native development build ('npx expo run:android' or 'npx expo run:ios')."
      );
      return;
    }

    try {
      setIsSyncing(true);
      setProgressMessage("Connecting to Google Drive...");

      const result = await withTokenRetry(
        (token) =>
          createBackup(token, (step) => {
            setProgressMessage(step);
          }),
        (progress) => setProgressMessage(progress)
      );

      setLastSyncAt(result.syncedAt);
      setLastBackupSize(result.sizeFormatted);

      Alert.alert(
        "Backup Successful",
        `Your database and ${result.imageCount} image(s) have been backed up to Google Drive (${result.sizeFormatted}).`
      );
    } catch (err: any) {
      console.error("[CloudSyncContext] Sync failed:", err);
      Alert.alert(
        "Sync Failed",
        err?.message || "An unexpected error occurred during sync. Your local data was not affected."
      );
    } finally {
      setIsSyncing(false);
      setProgressMessage(null);
    }
  }, [isNativeSupported, isSyncing, isRestoring]);

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
      "Restore Backup",
      "This will replace your current local revision database and images with the latest version from your Google Drive. Continue?",
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
                  restoreBackup(token, (step) => {
                    setProgressMessage(step);
                  }),
                (progress) => setProgressMessage(progress)
              );

              await loadMetadata();

              Alert.alert(
                "Restore Completed",
                `Successfully restored database and ${result.imageCount} image(s) from your Google Drive.`
              );
            } catch (err: any) {
              console.error("[CloudSyncContext] Restore failed:", err);
              Alert.alert(
                "Restore Failed",
                err?.message || "Could not complete backup restoration."
              );
            } finally {
              setIsRestoring(false);
              setProgressMessage(null);
            }
          },
        },
      ]
    );
  }, [isNativeSupported, isSyncing, isRestoring, loadMetadata]);

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
        lastSyncAt,
        lastBackupSize,
        signIn,
        signOut,
        sync,
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
