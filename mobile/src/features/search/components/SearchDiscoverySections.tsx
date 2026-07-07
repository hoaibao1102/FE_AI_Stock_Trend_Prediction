import { Pressable, View } from 'react-native';

import type { StockListItem } from '@/features/stocks/types';
import {
  QUICK_ACCESS_FALLBACKS,
  QUICK_ACCESS_SYMBOLS,
} from '@/features/search/constants';
import { TrendingArrowIcon } from '@/features/search/components/SearchIcons';
import { formatPercent, formatPrice } from '@/shared/utils/format';
import { Text } from '@/shared/ui';

type SearchDiscoverySectionsProps = {
  onOpenSymbol: (symbol: string) => void;
  onViewAll: () => void;
  quickAccessActionLabel: string;
  recentSearches: readonly string[];
  trendingItems: StockListItem[];
  quickAccessItems: StockListItem[];
};

function changeTone(value: number | null | undefined) {
  if (value == null || value === 0) {
    return '#94A3B8';
  }

  return value > 0 ? '#22C55E' : '#EF4444';
}

export function SearchDiscoverySections({
  onOpenSymbol,
  onViewAll,
  quickAccessActionLabel,
  recentSearches,
  trendingItems,
  quickAccessItems,
}: SearchDiscoverySectionsProps) {
  const quickAccessMap = new Map(quickAccessItems.map((item) => [item.symbol, item]));

  return (
    <View className="gap-6 pb-4">
      <View className="gap-2">
        <Text className="text-lg font-bold leading-6 text-typography">Recent Searches</Text>
        <View className="flex-row flex-wrap gap-2">
          {recentSearches.map((entry) => (
            <Pressable
              key={entry}
              accessibilityRole="button"
              onPress={() => onOpenSymbol(entry)}
              style={({ pressed }) => [
                {
                  backgroundColor: '#1E293B',
                  borderColor: '#334155',
                  borderWidth: 1,
                  borderRadius: 4,
                  minHeight: 36,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                },
                pressed && { opacity: 0.82 },
              ]}>
              <Text className="text-[13px] font-semibold leading-4 text-typography">{entry}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="border border-border bg-surface rounded-cardxl gap-4 p-4">
        <View className="flex-row items-center gap-2">
          <TrendingArrowIcon color="#22C55E" size={18} />
          <Text className="text-lg font-bold leading-6 text-typography">Trending Stocks</Text>
        </View>
        <View className="gap-[10px]">
          {trendingItems.length === 0 ? (
            <Text className="text-[13px] leading-[18px] text-typography-muted">No momentum data available right now.</Text>
          ) : null}
          {trendingItems.map((item, index) => {
            const tone = changeTone(item.changePercent);

            return (
              <Pressable
                key={item.symbol}
                accessibilityRole="button"
                onPress={() => onOpenSymbol(item.symbol)}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 8 },
                  pressed && { opacity: 0.82 },
                ]}>
                <Text className="text-[13px] font-bold text-primary-soft w-[26px]">#{index + 1}</Text>
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold leading-5 text-typography">{item.symbol}</Text>
                  <Text numberOfLines={1} className="text-[13px] leading-[18px] text-typography-muted">
                    {item.companyName ?? 'Vietnam stock'}
                  </Text>
                </View>
                <View className="items-end min-w-[76px]">
                  <Text className="text-base font-bold leading-5 text-typography">{formatPrice(item.latestClosePrice)}</Text>
                  <Text style={[{ color: tone }]} className="text-[13px] font-bold leading-[18px]">
                    {formatPercent(item.changePercent)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold leading-6 text-typography">AI Stock Trend Quick Access</Text>
          <Pressable accessibilityRole="button" onPress={onViewAll}>
            <Text className="text-sm font-semibold leading-5 text-primary-soft">{quickAccessActionLabel}</Text>
          </Pressable>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {QUICK_ACCESS_SYMBOLS.map((symbol) => {
            const item = quickAccessMap.get(symbol) ?? QUICK_ACCESS_FALLBACKS[symbol];
            const tone = changeTone(item?.changePercent);

            return (
              <Pressable
                key={symbol}
                accessibilityRole="button"
                onPress={() => onOpenSymbol(symbol)}
                style={({ pressed }) => [
                  {
                    alignItems: 'center',
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderWidth: 1,
                    borderRadius: 4,
                    minHeight: 52,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    width: '30.5%',
                  },
                  pressed && { opacity: 0.82 },
                ]}>
                <Text className="text-[15px] font-bold leading-[18px] text-typography">{symbol}</Text>
                <Text style={[{ color: tone }]} className="text-[13px] font-bold leading-[18px]">
                  {formatPercent(item?.changePercent)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
