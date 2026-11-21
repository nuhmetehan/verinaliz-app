import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { isAxiosError } from 'axios';
import * as Crypto from 'expo-crypto';
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
  label_pending?: number;
  meal_pending?: number;
  next_available_at?: string | null;
  meal_next_available_at?: string | null;
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

  const user: AuthUser = response.data?.user;
  if (!user?.id) throw new Error('Giriş doğrulanamadı.');

  const quota: QuotaInfo = {
    total: response.data?.total ?? 3,
    remaining: response.data?.remaining ?? 0,
    meal_total: response.data?.meal_total ?? 2,
    meal_remaining: response.data?.meal_remaining ?? 0,
    label_pending: response.data?.label_pending,
    meal_pending: response.data?.meal_pending,
    next_available_at: response.data?.next_available_at ?? null,
    meal_next_available_at: response.data?.meal_next_available_at ?? null,
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

type SignInResult = { session: AuthSession; quota: QuotaInfo };
const PKCE_KEY = 'verinaliz.oauth.pkce';
const LOGIN_TTL = 10 * 60 * 1000;
let webPending: string | null = null;
let callback: { code: string; result: Promise<SignInResult> } | null = null;

async function setPending(value: string | null) {
  if (Platform.OS === 'web') webPending = value;
  else if (value) await SecureStore.setItemAsync(PKCE_KEY, value, secureOptions);
  else await SecureStore.deleteItemAsync(PKCE_KEY, secureOptions);
}

async function exchangeCode(code: string): Promise<SignInResult> {
  const raw = Platform.OS === 'web' ? webPending : await SecureStore.getItemAsync(PKCE_KEY, secureOptions);
  const pending = raw ? JSON.parse(raw) : null;
  if (!pending || Date.now() - pending.started > LOGIN_TTL) throw new Error('Giriş isteğinin süresi doldu.');
  const response = await axios.post(`${API_BASE_URL}/api/auth/exchange`,
    { code, verifier: pending.verifier }, { timeout: 15000 });
  await setPending(null);
  const result = await completeAuthWithTokens(response.data);
  if (!result) throw new Error('Giriş doğrulanamadı.');
  return result;
}

// Android may deliver the same return to both the router and the browser session.
export function completeAuthCode(code: string): Promise<SignInResult> {
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(code)) return Promise.reject(new Error('Geçersiz giriş kodu.'));
  if (callback?.code === code) return callback.result;
  const result = exchangeCode(code);
  callback = { code, result };
  const expire = () => { if (callback?.result === result) callback = null; };
  void result.then(() => setTimeout(expire, 5000), expire);
  return result;
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
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 });
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await setPending(JSON.stringify({ verifier, started: Date.now() }));
  const { data } = await axios.get<{ url: string }>(`${API_BASE_URL}/api/auth/google`, {
    params: { redirect_uri: redirectUri, code_challenge: challenge }, timeout: 10000,
  });
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
  if (result.type === 'success') {
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('Google giriş kodu alınamadı.');
    return completeAuthCode(code);
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
