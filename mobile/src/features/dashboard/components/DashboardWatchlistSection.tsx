import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import type { DashboardWatchlistItem } from '@/features/dashboard/types';
import { Card, StockListItem, Text } from '@/shared/ui';

type DashboardWatchlistSectionProps = {
  items: DashboardWatchlistItem[];
  trackedStocks: number;
  onOpenFirst?: () => void;
  onSelectSymbol: (symbol: string) => void;
};

export function DashboardWatchlistSection({
  items,
  trackedStocks,
  onOpenFirst,
  onSelectSymbol,
}: DashboardWatchlistSectionProps) {
  return (
    <DashboardSection
      actionLabel={items.length > 0 ? 'Open first' : undefined}
      onActionPress={onOpenFirst}
      subtitle={`${trackedStocks} tracked symbols on your mobile watchlist`}
      title="Watchlist snapshot">
      <Card className="bg-surface border-border rounded-cardxl border overflow-hidden">
        {items.length > 0 ? (
          items.map((item) => (
            <StockListItem
              companyName={item.stock.company_name}
              exchangeCode={item.stock.market_code}
              key={item.watchlist_id}
              onPress={() => onSelectSymbol(item.stock.symbol)}
              price={item.latest_price?.close_price}
              priceChange={item.latest_price?.price_change}
              priceChangePercent={item.latest_price?.price_change_percent}
              rightMeta={item.stock.status}
              symbol={item.stock.symbol}
              volume={item.latest_price?.volume}
            />
          ))
        ) : (
          <Text className="text-xs leading-5 text-typography-muted p-4">No watchlist symbols available yet.</Text>
        )}
      </Card>
    </DashboardSection>
  );
}
