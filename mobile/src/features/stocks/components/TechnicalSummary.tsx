import { View } from 'react-native';

import { Text } from '@/shared/ui';
import type { TechnicalStats } from '@/features/stocks/types';
import { formatMoney } from '@/features/stocks/utils/stockDetailCalculations';

type TechnicalSummaryProps = {
  stats: TechnicalStats;
};

export function TechnicalSummary({ stats }: TechnicalSummaryProps) {
  const metrics = [
    { label: 'SMA (20)', value: formatMoney(stats.sma20) },
    { label: 'RSI (14)', value: stats.rsi14 == null ? '--' : stats.rsi14.toFixed(1) },
    {
      label: 'Volatility (30D)',
      value: stats.volatility30d == null ? '--' : `${stats.volatility30d.toFixed(2)}%`,
    },
  ];

  return (
    <View className="gap-2 px-4">
      <Text className="text-base font-bold leading-6 text-typography">Technical Summary</Text>
      <View className="flex-row gap-2">
        {metrics.map((metric) => (
          <View key={metric.label} className="flex-1 border border-border bg-surface rounded-md gap-1 min-h-[72px] p-2">
            <Text className="text-[11px] font-semibold leading-[14px] text-typography-muted">{metric.label}</Text>
            <Text numberOfLines={1} className="text-[15px] font-extrabold leading-5 text-typography">
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
