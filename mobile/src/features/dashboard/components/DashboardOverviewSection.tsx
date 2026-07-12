import { View } from 'react-native';

import { MiniIndexChart } from '@/features/dashboard/components/MiniIndexChart';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import type { DashboardMarketOverviewIndex } from '@/features/dashboard/types';
import { StatusBadge, Text } from '@/shared/ui';
import { formatPercent, formatPrice, formatVolume } from '@/shared/utils/format';

type DashboardOverviewSectionProps = {
  items: DashboardMarketOverviewIndex[];
  latestTradingDateLabel: string;
};

export function DashboardOverviewSection({
  items,
  latestTradingDateLabel,
}: DashboardOverviewSectionProps) {
  return (
    <DashboardSection
      subtitle={`Latest session ${latestTradingDateLabel}`}
      title="Market overview">
      {items.map((item) => (
        <View
          key={item.symbol}
          className="bg-surface border-border rounded-cardxl border p-4 gap-2">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-base font-bold leading-6 text-typography">{item.display_symbol}</Text>
              <Text className="text-2xs font-semibold leading-4 text-typography-muted mt-1">{item.market}</Text>
            </View>
            <StatusBadge
              label={item.change_percent >= 0 ? 'Up session' : 'Down session'}
              tone={item.change_percent >= 0 ? 'up' : 'down'}
            />
          </View>
          <Text className="text-2xl font-bold leading-8 text-typography">{formatPrice(item.close_index)}</Text>
          <Text
            className={`text-xs font-bold leading-5 ${
              item.change_percent >= 0 ? 'text-market-up' : 'text-market-down'
            }`}>
            {formatPercent(item.change_percent)}
          </Text>
          <MiniIndexChart
            data={item.chart}
            isNegative={item.change_percent < 0}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-2xs leading-4 text-typography-muted">Vol: {formatVolume(item.total_volume)}</Text>
            <Text className="text-2xs leading-4 text-typography-muted">Date: {item.trading_date}</Text>
          </View>
        </View>
      ))}
    </DashboardSection>
  );
}
