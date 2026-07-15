import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  clearPersistedSession,
  readPersistedSession,
  updateStoredAccessToken,
} from '@/shared/services/tokenStorage';
import {
  isMobileAllowedRole,
  isTokenExpired,
  refreshAccessToken,
} from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { AlertsScreen } from '@/features/alerts/AlertsScreen';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { WatchlistScreen } from '@/features/watchlist/WatchlistScreen';
import type { MainTabParamList, RootScreenProps } from '@/app/navigation/navigation.types';
import { AppTabBar } from '@/app/navigation/AppTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

function ProtectedShellLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#3B82F6" size="small" />
    </View>
  );
}

type PersistedSession = Awaited<ReturnType<typeof readPersistedSession>>;

function isSessionUsable(session: PersistedSession): session is NonNullable<PersistedSession> {
  if (!session) {
    return false;
  }

  return (
    isMobileAllowedRole(session.user.role) &&
    !isTokenExpired(session.refreshToken) &&
    !isTokenExpired(session.accessToken)
  );
}

export default function MainTabNavigator() {
  const navigation = useNavigation<RootScreenProps<'MainTabs'>['navigation']>();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSession = useAuthStore((state) => state.setSession);
  const [isChecking, setIsChecking] = useState(() => !isSessionUsable(session));

  useEffect(() => {
    let mounted = true;

    async function validateSession() {
      if (isSessionUsable(session)) {
        setIsChecking(false);
        return;
      }

      const persistedSession = await readPersistedSession();

      if (!mounted) {
        return;
      }

      if (!persistedSession) {
        await clearPersistedSession();
        clearSession();
        setIsChecking(false);

        if (mounted) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
        return;
      }

      // Try refresh if only access token expired but refresh still valid
      if (isTokenExpired(persistedSession.refreshToken)) {
        await clearPersistedSession();
        clearSession();
        setIsChecking(false);

        if (mounted) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
        return;
      }

      if (isTokenExpired(persistedSession.accessToken)) {
        try {
          const newToken = await refreshAccessToken(persistedSession.refreshToken);
          await updateStoredAccessToken(newToken);
          useAuthStore.getState().updateAccessToken(newToken);
          setIsChecking(false);
          return;
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      await clearPersistedSession();
      clearSession();
      setIsChecking(false);

      if (mounted) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }

    void validateSession();

    return () => {
      mounted = false;
    };
  }, [clearSession, navigation, session, setSession]);

  if (isChecking) {
    return <ProtectedShellLoading />;
  }

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
        lazy: true,
        sceneStyle: {
          backgroundColor: '#0F172A',
        },
      }}
      tabBar={(props) => <AppTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
