import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

function ListSeparator() {
  return <View className="bg-border h-[0.5px] ml-4" />;
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/shared/ui';
import { useWatchlist } from '@/features/watchlist/hooks/useWatchlist';
import { WatchlistHeader } from '@/features/watchlist/components/WatchlistHeader';
import { WatchlistSearchBar } from '@/features/watchlist/components/WatchlistSearchBar';
import { WatchlistFilterChips } from '@/features/watchlist/components/WatchlistFilterChips';
import { WatchlistRow } from '@/features/watchlist/components/WatchlistRow';
import { SwipeableRow } from '@/features/watchlist/components/SwipeableRow';
import { WatchlistOverlimitModal } from '@/features/watchlist/components/WatchlistOverlimitModal';
import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import type {
  WatchlistItem,
  WatchlistOverlimitItem,
  WatchlistRawItem,
} from '@/features/watchlist/types';

function EmptyWatchlistState() {
  return (
    <View className="items-center gap-2 px-6 pt-[60px]">
      <Text className="text-typography text-base font-semibold leading-6">No stocks tracked yet</Text>
      <Text className="text-typography-muted text-sm leading-5 text-center">
        Tap the + Add button to start following your favourite symbols.
      </Text>
    </View>
  );
}

function ErrorWatchlistState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center gap-2 px-6 pt-[60px]">
      <Text className="text-typography text-base font-semibold leading-6">Could not load watchlist</Text>
      <Text className="text-typography-muted text-sm leading-5 text-center">{message}</Text>
      <Text onPress={onRetry} className="text-primary-500 text-sm font-semibold mt-2">
        Tap to retry
      </Text>
    </View>
  );
}

export function WatchlistScreen() {
  const navigation = useNavigation<MainTabScreenProps<'Watchlist'>['navigation']>();
  const insets = useSafeAreaInsets();
  const {
    items,
    rawItems,
    isLoading,
    error,
    refresh,
    removeItem,
    overLimit,
    limit,
    trimItems,
    isTrimming,
  } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [showOverlimitModal, setShowOverlimitModal] = useState(false);

  const isActuallyLoading = isLoading && items.length === 0;

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      result = result.filter(
        (i) =>
          i.stock.symbol.includes(q) ||
          i.stock.company_name.toUpperCase().includes(q),
      );
    }

    if (activeChip === 'gainers') {
      result = result.filter((i) => (i.latest_price?.price_change_percent ?? 0) > 0);
    } else if (activeChip === 'losers') {
      result = result.filter((i) => (i.latest_price?.price_change_percent ?? 0) < 0);
    } else if (activeChip === 'hose') {
      result = result.filter((i) => i.stock.market_code === 'HOSE');
    }

    return result;
  }, [items, searchQuery, activeChip]);

  const overlimitItems = useMemo(() => {
    if (!overLimit) return [];
    return rawItems.filter(
      (item: WatchlistRawItem): item is WatchlistOverlimitItem =>
        !('stock' in item),
    );
  }, [overLimit, rawItems]);

  const handleTrimSuccess = useCallback(() => {
    setShowOverlimitModal(false);
    void refresh();
  }, [refresh]);

  const handleTrimItems = useCallback(
    (keepStockIds: string[]) => {
      trimItems(keepStockIds);
    },
    [trimItems],
  );

  const renderItem = useCallback(
    ({ item }: { item: WatchlistItem }) => {
      return (
        <SwipeableRow
          symbol={item.stock.symbol}
          onDelete={(symbol) => {
            removeItem(symbol);
          }}
        >
          <WatchlistRow
            item={item}
            onPress={(symbol) => navigation.navigate('StockDetail', { symbol })}
          />
        </SwipeableRow>
      );
    },
    [navigation, removeItem],
  );

  const renderListHeader = useCallback(
    () => (
      <>
        <WatchlistHeader
          title="My Watchlist"
          onAddStock={() => navigation.navigate('Search')}
        />
        <WatchlistSearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <WatchlistFilterChips activeChip={activeChip} onChipChange={setActiveChip} />
      </>
    ),
    [searchQuery, activeChip, navigation],
  );

  if (isActuallyLoading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-4">
          <Text className="text-typography text-[24px] font-bold leading-[32px]">My Watchlist</Text>
        </View>
        <ActivityIndicator color="#3B82F6" size="small" />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View className="flex-1 bg-background">
        {renderListHeader()}
        <ErrorWatchlistState message={error} onRetry={refresh} />
      </View>
    );
  }

  // Show overlimit modal when watchlist is over limit
  // This overrides the normal list to force user to trim
  if (overLimit && !isActuallyLoading) {
    return (
      <View className="flex-1 bg-background">
        <View style={{ paddingTop: insets.top }}>
          {renderListHeader()}
        </View>
        <View className="items-center gap-2 px-6 pt-8">
          <Text className="text-warning text-base font-semibold leading-6">
            Watchlist limit reached
          </Text>
          <Text className="text-typography-muted text-sm leading-5 text-center">
            Your current plan allows up to {limit} stocks. Please trim your
            watchlist to continue.
          </Text>
        </View>

        <WatchlistOverlimitModal
          open={showOverlimitModal || overLimit}
          items={overlimitItems}
          limit={limit}
          onTrimSuccess={handleTrimSuccess}
          onTrimItems={handleTrimItems}
          isTrimming={isTrimming}
          onBackToDashboard={() => navigation.navigate('Dashboard')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, paddingTop: insets.top }}
        data={filteredItems}
        ItemSeparatorComponent={ListSeparator}
        keyExtractor={(item) => item.watchlist_id ?? item.stock.symbol}
        ListEmptyComponent={<EmptyWatchlistState />}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={isLoading}
            tintColor="#3B82F6"
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      />

      <WatchlistOverlimitModal
        open={showOverlimitModal && !overLimit}
        items={overlimitItems}
        limit={limit}
        onTrimSuccess={handleTrimSuccess}
        onTrimItems={handleTrimItems}
        isTrimming={isTrimming}
        onBackToDashboard={() => navigation.navigate('Dashboard')}
      />
    </View>
  );
}
