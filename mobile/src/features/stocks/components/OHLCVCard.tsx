import { View } from 'react-native';

import { Text } from '@/shared/ui';
import type { PriceStats } from '@/features/stocks/types';
import {
  formatCompactVolume,
  formatMoney,
} from '@/features/stocks/utils/stockDetailCalculations';

const rows = [
  ['Open', 'open'],
  ['High', 'high'],
  ['Low', 'low'],
  ['Close', 'close'],
  ['Volume', 'volume'],
  ['Avg Volume', 'avgVolume'],
] as const;

type OHLCVCardProps = {
  stats: PriceStats;
};

export function OHLCVCard({ stats }: OHLCVCardProps) {
  return (
    <View className="flex-row flex-wrap border border-border bg-surface rounded-md mx-4 p-4 gap-y-4">
      {rows.map(([label, key]) => {
        const isVolume = key === 'volume' || key === 'avgVolume';
        const value = isVolume
          ? formatCompactVolume(stats[key])
          : formatMoney(stats[key]);

        return (
          <View key={key} className="gap-1 w-[33.333%]">
            <Text className="text-[11px] font-semibold leading-[14px] text-typography-muted">{label}</Text>
            <Text numberOfLines={1} className="text-sm font-bold leading-[18px] text-typography pr-2">
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
