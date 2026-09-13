import { Platform, TurboModuleRegistry } from "react-native";
import * as SecureStore from "expo-secure-store";

// ─── Constants & Storage Keys ──────────────────────────────────────────────────

export const GOOGLE_DRIVE_APPDATA_SCOPE =
  "https://www.googleapis.com/auth/drive.appdata";

const SECURE_KEY_USER = "revlog_google_user";
const SECURE_KEY_SYNC_META = "revlog_sync_metadata";

export interface GoogleAuthUser {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
}

export interface SyncMetadata {
  lastSyncAt: string | null;
  lastBackupSize: string | null;
  lastBackupId: string | null;
}

export type SignInResult =
  | { success: true; user: GoogleAuthUser; accessToken: string }
  | { success: false; cancelled: true; error?: undefined }
  | { success: false; cancelled?: false; error: string };

// ─── Native Availability Check ────────────────────────────────────────────────

/**
 * Checks whether the native Google Sign-In TurboModule is present in the running binary.
 *
 * NOTE: Relies on the internal TurboModule name 'RNGoogleSignin' used by
 * @react-native-google-signin/google-signin. This guard allows the app to load and show
 * friendly setup instructions instead of crashing with an Invariant Violation if the dev
 * client has not yet been compiled with native dependencies.
 */
export function isGoogleSigninSupported(): boolean {
  try {
    return !!TurboModuleRegistry.get("RNGoogleSignin");
  } catch {
    return false;
  }
}

// ─── Module & Token Caching ───────────────────────────────────────────────────

let googleSigninModule: typeof import("@react-native-google-signin/google-signin") | null = null;

async function getGoogleSigninModule() {
  if (!isGoogleSigninSupported()) {
    throw new Error(
      "Native Google Sign-In module is not registered in this build. Please run a native development build ('npx expo run:android' or 'npx expo run:ios')."
    );
  }
  if (!googleSigninModule) {
    googleSigninModule = await import("@react-native-google-signin/google-signin");
  }
  return googleSigninModule;
}

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0; // Epoch timestamp (ms)

function setCachedToken(token: string, expiresInSeconds = 3500): void {
  cachedAccessToken = token;
  // Expire 100 seconds before standard 1hr token lifetime for safety margin
  cachedTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
}

export function clearCachedToken(): void {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
}

// ─── Initialization with Concurrency Guard ────────────────────────────────────

let configurePromise: Promise<boolean> | null = null;

/**
 * Configures Google Sign-In with drive.appdata scope.
 * Cached in-flight promise ensures parallel callers do not run configure() redundantly.
 */
export function configureGoogleAuth(webClientId?: string): Promise<boolean> {
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    if (!isGoogleSigninSupported()) return false;

    const clientId =
      webClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      "";

    try {
      const { GoogleSignin } = await getGoogleSigninModule();
      GoogleSignin.configure({
        scopes: [GOOGLE_DRIVE_APPDATA_SCOPE],
        webClientId: clientId || undefined,
        offlineAccess: false,
      });
      return true;
    } catch (error) {
      console.error("[googleAuth] Failed to configure GoogleSignin:", error);
      configurePromise = null; // Allow retry on failure
      return false;
    }
  })();

  return configurePromise;
}

export async function ensureConfigured(webClientId?: string): Promise<boolean> {
  return configureGoogleAuth(webClientId);
}

// ─── Authentication Methods ───────────────────────────────────────────────────

/**
 * Interactive sign-in flow. Launches Google Account picker.
 * Gracefully captures cancellation without throwing error toasts.
 * Calls addScopes() on iOS where non-basic scopes are not granted from configure() alone.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  if (!isGoogleSigninSupported()) {
    return {
      success: false,
      error:
        "Native Google Sign-In is not compiled into this development build. Please run 'npx expo run:android' to rebuild.",
    };
  }

  await ensureConfigured();

  try {
    const { GoogleSignin } = await getGoogleSigninModule();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // Check cancellation response shape in newer SDK versions
    if ((response as any).type === "cancelled") {
      return { success: false, cancelled: true };
    }

    // 1. Missing iOS scope consent fix:
    // On iOS, Google Sign-In SDK requires explicit addScopes() for non-profile scopes
    if (Platform.OS === "ios") {
      try {
        const scopeResult = await GoogleSignin.addScopes({
          scopes: [GOOGLE_DRIVE_APPDATA_SCOPE],
        });
        if ((scopeResult as any)?.type === "cancelled") {
          return { success: false, cancelled: true };
        }
      } catch (scopeErr: any) {
        const mod = await getGoogleSigninModule();
        if (scopeErr?.code === mod.statusCodes.SIGN_IN_CANCELLED) {
          return { success: false, cancelled: true };
        }
        console.error("[googleAuth] addScopes on iOS failed:", scopeErr);
        return {
          success: false,
          error: "Google Drive access was not granted. Please try again.",
        };
      }
    }

    const userData: any = (response as any).data || response;
    const tokens = await GoogleSignin.getTokens();

    const authUser: GoogleAuthUser = {
      id: userData.user.id,
      name: userData.user.name,
      email: userData.user.email,
      photo: userData.user.photo,
    };

    setCachedToken(tokens.accessToken);
    await saveStoredUser(authUser);

    return {
      success: true,
      user: authUser,
      accessToken: tokens.accessToken,
    };
  } catch (error: any) {
    const mod = await getGoogleSigninModule();
    if (error.code === mod.statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }
    console.error("[googleAuth] signInWithGoogle error:", error);
    return {
      success: false,
      error: error?.message || "Sign in failed.",
    };
  }
}

let silentSignInPromise: Promise<{
  user: GoogleAuthUser;
  accessToken: string;
} | null> | null = null;

let getAccessTokenPromise: Promise<string> | null = null;

/**
 * Silent sign-in flow. Restores session without user interaction.
 * Uses native SDK's internal token refresh mechanism.
 * Guarded against concurrent in-flight calls to avoid overwriting native promises.
 */
export async function signInSilentlyWithGoogle(): Promise<{
  user: GoogleAuthUser;
  accessToken: string;
} | null> {
  if (!isGoogleSigninSupported()) return null;
  if (silentSignInPromise) return silentSignInPromise;

  silentSignInPromise = (async () => {
    await ensureConfigured();

    try {
      const { GoogleSignin } = await getGoogleSigninModule();
      const response = await GoogleSignin.signInSilently();
      const userData: any = (response as any).data || response;
      const tokens = await GoogleSignin.getTokens();

      const authUser: GoogleAuthUser = {
        id: userData.user.id,
        name: userData.user.name,
        email: userData.user.email,
        photo: userData.user.photo,
      };

      setCachedToken(tokens.accessToken);
      await saveStoredUser(authUser);

      return {
        user: authUser,
        accessToken: tokens.accessToken,
      };
    } catch (error: any) {
      const mod = await getGoogleSigninModule();
      if (error.code === mod.statusCodes.SIGN_IN_REQUIRED) {
        return null;
      }
      console.warn("[googleAuth] Silent sign-in warning:", error?.message || error);
      return null;
    } finally {
      silentSignInPromise = null;
    }
  })();

  return silentSignInPromise;
}

/**
 * Retrieves a valid, unexpired access token for Google API calls.
 * Checks token age against expiry, supports forceRefresh, and invokes silent re-auth as needed.
 * Guarded against concurrent in-flight calls to avoid overlapping getTokens() calls.
 */
export async function getValidAccessToken(forceRefresh = false): Promise<string> {
  if (!isGoogleSigninSupported()) {
    throw new Error(
      "Native Google Sign-In is not compiled into this build. Run 'npx expo run:android' to build."
    );
  }

  // 2. Token expiry check:
  // If token is still valid (with 2-minute buffer) and forceRefresh is false, return cached token immediately
  const isStillValid =
    cachedAccessToken && Date.now() < cachedTokenExpiresAt - 120_000;
  if (isStillValid && !forceRefresh) {
    return cachedAccessToken!;
  }

  if (getAccessTokenPromise && !forceRefresh) {
    return getAccessTokenPromise;
  }

  getAccessTokenPromise = (async () => {
    try {
      await ensureConfigured();
      const { GoogleSignin } = await getGoogleSigninModule();

      // If forceRefresh was requested, clear token cache from native SDK if possible
      if (forceRefresh && cachedAccessToken) {
        try {
          await GoogleSignin.clearCachedAccessToken(cachedAccessToken);
        } catch {
          // Best-effort cleanup
        }
        clearCachedToken();
      }

      // Silent re-auth to fetch a fresh token
      const silentResult = await signInSilentlyWithGoogle();
      if (silentResult?.accessToken) {
        setCachedToken(silentResult.accessToken);
        return silentResult.accessToken;
      }

      // Fallback to getTokens()
      try {
        const tokens = await GoogleSignin.getTokens();
        if (tokens.accessToken) {
          setCachedToken(tokens.accessToken);
          return tokens.accessToken;
        }
      } catch {
        // Handled below
      }

      throw new Error("Authentication required or expired. Please sign in again.");
    } finally {
      getAccessTokenPromise = null;
    }
  })();

  return getAccessTokenPromise;
}

/**
 * Signs the user out from Google and clears secure storage.
 */
export async function signOutFromGoogle(): Promise<void> {
  clearCachedToken();

  if (isGoogleSigninSupported()) {
    try {
      const { GoogleSignin } = await getGoogleSigninModule();
      await GoogleSignin.signOut();
    } catch (err) {
      console.warn("[googleAuth] Error during native signOut:", err);
    }
  }

  await clearStoredUser();
}

// ─── SecureStore Session Helpers ──────────────────────────────────────────────

export async function getStoredUser(): Promise<GoogleAuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveStoredUser(user: GoogleAuthUser): Promise<void> {
  try {
    await SecureStore.setItemAsync(SECURE_KEY_USER, JSON.stringify(user));
  } catch (error) {
    console.error("[googleAuth] Failed to save user to SecureStore:", error);
  }
}

export async function clearStoredUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEY_USER);
  } catch (error) {
    console.error("[googleAuth] Failed to clear user from SecureStore:", error);
  }
}

// 7. Single SecureStore key for sync metadata (1 round-trip instead of 3)
export async function getSyncMetadata(): Promise<SyncMetadata> {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_KEY_SYNC_META);
    if (raw) return JSON.parse(raw);

    // Backwards-compatibility: migrate legacy separate keys if present
    const [legacySync, legacySize, legacyId] = await Promise.all([
      SecureStore.getItemAsync("revlog_last_sync_at"),
      SecureStore.getItemAsync("revlog_last_backup_size"),
      SecureStore.getItemAsync("revlog_last_backup_id"),
    ]);

    if (legacySync || legacySize || legacyId) {
      const migrated: SyncMetadata = {
        lastSyncAt: legacySync,
        lastBackupSize: legacySize,
        lastBackupId: legacyId,
      };
      await saveSyncMetadata(migrated);
      return migrated;
    }

    return { lastSyncAt: null, lastBackupSize: null, lastBackupId: null };
  } catch {
    return { lastSyncAt: null, lastBackupSize: null, lastBackupId: null };
  }
}

export async function saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      SECURE_KEY_SYNC_META,
      JSON.stringify(metadata)
    );
  } catch (error) {
    console.error("[googleAuth] Failed to save sync metadata to SecureStore:", error);
  }
}
