import { View } from 'react-native';

import { SearchDiscoverySections } from '@/features/search/components/SearchDiscoverySections';
import { SearchGlassIcon } from '@/features/search/components/SearchIcons';
import type { StockListItem } from '@/features/stocks/types';
import { Input, Text } from '@/shared/ui';

type SearchHeaderPanelProps = {
  isDirectoryVisible: boolean;
  onChangeQuery: (value: string) => void;
  onOpenSymbol: (symbol: string) => void;
  onViewAll: () => void;
  quickAccessActionLabel: string;
  query: string;
  quickAccessItems: StockListItem[];
  recentSearches: readonly string[];
  resultLabel: string;
  trendingItems: StockListItem[];
};

export function SearchHeaderPanel({
  isDirectoryVisible,
  onChangeQuery,
  onOpenSymbol,
  onViewAll,
  quickAccessActionLabel,
  query,
  quickAccessItems,
  recentSearches,
  resultLabel,
  trendingItems,
}: SearchHeaderPanelProps) {
  return (
    <View className="pb-4">
      <Text className="text-[24px] font-bold leading-8 text-typography mb-4">Search</Text>
      <View className="border border-border bg-surface rounded-cardxl p-4">
        <Input
          autoCapitalize="characters"
          leftIcon={<SearchGlassIcon color="#ADC6FF" />}
          onChangeText={onChangeQuery}
          placeholder="Search tickers, companies..."
          style={{
            backgroundColor: '#0F172A',
            borderColor: '#334155',
            borderRadius: 4,
            marginBottom: 24,
          }}
          value={query}
        />
        <SearchDiscoverySections
          onOpenSymbol={onOpenSymbol}
          onViewAll={onViewAll}
          quickAccessActionLabel={quickAccessActionLabel}
          quickAccessItems={quickAccessItems}
          recentSearches={recentSearches}
          trendingItems={trendingItems}
        />
        {isDirectoryVisible ? (
          <View className="border-t border-border mt-2 pt-4 gap-1">
            <Text className="text-lg font-bold leading-6 text-typography">Search Results</Text>
            <Text className="text-xs font-medium leading-4 text-typography-muted">{resultLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
