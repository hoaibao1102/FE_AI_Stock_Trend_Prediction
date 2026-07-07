import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';

import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import {
  DEFAULT_RECENT_SEARCHES,
  PREFERRED_TRENDING_SYMBOLS,
  QUICK_ACCESS_SYMBOLS,
} from '@/features/search/constants';
import { SearchHeaderPanel } from '@/features/search/components/SearchHeaderPanel';
import { EmptySearchState, ErrorSearchState } from '@/features/search/components/SearchStates';
import { useSearchStocks } from '@/features/search/hooks/useSearchStocks';
import type { StockListItem as SearchStockItem } from '@/features/stocks/types';
import { StockListItem } from '@/shared/ui';
import { useToggleWatchlist } from '@/features/stocks/hooks/useToggleWatchlist';

function SearchResultSeparator() {
  return <View className="ml-4 h-px border-t border-border" />;
}

function dedupeBySymbol(items: SearchStockItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.symbol)) {
      return false;
    }

    seen.add(item.symbol);
    return true;
  });
}

function SearchItem({ item, onPress }: { item: SearchStockItem; onPress: () => void }) {
  const { isWatched, toggle } = useToggleWatchlist(item.symbol);

  const handleToggleWatchlist = (e: any) => {
    e.stopPropagation();
    toggle();
  };

  return (
    <StockListItem
      companyName={item.companyName ?? `${item.symbol} CORPORATION`}
      exchangeCode={item.market}
      onPress={onPress}
      price={item.latestClosePrice}
      priceChange={item.change}
      priceChangePercent={item.changePercent}
      rightMeta={item.sector ?? item.industry}
      rightAccessory={
        <Pressable onPress={handleToggleWatchlist} className="items-center justify-center p-1">
          <Star
            color={isWatched ? '#F59E0B' : '#94A3B8'}
            fill={isWatched ? '#F59E0B' : 'none'}
            size={18}
          />
        </Pressable>
      }
      subtitle={item.companyName ?? item.sector ?? 'Stock instrument'}
      symbol={item.symbol}
      volume={item.volume}
    />
  );
}

export function SearchScreen() {
  const navigation = useNavigation<MainTabScreenProps<'Search'>['navigation']>();
  const insets = useSafeAreaInsets();
  const [showDirectory, setShowDirectory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([...DEFAULT_RECENT_SEARCHES]);
  const {
    debouncedQuery,
    error,
    isLoading,
    isRefreshing,
    items,
    loadStocks,
    query,
    setQuery,
  } = useSearchStocks();

  const isDirectoryVisible = showDirectory || debouncedQuery.length > 0;
  const quickAccessActionLabel = showDirectory ? 'Collapse' : 'View All';

  const trendingItems = useMemo(() => {
    const itemMap = new Map(items.map((item) => [item.symbol.toUpperCase(), item]));
    const preferred = PREFERRED_TRENDING_SYMBOLS.map((symbol) => itemMap.get(symbol)).filter(
      (item): item is SearchStockItem => Boolean(item),
    );
    const ranked = [...items]
      .filter((item) => item.latestClosePrice != null)
      .sort((left, right) => Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0));

    return dedupeBySymbol([...preferred, ...ranked]).slice(0, 5);
  }, [items]);

  const quickAccessItems = useMemo(() => {
    const symbolSet = new Set<string>(QUICK_ACCESS_SYMBOLS);
    return items.filter((item) => symbolSet.has(item.symbol));
  }, [items]);

  const resultLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading market directory...';
    }

    if (debouncedQuery) {
      return `${items.length} matches for "${debouncedQuery.toUpperCase()}"`;
    }

    return `${items.length} stocks available`;
  }, [debouncedQuery, isLoading, items.length]);

  function pushRecentSearch(entry: string) {
    const normalized = entry.trim();

    if (!normalized) {
      return;
    }

    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((item) => item.toUpperCase() !== normalized.toUpperCase())];
      return next.slice(0, 6);
    });
  }

  function openSymbol(symbol: string) {
    const rawValue = symbol.trim();

    if (!rawValue) {
      return;
    }

    if (rawValue.includes(' ')) {
      pushRecentSearch(rawValue);
      setShowDirectory(true);
      setQuery(rawValue);
      return;
    }

    const normalized = rawValue.toUpperCase();
    pushRecentSearch(normalized);
    setShowDirectory(false);
    setQuery(normalized);
    navigation.navigate('StockDetail', { symbol: normalized });
  }

  const handleItemPress = (symbol: string) => {
    const rawValue = symbol.trim();
    if (!rawValue) {
      return;
    }
    const normalized = rawValue.toUpperCase();
    pushRecentSearch(normalized);
    setShowDirectory(false);
    setQuery(normalized);
    navigation.navigate('StockDetail', { symbol: normalized });
  };

  const header = (
    <SearchHeaderPanel
      isDirectoryVisible={isDirectoryVisible}
      onChangeQuery={(value) => {
        setShowDirectory(false);
        setQuery(value);
      }}
      onOpenSymbol={openSymbol}
      onViewAll={() => setShowDirectory((current) => !current)}
      quickAccessActionLabel={quickAccessActionLabel}
      query={query}
      quickAccessItems={quickAccessItems}
      recentSearches={recentSearches}
      resultLabel={resultLabel}
      trendingItems={trendingItems}
    />
  );

  if (error && items.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 px-4" style={{ paddingTop: insets.top }}>
          {header}
          <ErrorSearchState message={error} onRetry={() => void loadStocks()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        contentContainerStyle={[
          { paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 24, paddingTop: insets.top },
        ]}
        data={isDirectoryVisible ? items : []}
        ItemSeparatorComponent={SearchResultSeparator}
        keyExtractor={(item) => item.symbol}
        ListEmptyComponent={
          isDirectoryVisible && !isLoading ? <EmptySearchState query={debouncedQuery} /> : null
        }
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadStocks({ refresh: true })}
            refreshing={isRefreshing}
            tintColor="#3B82F6"
          />
        }
        renderItem={({ item }) => (
          <SearchItem item={item} onPress={() => handleItemPress(item.symbol)} />
        )}
        showsVerticalScrollIndicator={false}
      />
      {isLoading ? (
        <View pointerEvents="none" className="absolute left-0 right-0 items-center justify-center" style={{ top: 64 }}>
          <ActivityIndicator color="#3B82F6" size="small" />
        </View>
      ) : null}
    </View>
  );
}
