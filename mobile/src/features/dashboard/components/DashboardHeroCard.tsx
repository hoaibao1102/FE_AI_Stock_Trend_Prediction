import { View } from 'react-native';

import type { DashboardMarketOverviewIndex } from '@/features/dashboard/types';
import { Card, MetricCard, Text } from '@/shared/ui';
import { formatPercent, formatPrice, formatVolume } from '@/shared/utils/format';

type DashboardHeroCardProps = {
  gainersCount: number;
  latestTradingDateLabel: string;
  leadersAsOfLabel: string;
  losersCount: number;
  primaryIndex: DashboardMarketOverviewIndex | null;
  totalIndices: number;
  trackedStocks: number;
  validatedWatchlistItems: number;
  watchlistCoveragePercent: number;
  hasError: boolean;
};

export function DashboardHeroCard({
  gainersCount,
  latestTradingDateLabel,
  leadersAsOfLabel,
  losersCount,
  primaryIndex,
  totalIndices,
  trackedStocks,
  validatedWatchlistItems,
  watchlistCoveragePercent,
  hasError,
}: DashboardHeroCardProps) {
  return (
    <>
      <Card className="bg-surface border-border rounded-cardxl border p-4 gap-4">
        <View className="flex-row gap-4 justify-between">
          <View className="flex-1 gap-1">
            <Text className="text-2xs font-bold uppercase text-primary-500">Dashboard</Text>
            <Text className="text-2xl font-bold leading-8 text-typography">Market overview</Text>
            <Text className="text-sm leading-6 text-typography-muted">
              Mobile now surfaces the essentials: exchange pulse, data freshness, top movers,
              and your tracked symbols.
            </Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between">
          <View className="flex-1 gap-1">
            <Text className="text-xs font-semibold leading-4 uppercase text-typography-muted">
              {primaryIndex?.display_symbol ?? 'Primary index'}
            </Text>
            <Text className="text-3xl font-bold text-typography">
              {primaryIndex ? formatPrice(primaryIndex.close_index) : '—'}
            </Text>
            <Text
              className={`text-sm font-bold leading-5 ${
                primaryIndex?.change_percent != null && primaryIndex.change_percent < 0
                  ? 'text-market-down'
                  : 'text-market-up'
              }`}>
              {primaryIndex ? formatPercent(primaryIndex.change_percent) : 'No market snapshot'}
            </Text>
          </View>

          <View className="items-end gap-1">
            <Text className="text-2xs font-semibold uppercase text-typography-muted">Volume</Text>
            <Text className="text-base font-bold leading-6 text-typography">
              {primaryIndex ? formatVolume(primaryIndex.total_volume) : '—'}
            </Text>
            <Text className="text-xs leading-4 text-right text-typography-muted">Leaders as of {leadersAsOfLabel}</Text>
          </View>
        </View>
      </Card>

      <View className="flex-row flex-wrap gap-4">
        <MetricCard
          detail={`${totalIndices} tracked indices`}
          label="Market breadth"
          tone={gainersCount >= losersCount ? 'up' : 'down'}
          value={`${gainersCount}/${losersCount}`}
        />
        <MetricCard
          detail={`${validatedWatchlistItems}/${trackedStocks} validated symbols`}
          label="Data quality"
          tone={watchlistCoveragePercent >= 80 ? 'up' : 'warning'}
          value={`${watchlistCoveragePercent}%`}
        />
      </View>
    </>
  );
}
