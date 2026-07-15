import {
  clearPersistedSession,
  readPersistedSession,
  updateStoredAccessToken,
} from '@/shared/services/tokenStorage';
import {
  getRoleAccessMessage,
  isMobileAllowedRole,
  isTokenExpired,
  refreshAccessToken,
} from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

type StartupDestination = '/dashboard' | '/login';

type StartupStage = 'authentication' | 'ready';

type StartupSuccess = {
  ok: true;
  destination: StartupDestination;
  stage: 'ready';
  statusText: string;
};

type StartupFailure = {
  ok: false;
  canRetry: boolean;
  message: string;
  retryDelayMs: number;
  stage: Exclude<StartupStage, 'ready'>;
  statusText: string;
};

export type StartupResult = StartupSuccess | StartupFailure;
type AuthValidationResult = {
  destination: StartupDestination;
  statusText: string;
};

const GENERIC_RETRY_MESSAGE = 'Unable startup. Retrying...';

function buildFailure(stage: Exclude<StartupStage, 'ready'>, statusText: string): StartupFailure {
  return {
    ok: false,
    canRetry: true,
    message: GENERIC_RETRY_MESSAGE,
    retryDelayMs: 3200,
    stage,
    statusText,
  };
}

async function tryRefreshAccessToken(): Promise<AuthValidationResult | null> {
  const session = await readPersistedSession();
  if (!session) return null;
  if (isTokenExpired(session.refreshToken)) return null;

  try {
    const newToken = await refreshAccessToken(session.refreshToken);
    await updateStoredAccessToken(newToken);
    useAuthStore.getState().updateAccessToken(newToken);
    return { destination: '/dashboard', statusText: 'Session refreshed.' };
  } catch {
    return null;
  }
}

async function validateAuthenticationState(): Promise<AuthValidationResult> {
  const session = await readPersistedSession();

  if (!session) {
    return { destination: '/login', statusText: 'No active session detected.' };
  }

  if (!isMobileAllowedRole(session.user.role)) {
    await clearPersistedSession();

    return {
      destination: '/login',
      statusText: getRoleAccessMessage(session.user.role),
    };
  }

  if (isTokenExpired(session.refreshToken)) {
    await clearPersistedSession();

    return {
      destination: '/login',
      statusText: 'Session expired. Redirecting to sign in.',
    };
  }

  if (isTokenExpired(session.accessToken)) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) return refreshed;

    await clearPersistedSession();
    return {
      destination: '/login',
      statusText: 'Session expired. Redirecting to sign in.',
    };
  }

  return { destination: '/dashboard', statusText: 'Session valid.' };
}

export async function runStartup(): Promise<StartupResult> {
  try {
    const authentication = await validateAuthenticationState();

    return {
      ok: true,
      destination: authentication.destination,
      stage: 'ready',
      statusText:
        authentication.destination === '/dashboard'
          ? 'Operational session ready. Opening dashboard.'
          : authentication.statusText,
    };
  } catch {
    return buildFailure('authentication', 'Unable read current session state.');
  }
}
