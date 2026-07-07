import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardHeroCard } from '@/features/dashboard/components/DashboardHeroCard';
import { DashboardMoversSection } from '@/features/dashboard/components/DashboardMoversSection';
import { DashboardOverviewSection } from '@/features/dashboard/components/DashboardOverviewSection';
import { DashboardWatchlistSection } from '@/features/dashboard/components/DashboardWatchlistSection';
import {
  getPrimaryIndex,
  getWatchlistPreview,
  useDashboard,
} from '@/features/dashboard/hooks/useDashboard';
import { AppScreen } from '@/shared/ui';
import type { MainTabScreenProps } from '@/app/navigation/navigation.types';

export function DashboardScreen() {
  const navigation = useNavigation<MainTabScreenProps<'Dashboard'>['navigation']>();
  const { error, isRefreshing, marketLeaders, marketOverview, refresh, summary, watchlist } =
    useDashboard();
  const primaryIndex = getPrimaryIndex(marketOverview);
  const watchlistPreview = getWatchlistPreview(watchlist?.items ?? []);

  const openStockDetail = (symbol: string) => {
    navigation.navigate('StockDetail', { symbol });
  };

  return (
    <View className="flex-1 bg-background">
      <DashboardHeader
        badgeLabel={summary.latestTradingDateLabel}
        onNotificationPress={() => navigation.navigate('Alerts')}
      />
      <AppScreen isRefreshing={isRefreshing} onRefresh={refresh} showMarketBanner={false}>
        <DashboardHeroCard
          gainersCount={summary.gainersCount}
          hasError={Boolean(error)}
          latestTradingDateLabel={summary.latestTradingDateLabel}
          leadersAsOfLabel={summary.leadersAsOfLabel}
          losersCount={summary.losersCount}
          primaryIndex={primaryIndex}
          totalIndices={summary.totalIndices}
          trackedStocks={summary.trackedStocks}
          validatedWatchlistItems={summary.validatedWatchlistItems}
          watchlistCoveragePercent={summary.watchlistCoveragePercent}
        />

        <DashboardOverviewSection
          items={marketOverview}
          latestTradingDateLabel={summary.latestTradingDateLabel}
        />

        <DashboardMoversSection
          gainers={marketLeaders?.gainers ?? []}
          losers={marketLeaders?.losers ?? []}
          onSelectSymbol={openStockDetail}
        />

        <DashboardWatchlistSection
          items={watchlistPreview}
          onOpenFirst={
            watchlistPreview[0] ? () => openStockDetail(watchlistPreview[0].stock.symbol) : undefined
          }
          onSelectSymbol={openStockDetail}
          trackedStocks={summary.trackedStocks}
        />
      </AppScreen>
    </View>
  );
}
