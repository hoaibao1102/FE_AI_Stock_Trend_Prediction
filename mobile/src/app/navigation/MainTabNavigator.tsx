import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  clearPersistedSession,
  readPersistedSession,
} from '@/shared/services/tokenStorage';
import {
  isMobileAllowedRole,
  isTokenExpired,
} from '@/features/auth/services/auth.service';
import { AlertsScreen } from '@/features/alerts/AlertsScreen';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { WatchlistScreen } from '@/features/watchlist/WatchlistScreen';
import type { MainTabParamList, RootScreenProps } from '@/app/navigation/navigation.types';
import { AppTabBar } from '@/app/navigation/AppTabBar';
import { useAuthStore } from '@/stores/auth.store';

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

      if (!isSessionUsable(persistedSession)) {
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

      setSession(persistedSession);
      setIsChecking(false);
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
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
