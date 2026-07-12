import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Text } from '@/shared/ui/primitives';
import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import { BellIcon, BrandTrendIcon } from '@/app/navigation/NavigationIcons';
import { useAppShellStore } from '@/stores/app-shell.store';
import { useMarketStore } from '@/stores/market.store';

export function AppHeader() {
  const navigation = useNavigation<MainTabScreenProps<'Dashboard'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { unreadNotifications } = useAppShellStore();
  const { marketStatus } = useMarketStore();

  const metrics = useMemo(() => {
    const shortSide = Math.min(width, height);
    const iconSize = Math.max(shortSide * 0.06, 22);
    const titleSize = Math.max(shortSide * 0.04, 15);
    const badgeText = Math.max(shortSide * 0.027, 10.5);
    const shellHeight = Math.max(height * 0.09, 72);

    return {
      badgeText,
      iconSize,
      shellHeight,
      titleSize,
    };
  }, [height, width]);

  return (
    <Box
      className="bg-surface border-b border-b-border"
      style={{
        minHeight: metrics.shellHeight,
        paddingBottom: Math.max(height * 0.014, 8),
        paddingHorizontal: Math.max(width * 0.045, 16),
        paddingTop: Math.max(insets.top, height * 0.014),
      }}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="shrink flex-row items-center gap-2 min-w-0">
          <BrandTrendIcon color="#3B82F6" size={metrics.iconSize} />
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            className="shrink font-extrabold"
            style={{
              color: '#3B82F6',
              fontSize: metrics.titleSize,
              letterSpacing: metrics.titleSize * 0.08,
            }}>
            AI STOCK TREND
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View
            className="flex-row items-center gap-1 rounded-full"
            style={{
              backgroundColor: 'rgba(25, 28, 30, 0.96)',
              borderColor: 'rgba(34, 197, 94, 0.2)',
              borderWidth: 1,
              paddingHorizontal: Math.max(width * 0.028, 8),
              paddingVertical: Math.max(height * 0.008, 6),
            }}>
            <View
              className="rounded-full"
              style={{
                backgroundColor: marketStatus === 'OPEN' ? '#22C55E' : '#F59E0B',
                height: Math.max(metrics.badgeText * 0.62, 7),
                width: Math.max(metrics.badgeText * 0.62, 7),
              }}
            />
            <Text
              className="font-bold"
              style={{
                color: marketStatus === 'OPEN' ? '#22C55E' : '#F59E0B',
                fontSize: metrics.badgeText,
                letterSpacing: metrics.badgeText * 0.1,
              }}>
              {marketStatus}
            </Text>
          </View>

          <Pressable
            accessibilityHint="Open notification center"
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Alerts')}
            className="items-center justify-center rounded-full border border-border bg-surface active:opacity-[0.74]"
            style={{
              height: Math.max(height * 0.052, 42),
              width: Math.max(height * 0.052, 42),
            }}>
            <BellIcon color="#94A3B8" size={metrics.iconSize * 0.76} />
            {unreadNotifications > 0 ? (
              <View
                className="absolute items-center justify-center rounded-full"
                style={{
                  backgroundColor: '#3B82F6',
                  minWidth: Math.max(metrics.badgeText * 1.7, 16),
                  paddingHorizontal: 4,
                  right: -3,
                  top: -3,
                }}>
                <Text
                  className="font-extrabold"
                  style={{
                    color: '#08111A',
                    fontSize: Math.max(metrics.badgeText * 0.82, 9),
                  }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </Box>
  );
}
