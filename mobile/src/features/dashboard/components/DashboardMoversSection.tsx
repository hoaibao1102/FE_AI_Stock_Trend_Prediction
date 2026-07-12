import { View } from 'react-native';

import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import type { DashboardMarketLeaderItem } from '@/features/dashboard/types';
import { Card, StockListItem, Text } from '@/shared/ui';

type DashboardMoversSectionProps = {
  gainers: DashboardMarketLeaderItem[];
  losers: DashboardMarketLeaderItem[];
  onSelectSymbol: (symbol: string) => void;
};

export function DashboardMoversSection({
  gainers,
  losers,
  onSelectSymbol,
}: DashboardMoversSectionProps) {
  return (
    <DashboardSection
      subtitle="Strongest and weakest names in the latest market leader snapshot"
      title="Top movers">
      <View className="gap-4">
        <Card className="bg-surface border-border rounded-cardxl border overflow-hidden py-2">
          <Text className="text-base font-bold leading-5 text-typography px-4 pt-2">Top gainers</Text>
          {gainers.slice(0, 3).map((item) => (
            <StockListItem
              companyName={item.company_name}
              exchangeCode="HOSE"
              key={`gainer-${item.symbol}`}
              onPress={() => onSelectSymbol(item.symbol)}
              price={item.close_price}
              priceChange={item.price_change}
              priceChangePercent={item.price_change_percent}
              symbol={item.symbol}
              volume={item.volume}
            />
          ))}
        </Card>

        <Card className="bg-surface border-border rounded-cardxl border overflow-hidden py-2">
          <Text className="text-base font-bold leading-5 text-typography px-4 pt-2">Top losers</Text>
          {losers.slice(0, 3).map((item) => (
            <StockListItem
              companyName={item.company_name}
              exchangeCode="HOSE"
              key={`loser-${item.symbol}`}
              onPress={() => onSelectSymbol(item.symbol)}
              price={item.close_price}
              priceChange={item.price_change}
              priceChangePercent={item.price_change_percent}
              symbol={item.symbol}
              volume={item.volume}
            />
          ))}
        </Card>
      </View>
    </DashboardSection>
  );
}
