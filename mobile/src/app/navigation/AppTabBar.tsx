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
  Alerts: { icon: AlertsIcon, label: 'Alerts' },
  Dashboard: { icon: DashboardIcon, label: 'Dashboard' },
  Profile: { icon: ProfileIcon, label: 'Profile' },
  Search: { icon: SearchIcon, label: 'Search' },
  Watchlist: { icon: WatchlistIcon, label: 'Watchlist' },
};

export function AppTabBar({ descriptors, navigation, state }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { unreadNotifications } = useAppShellStore();

  const metrics = useMemo(() => {
    const shortSide = Math.min(width, height);

    return {
      barMinHeight: Math.max(height * 0.11, 45),
      iconSize: Math.max(shortSide * 0.07, 22),
      paddingBottom: Math.max(insets.bottom, height * 0.018),
      paddingHorizontal: Math.max(width * 0.04, 8),
      paddingTop: Math.max(height * 0.018, 8),
      railRadius: Math.max(14, Math.min(shortSide * 0.045, 18)),
      touchHeight: Math.max(height * 0.066, 54),
    };
  }, [height, insets.bottom, width]);

  const visibleRoutes = state.routes.filter((route) => route.name in TAB_META);

  return (
    <Box
      className="bg-background border-t border-t-border"
      style={{
        minHeight: metrics.barMinHeight,
        paddingBottom: metrics.paddingBottom,
        paddingHorizontal: metrics.paddingHorizontal,
        paddingTop: metrics.paddingTop,
      }}>
      <View
        className="flex-row items-center justify-between"
        style={{
          borderRadius: metrics.railRadius,
          gap: 4,
          paddingHorizontal: Math.max(width * 0.016, 4),
          paddingVertical: Math.max(height * 0.008, 4),
        }}>
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
              className={`items-center justify-center flex-1 rounded-full overflow-hidden relative active:opacity-80 min-w-[44px] ${isFocused ? 'bg-[rgba(173,198,255,0.12)]' : ''}`}
              style={{
                minHeight: metrics.touchHeight,
                paddingVertical: Math.max(height * 0.012, 8),
              }}>
              <Icon color={isFocused ? '#3B82F6' : '#94A3B8'} size={metrics.iconSize} />
              {route.name === 'Alerts' && unreadNotifications > 0 ? (
                <View
                  className="absolute items-center justify-center rounded-full min-w-4 px-1 right-[18%] top-[12%]"
                  style={{
                    backgroundColor: '#3B82F6',
                    borderColor: 'rgba(8, 17, 26, 0.12)',
                    borderWidth: 1,
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
