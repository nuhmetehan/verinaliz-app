import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { isAxiosError } from 'axios';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { createSessionStorage } from './sessionStorage';
import { validateAuthRedirect } from './authRedirect';

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_SESSION_STORAGE_KEY = '@nutriveri_auth_session';
const DAILY_QUOTA_STORAGE_KEY = '@nutriveri_daily_quota';
const SECURE_SESSION_KEY = 'verinaliz.auth.session';
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
// SecureStore is native-only. Web sessions stay in memory instead of exposing
// refresh tokens in localStorage; a page reload requires another sign-in.
let webSession: string | null = null;
const sessionStorage = createSessionStorage({
  readSecure: () => Platform.OS === 'web'
    ? Promise.resolve(webSession) : SecureStore.getItemAsync(SECURE_SESSION_KEY, secureOptions),
  writeSecure: async (value) => {
    if (Platform.OS === 'web') webSession = value;
    else await SecureStore.setItemAsync(SECURE_SESSION_KEY, value, secureOptions);
  },
  removeSecure: async () => {
    if (Platform.OS === 'web') webSession = null;
    else await SecureStore.deleteItemAsync(SECURE_SESSION_KEY, secureOptions);
  },
  readLegacy: () => AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY),
  removeLegacy: () => AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY),
});

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user: AuthUser;
};

export type QuotaInfo = {
  total: number;
  remaining: number;
  meal_total?: number;
  meal_remaining?: number;
};

type AuthListener = (session: AuthSession | null) => void;
const authListeners = new Set<AuthListener>();

function notifyAuthListeners(session: AuthSession | null) {
  authListeners.forEach((listener) => {
    try {
      listener(session);
    } catch (err) {
      console.error('Auth listener hatası:', err);
    }
  });
}

export function subscribeAuthChanges(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await sessionStorage.read();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.access_token && parsed?.user?.id) {
      return parsed;
    }
    await sessionStorage.clear();
    return null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await sessionStorage.write(JSON.stringify(session));
  notifyAuthListeners(session);
}

export async function signOut(): Promise<void> {
  await sessionStorage.clear();
  await AsyncStorage.removeItem(DAILY_QUOTA_STORAGE_KEY);
  notifyAuthListeners(null);
}

/**
 * Geçerli bir access_token döndürür. Süresi dolmuşsa refresh_token ile yeniler.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = await getStoredAuthSession();
  if (!session) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpiringSoon =
    typeof session.expires_at === 'number' && session.expires_at - nowSeconds < 60;

  if (!isExpiringSoon) {
    return session.access_token;
  }

  if (!session.refresh_token) {
    return session.access_token;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/refresh`,
      { refresh_token: session.refresh_token },
      { timeout: 10000 },
    );

    if (response.data?.access_token) {
      const updatedSession: AuthSession = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token ?? session.refresh_token,
        expires_at: response.data.expires_at ?? null,
        user: response.data.user ?? session.user,
      };
      await saveAuthSession(updatedSession);
      return updatedSession.access_token;
    }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      await signOut();
      return null;
    }
  }

  return session.access_token;
}

/**
 * Callback URL içindeki (#access_token=... veya ?access_token=...) parametreleri ayrıştırır.
 */
export function extractParamsFromAuthUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const hashString = url.slice(hashIndex + 1);
    const searchParams = new URLSearchParams(hashString);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : url.length;
    const queryString = url.slice(queryIndex + 1, end);
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      if (!params[key]) {
        params[key] = value;
      }
    });
  }

  return params;
}

/**
 * Doğrudan token parametreleriyle kullanıcı profilini ve kotasını sunucudan çeker ve kaydeder.
 */
export async function completeAuthWithTokens(params: {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string | number;
  expires_in?: string | number;
}): Promise<{ session: AuthSession; quota: QuotaInfo } | null> {
  const accessToken = params.access_token;
  if (!accessToken) {
    return null;
  }

  const refreshToken = params.refresh_token || null;
  const expiresAt = params.expires_at
    ? Number(params.expires_at)
    : params.expires_in
      ? Math.floor(Date.now() / 1000) + Number(params.expires_in)
      : null;

  const response = await axios.get(`${API_BASE_URL}/api/analysis-quota`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10000,
  });

  const user: AuthUser = response.data?.user ?? {
    id: 'unknown',
    email: null,
    name: 'Verinaliz Kullanıcısı',
    avatar_url: null,
  };

  const quota: QuotaInfo = {
    total: response.data?.total ?? 5,
    remaining: response.data?.remaining ?? 5,
    meal_total: response.data?.meal_total ?? 2,
    meal_remaining: response.data?.meal_remaining ?? 2,
  };

  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user,
  };

  await saveAuthSession(session);
  return { session, quota };
}

/**
 * Callback URL'den gelen token bilgileriyle kullanıcı profilini ve kotasını sunucudan çeker ve kaydeder.
 */
export async function completeAuthFromCallbackUrl(
  url: string,
): Promise<{ session: AuthSession; quota: QuotaInfo } | null> {
  const params = extractParamsFromAuthUrl(url);
  return await completeAuthWithTokens(params);
}

/** Pre-created email accounts use the same verified profile and secure session. */
export async function signInWithEmail(email: string, password: string): Promise<{
  session: AuthSession; quota: QuotaInfo;
}> {
  const response = await axios.post(`${API_BASE_URL}/api/auth/password`, {
    email: email.trim().toLowerCase(), password,
  }, { timeout: 15000 });
  const result = await completeAuthWithTokens(response.data);
  if (!result || result.session.user.id === 'unknown') {
    await signOut();
    throw new Error('Giriş doğrulanamadı. Lütfen tekrar deneyin.');
  }
  return result;
}

/**
 * Google ile giriş akışını başlatır.
 */
export async function signInWithGoogle(): Promise<{
  session: AuthSession;
  quota: QuotaInfo;
} | null> {
  const redirectUri = Linking.createURL('auth-callback');
  validateAuthRedirect(redirectUri);
  const endpoint = `${API_BASE_URL}/api/auth/google?format=json&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Railway URL'sinin tarayıcıda görünmemesi için doğrudan OAuth URL'sini arka planda al
  let authUrl = `${API_BASE_URL}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  try {
    const res = await axios.get<{ url?: string }>(endpoint, { timeout: 8000 });
    if (res.data?.url) {
      authUrl = res.data.url;
    }
  } catch {
    // Fallback olarak doğrudan yönlendirme URL'si kullanılır
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    return await completeAuthFromCallbackUrl(result.url);
  }

  return null;
}

/**
 * Hesabı kalıcı olarak siler: sunucudaki hesap ve kota kayıtları kaldırılır,
 * ardından cihazdaki oturum ve yerel kota kopyası temizlenir.
 * Cihazdaki geçmiş/favoriler ayrıca `clearLocalData` ile silinir.
 */
export async function deleteAccount(): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }

  await axios.delete(`${API_BASE_URL}/api/account`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });

  await signOut();
}
