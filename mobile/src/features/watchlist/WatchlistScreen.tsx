import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

function ListSeparator() {
  return <View style={styles.separator} />;
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/shared/ui';
import { palette, spacing } from '@/shared/design/tokens';
import { useWatchlist } from '@/features/watchlist/hooks/useWatchlist';
import { WatchlistHeader } from '@/features/watchlist/components/WatchlistHeader';
import { WatchlistSearchBar } from '@/features/watchlist/components/WatchlistSearchBar';
import { WatchlistFilterChips } from '@/features/watchlist/components/WatchlistFilterChips';
import { WatchlistRow } from '@/features/watchlist/components/WatchlistRow';
import { SwipeableRow } from '@/features/watchlist/components/SwipeableRow';
import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import type { WatchlistItem } from '@/features/watchlist/types';

function EmptyWatchlistState() {
  return (
    <View style={styles.emptyShell}>
      <Text style={styles.emptyTitle}>No stocks tracked yet</Text>
      <Text style={styles.emptyBody}>
        Tap the + Add button to start following your favourite symbols.
      </Text>
    </View>
  );
}

function ErrorWatchlistState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyShell}>
      <Text style={styles.emptyTitle}>Could not load watchlist</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      <Text onPress={onRetry} style={styles.retryLink}>
        Tap to retry
      </Text>
    </View>
  );
}

export function WatchlistScreen() {
  const navigation = useNavigation<MainTabScreenProps<'Watchlist'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { items, isLoading, error, refresh, removeItem } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('all');

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
      result = result.filter((i) => i.stock.exchange_code === 'HOSE');
    }

    return result;
  }, [items, searchQuery, activeChip]);

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

  const listHeader = (
    <>
      <WatchlistHeader
        title="My Watchlist"
        onSortFilter={() => {}}
        onAddStock={() => {}}
      />
      <WatchlistSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <WatchlistFilterChips activeChip={activeChip} onChipChange={setActiveChip} />
    </>
  );

  if (isActuallyLoading) {
    return (
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <View style={styles.headerLoading}>
          <Text style={styles.titleLoading}>My Watchlist</Text>
        </View>
        <ActivityIndicator color={palette.primary} size="small" />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.shell}>
        {listHeader}
        <ErrorWatchlistState message={error} onRetry={refresh} />
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <FlatList
        contentContainerStyle={{ paddingBottom: spacing.lg, paddingHorizontal: spacing.md, paddingTop: insets.top }}
        data={filteredItems}
        ItemSeparatorComponent={ListSeparator}
        keyExtractor={(item) => item.watchlist_id}
        ListEmptyComponent={<EmptyWatchlistState />}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={isLoading}
            tintColor={palette.primary}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: palette.background,
    flex: 1,
  },
  headerLoading: {
    paddingHorizontal: spacing.md,
  },
  titleLoading: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  separator: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  emptyShell: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  emptyBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryLink: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
