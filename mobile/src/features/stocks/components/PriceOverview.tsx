import { View } from 'react-native';

import { Text } from '@/shared/ui';
import type { PriceStats } from '@/features/stocks/types';
import {
  formatMoney,
  formatPercent,
} from '@/features/stocks/utils/stockDetailCalculations';

type PriceOverviewProps = {
  stats: PriceStats;
};

export function PriceOverview({ stats }: PriceOverviewProps) {
  const directionColor =
    (stats.priceChange ?? 0) >= 0 ? '#22C55E' : '#EF4444';

  return (
    <View className="px-4 pt-2">
      <View className="flex-row items-end gap-2">
        <Text className="text-[32px] font-extrabold leading-[38px] text-typography">{formatMoney(stats.latestPrice)}</Text>
        <Text className="text-[12px] font-bold leading-4 text-typography-muted mb-[5px]">VND</Text>
      </View>
      <Text style={{ color: directionColor }} className="text-sm font-bold leading-5 mt-1">
        {stats.priceChange != null && stats.priceChange > 0 ? '+' : ''}
        {formatMoney(stats.priceChange)} ({formatPercent(stats.priceChangePercent)})
      </Text>
    </View>
  );
}
