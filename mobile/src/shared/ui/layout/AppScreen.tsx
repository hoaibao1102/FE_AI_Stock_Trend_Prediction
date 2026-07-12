import { PropsWithChildren, ReactNode, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

import { Box, Card, Text } from '@/shared/ui/primitives';
import { AppBanner } from '@/shared/ui/feedback/AppBanner';
import { LoadingSkeleton } from '@/shared/ui/feedback/LoadingSkeleton';
import { palette } from '@/shared/design/tokens';
import { useAppShellStore } from '@/stores/app-shell.store';

type AppScreenProps = PropsWithChildren<{
  emptyState?: ReactNode;
  footer?: ReactNode;
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void> | void;
  showMarketBanner?: boolean;
}>;

function EmptyDashboardState() {
  return (
    <Card className="bg-surface-low border border-border rounded-cardxl min-h-[240px] p-4">
      <Text className="text-primary-500 text-[11px] font-bold uppercase tracking-[0.84px]">Dashboard Surface</Text>
      <Text className="text-typography text-[20px] font-bold leading-[28px] mt-2">Operational modules will mount here.</Text>
      <Text className="text-typography-disabled text-sm leading-[21px] mt-2 max-w-[88%]">
        This shell keeps navigation, refresh handling, banners, and screen persistence ready
        while data panels are connected in later phases.
      </Text>
    </Card>
  );
}

export function AppScreen({
  children,
  emptyState,
  footer,
  isRefreshing,
  onRefresh,
  showMarketBanner = true,
}: AppScreenProps) {
  const { height, width } = useWindowDimensions();
  const {
    isContentLoading,
    isOffline,
    isRefreshing: shellRefreshing,
    isStale,
    refreshContent,
    warningMessage,
  } = useAppShellStore();
  const responsiveStyles = useMemo(() => {
    const shortSide = Math.min(width, height);

    return {
      content: {
        flexGrow: 1,
        gap: shortSide * 0.05,
        paddingBottom: Math.max(height * 0.032, 24),
        paddingHorizontal: Math.max(width * 0.045, 16),
        paddingTop: Math.max(height * 0.024, 16),
      },
      footer: {
        borderTopColor: palette.border,
        borderTopWidth: 0.5,
        paddingHorizontal: Math.max(width * 0.045, 16),
        paddingVertical: Math.max(height * 0.015, 8),
      },
      overlay: {
        backgroundColor: 'rgba(11, 18, 32, 0.78)',
        borderColor: 'rgba(255, 183, 134, 0.24)',
        borderRadius: 14,
        borderWidth: 1,
        bottom: Math.max(height * 0.024, 16),
        left: Math.max(width * 0.045, 16),
        paddingHorizontal: Math.max(width * 0.04, 16),
        paddingVertical: Math.max(height * 0.016, 8),
        position: 'absolute',
        right: Math.max(width * 0.045, 16),
      },
      overlayText: {
        color: palette.textPrimary,
        fontSize: Math.max(shortSide * 0.033, 13),
        lineHeight: Math.max(shortSide * 0.045, 18),
      },
    } as const;
  }, [height, width]);

  const effectiveRefreshing = isRefreshing ?? shellRefreshing;
  const handleRefresh = onRefresh ?? refreshContent;

  const banners = [
    showMarketBanner ? (
      <AppBanner
        key="market-banner"
        body="Latest dashboard snapshot is available for quick review and refresh."
        title="Market Snapshot"
      />
    ) : null,
    isStale ? (
      <AppBanner
        key="stale"
        body="Some panels may be showing cached values. Pull to refresh when the connection stabilizes."
        title="Data Stale"
        tone="warning"
      />
    ) : null,
    warningMessage ? (
      <AppBanner
        key="warning"
        body={warningMessage}
        title="Service Notice"
      />
    ) : null,
  ].filter(Boolean);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={responsiveStyles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => { void handleRefresh(); }}
            refreshing={effectiveRefreshing}
            tintColor={palette.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        {banners}
        {isContentLoading ? <LoadingSkeleton /> : children ?? emptyState ?? <EmptyDashboardState />}
      </ScrollView>

      {footer ? <Box style={responsiveStyles.footer}>{footer}</Box> : null}

      {isOffline ? (
        <View pointerEvents="none" style={responsiveStyles.overlay}>
          <Text style={responsiveStyles.overlayText}>
            You&apos;re offline. Cached layout stays available until connectivity returns.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
