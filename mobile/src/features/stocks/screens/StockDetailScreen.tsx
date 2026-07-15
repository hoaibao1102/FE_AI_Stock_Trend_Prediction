import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootScreenProps } from '@/app/navigation/navigation.types';
import { ActionButtons } from '@/features/stocks/components/ActionButtons';
import { CandlestickChart } from '@/features/stocks/components/CandlestickChart';
import { DataQualityFooter } from '@/features/stocks/components/DataQualityFooter';
import { OHLCVCard } from '@/features/stocks/components/OHLCVCard';
import { PeerComparison } from '@/features/stocks/components/PeerComparison';
import { PriceOverview } from '@/features/stocks/components/PriceOverview';
import { RangeSelector } from '@/features/stocks/components/RangeSelector';
import { StockHeader } from '@/features/stocks/components/StockHeader';
import { TechnicalSummary } from '@/features/stocks/components/TechnicalSummary';
import { SwipeBackGesture } from '@/shared/ui/components/SwipeBackGesture';
import { useStockChart } from '@/features/stocks/hooks/useStockChart';
import { Text } from '@/shared/ui';
import { useToast } from '@/shared/ui/utils/ThemeProvider';
import { useAuthStore } from '@/stores/auth.store';
import { fetchWatchlists } from '@/features/watchlist/services/watchlist.service';
import { CreateAlertModal } from '@/features/alerts/components/CreateAlertModal';
import {
  getAlertsByStock,
  toggleAlert as apiToggleAlert,
} from '@/features/alerts/services/alert.service';
import type { AlertItem } from '@/features/alerts/types';

const companyNameBySymbol: Record<string, string> = {
  FPT: 'FPT CORPORATION',
  MSN: 'MASAN GROUP',
  MWG: 'MOBILE WORLD INVESTMENT',
  VNM: 'VINAMILK',
};

export function StockDetailScreen({
  navigation,
  route,
}: RootScreenProps<'StockDetail'>) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const isAuthenticated = Boolean(useAuthStore((s) => s.session?.accessToken));
  const symbol = (route.params?.symbol ?? 'FPT').toUpperCase();
  const companyName = companyNameBySymbol[symbol] ?? `${symbol} CORPORATION`;
  const stockChart = useStockChart(symbol);

  const [stockAlerts, setStockAlerts] = useState<AlertItem[]>([]);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const isWatched = useMemo(
    () => watchlistSymbols.includes(symbol),
    [watchlistSymbols, symbol],
  );

  const loadStockAlerts = useCallback(async () => {
    if (!symbol || !isAuthenticated) return;
    try {
      const list = await getAlertsByStock(symbol);
      setStockAlerts(list);
    } catch {
      // silently fail — alerts are supplementary
    }
  }, [symbol, isAuthenticated]);

  useEffect(() => {
    void loadStockAlerts();
  }, [loadStockAlerts]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWatchlists()
      .then((data) => {
        const items = data.items ?? [];
        setWatchlistSymbols(
          items.map((i: any) => i.stock?.symbol).filter(Boolean),
        );
      })
      .finally(() => setWatchlistLoading(false))
      .catch(() => {});
  }, [isAuthenticated]);

  const handleToggleAlert = useCallback(
    async (id: string, status: string) => {
      setTogglingIds((prev) => new Set(prev).add(id));
      try {
        const updated = await apiToggleAlert(
          id,
          status as 'ACTIVE' | 'DISABLED' | 'TRIGGERED',
        );
        setStockAlerts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: updated.status } : a,
          ),
        );
        showToast('Alert updated', '', 'success');
      } catch (err) {
        showToast(
          'Failed to toggle alert',
          err instanceof Error ? err.message : 'An error occurred',
          'error',
        );
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [showToast],
  );

  const lastTriggered =
    stockAlerts
      .filter((a) => a.triggered_at)
      .sort(
        (a, b) =>
          new Date(b.triggered_at!).getTime() -
          new Date(a.triggered_at!).getTime(),
      )[0] ?? null;

  return (
    <SwipeBackGesture onGoBack={() => navigation.goBack()}>
    <View className="flex-1 bg-background">
      <View className="bg-background" style={{ paddingTop: insets.top }}>
        <StockHeader
          companyName={companyName}
          onBack={navigation.goBack}
          symbol={symbol}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
        showsVerticalScrollIndicator={false}>
        <PriceOverview stats={stockChart.priceStats} />
        <OHLCVCard stats={stockChart.priceStats} />
        <RangeSelector
          active={stockChart.timeframe}
          onChange={stockChart.setTimeframe}
        />
        <CandlestickChart
          data={stockChart.data}
          error={stockChart.error}
          isLoading={stockChart.isLoading}
          onRetry={stockChart.refresh}
        />
        <TechnicalSummary stats={stockChart.technicalStats} />
        <ActionButtons
          symbol={symbol}
          isWatched={isWatched}
          watchlistLoading={watchlistLoading}
          onCreateAlert={() => setShowCreateAlert(true)}
        />

        {/* Alert Configuration Card */}
        {isAuthenticated && (
          <View className="mx-4 bg-surface border border-border rounded-cardxl p-4 gap-3">
            <Text className="text-[13px] font-bold uppercase tracking-[0.8px] text-typography-muted">
              Alert Configuration
            </Text>
            <View className="flex-row gap-4">
              <View className="gap-0.5">
                <Text className="text-[11px] text-typography-muted uppercase tracking-[0.5px]">
                  Active
                </Text>
                <Text className="text-[17px] font-bold text-typography">
                  {stockAlerts.filter((a) => a.status === 'ACTIVE').length}
                </Text>
              </View>
              <View className="gap-0.5">
                <Text className="text-[11px] text-typography-muted uppercase tracking-[0.5px]">
                  Total
                </Text>
                <Text className="text-[17px] font-bold text-typography">
                  {stockAlerts.length}
                </Text>
              </View>
              <View className="gap-0.5">
                <Text className="text-[11px] text-typography-muted uppercase tracking-[0.5px]">
                  Last Triggered
                </Text>
                <Text className="text-[14px] font-semibold text-typography">
                  {lastTriggered
                    ? new Date(lastTriggered.triggered_at!).toLocaleDateString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        },
                      )
                    : '--'}
                </Text>
              </View>
            </View>

            {!isWatched ? (
              <View className="bg-warning/10 rounded-md p-3">
                <Text className="text-[12px] text-warning text-center">
                  Add {symbol} to your watchlist to create alerts
                </Text>
              </View>
            ) : stockAlerts.length === 0 ? (
              <Text className="text-[13px] text-typography-muted italic">
                No alerts for {symbol}
              </Text>
            ) : (
              <View className="gap-2">
                {stockAlerts.map((a) => {
                  const isToggling = togglingIds.has(a.id);
                  const label =
                    a.alert_type === 'VOLUME_SPIKE'
                      ? `${a.threshold}x vol`
                      : `${a.alert_type === 'PRICE_ABOVE' ? '↑' : '↓'} ${a.threshold.toLocaleString('en-US')}`;
                  return (
                    <View
                      key={a.id}
                      className="flex-row items-center justify-between py-1"
                    >
                      <Text className="text-[13px] text-typography flex-1">
                        {label}
                      </Text>
                      {isToggling ? (
                        <View className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent" />
                      ) : (
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => handleToggleAlert(a.id, a.status)}
                          hitSlop={8}
                        >
                          <View
                            className="w-8 h-5 rounded-full items-center justify-center"
                            style={{
                              backgroundColor:
                                a.status === 'ACTIVE'
                                  ? '#22C55E40'
                                  : '#334155',
                            }}
                          >
                            <Text
                              className="text-[10px] font-bold"
                              style={{
                                color:
                                  a.status === 'ACTIVE'
                                    ? '#22C55E'
                                    : '#64748B',
                              }}
                            >
                              {a.status === 'ACTIVE' ? 'ON' : 'OFF'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowCreateAlert(true)}
              disabled={!watchlistLoading && !isWatched}
              className="h-10 rounded-md items-center justify-center"
              style={{
                backgroundColor: !watchlistLoading && !isWatched ? '#334155' : '#3B82F6',
                opacity: !watchlistLoading && !isWatched ? 0.5 : 1,
              }}
            >
              <Text className="text-[13px] font-bold text-white">
                {watchlistLoading ? 'Loading...' : '+ Add Alert'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <PeerComparison />
        <DataQualityFooter
          fetchedAt={stockChart.fetchedAt}
          lastUpdated={stockChart.priceStats.lastUpdated}
        />
      </ScrollView>

      <CreateAlertModal
        visible={showCreateAlert}
        onClose={() => setShowCreateAlert(false)}
        preSelectedSymbol={symbol}
        onSuccess={() => void loadStockAlerts()}
      />
    </View>
    </SwipeBackGesture>
  );
}
