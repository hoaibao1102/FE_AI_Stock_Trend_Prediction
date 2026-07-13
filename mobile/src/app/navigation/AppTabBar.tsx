import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Text } from '@/shared/ui/primitives';
import {
  AlertsIcon,
  DashboardIcon,
  ProfileIcon,
  SearchIcon,
  WatchlistIcon,
} from '@/app/navigation/NavigationIcons';
import { useAppShellStore } from '@/stores/app-shell.store';

type AppTabBarProps = {
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: {
      canPreventDefault?: boolean;
      target: string;
      type: 'tabLongPress' | 'tabPress';
    }) => unknown;
    navigate: (name: string, params?: object) => void;
  };
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: object;
    }>;
  };
};

const TAB_META: Record<
  string,
  {
    icon: ({ color, size }: { color: string; size: number }) => ReactNode;
    label: string;
  }
> = {
  Dashboard: { icon: DashboardIcon, label: 'Dashboard' },
  Search: { icon: SearchIcon, label: 'Search' },
  Watchlist: { icon: WatchlistIcon, label: 'Watchlist' },
  Alerts: { icon: AlertsIcon, label: 'Alerts' },
  Profile: { icon: ProfileIcon, label: 'Profile' },
};

export function AppTabBar({ descriptors, navigation, state }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { unreadNotifications } = useAppShellStore();

  const metrics = useMemo(() => {
    const shortSide = Math.min(width, height);

    return {
      iconSize: Math.max(shortSide * 0.07, 24),
    };
  }, [height, width]);

  const visibleRoutes = state.routes.filter((route) => route.name in TAB_META);

  return (
    <Box
      className="bg-[#151527] relative"
      style={{
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderColor: '#2A2A44',
        borderWidth: 1.5,
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: { height: -2, width: 0 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 4,
      }}>
      <View className="flex-row items-center justify-evenly" style={{ paddingVertical: 14 }}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((entry) => entry.key === route.key);
          const isFocused = state.index === routeIndex;
          const descriptor = descriptors[route.key];
          const meta = TAB_META[route.name];
          const Icon = meta.icon;

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? meta.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              onLongPress={() => navigation.emit({ target: route.key, type: 'tabLongPress' })}
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: 'tabPress',
                }) as { defaultPrevented?: boolean };

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              className="items-center justify-center flex-1 overflow-hidden relative active:opacity-80 min-w-[44px]"
              style={{ paddingVertical: 10 }}>
              {isFocused ? (
                <View className="absolute top-0 w-5 h-[2.5px] bg-[#3B82F6] rounded-full" />
              ) : null}
              <Icon color={isFocused ? '#3B82F6' : '#64748B'} size={metrics.iconSize} />
              {route.name === 'Alerts' && unreadNotifications > 0 ? (
                <View
                  className="absolute items-center justify-center rounded-full min-w-4 px-1"
                  style={{
                    backgroundColor: '#3B82F6',
                    borderColor: 'rgba(8, 17, 26, 0.12)',
                    borderWidth: 1,
                    right: '22%',
                    top: 2,
                  }}>
                  <Text className="text-[#08111A] text-[9px] font-extrabold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Box>
  );
}
