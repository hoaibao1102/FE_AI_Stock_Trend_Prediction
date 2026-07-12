import { ArrowLeft, Share2, Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';
import { useToggleWatchlist } from '@/features/stocks/hooks/useToggleWatchlist';

type StockHeaderProps = {
  companyName: string;
  onBack: () => void;
  symbol: string;
};

export function StockHeader({ companyName, onBack, symbol }: StockHeaderProps) {
  const { isWatched, toggle } = useToggleWatchlist(symbol);

  return (
    <View className="flex-row items-center min-h-[56px] px-4">
      <Pressable accessibilityRole="button" onPress={onBack} className="items-center justify-center w-11 h-11">
        <ArrowLeft color="#F8FAFC" size={22} />
      </Pressable>
      <View className="flex-1 px-2">
        <Text className="text-lg font-extrabold leading-6 text-center text-typography">{symbol}</Text>
        <Text numberOfLines={1} className="text-[11px] font-semibold leading-[14px] tracking-[0.8px] text-center text-typography-muted">
          {companyName}
        </Text>
      </View>
      <View className="flex-row">
        <Pressable
          accessibilityHint={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
          accessibilityRole="button"
          onPress={toggle}
          className="items-center justify-center w-11 h-11">
          <Star
            color={isWatched ? '#F59E0B' : '#94A3B8'}
            fill={isWatched ? '#F59E0B' : 'none'}
            size={20}
          />
        </Pressable>
        <Pressable accessibilityRole="button" className="items-center justify-center w-11 h-11">
          <Share2 color="#94A3B8" size={20} />
        </Pressable>
      </View>
    </View>
  );
}
