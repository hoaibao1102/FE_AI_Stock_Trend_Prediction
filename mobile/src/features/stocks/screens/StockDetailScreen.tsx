import { ScrollView, View } from 'react-native';
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
import { useStockChart } from '@/features/stocks/hooks/useStockChart';

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
  const symbol = (route.params?.symbol ?? 'FPT').toUpperCase();
  const companyName = companyNameBySymbol[symbol] ?? `${symbol} CORPORATION`;
  const stockChart = useStockChart(symbol);

  return (
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
        <ActionButtons symbol={symbol} />
        <PeerComparison />
        <DataQualityFooter
          fetchedAt={stockChart.fetchedAt}
          lastUpdated={stockChart.priceStats.lastUpdated}
        />
      </ScrollView>
    </View>
  );
}
