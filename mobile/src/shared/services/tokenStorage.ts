import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession, AuthUser, StoredSessionShape } from '@/features/auth/types';

const AUTH_STORAGE_KEY = 'auth';
const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const USER_STORAGE_KEY = 'user';

function toStoredSession(session: AuthSession): StoredSessionShape {
  return {
    accessToken: session.accessToken,
    access_token: session.accessToken,
    refreshToken: session.refreshToken,
    refresh_token: session.refreshToken,
    user: session.user,
  };
}

export async function persistRememberedSession(session: AuthSession): Promise<void> {
  const storedSession = JSON.stringify(toStoredSession(session));

  await AsyncStorage.multiSet([
    [AUTH_STORAGE_KEY, storedSession],
    [ACCESS_TOKEN_STORAGE_KEY, session.accessToken],
    [REFRESH_TOKEN_STORAGE_KEY, session.refreshToken],
    [USER_STORAGE_KEY, JSON.stringify(session.user)],
  ]);
}

export async function updateStoredAccessToken(newAccessToken: string): Promise<void> {
  const rawAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawAuth) return;

  const parsed = JSON.parse(rawAuth);
  const updated = { ...parsed, accessToken: newAccessToken, access_token: newAccessToken };

  await AsyncStorage.multiSet([
    [AUTH_STORAGE_KEY, JSON.stringify(updated)],
    [ACCESS_TOKEN_STORAGE_KEY, newAccessToken],
  ]);
}

export async function clearPersistedSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_STORAGE_KEY,
    ACCESS_TOKEN_STORAGE_KEY,
    REFRESH_TOKEN_STORAGE_KEY,
    USER_STORAGE_KEY,
  ]);
}

export async function readPersistedSession(): Promise<AuthSession | null> {
  const rawSession = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as Partial<StoredSessionShape>;

    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      !parsed.user
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user,
    } satisfies AuthSession;
  } catch {
    return null;
  }
}
