import { BellPlus, MinusCircle, PlusCircle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';
import { useToggleWatchlist } from '@/features/stocks/hooks/useToggleWatchlist';

type ActionButtonsProps = {
  symbol: string;
  isWatched: boolean;
  watchlistLoading: boolean;
  onCreateAlert?: () => void;
};

export function ActionButtons({ symbol: stockSymbol, isWatched: watchedProp, watchlistLoading, onCreateAlert }: ActionButtonsProps) {
  const showDisabled = !watchlistLoading && !watchedProp;
  const { isWatched, toggle } = useToggleWatchlist(stockSymbol);

  return (
    <View className="flex-row gap-2 px-4">
      <Pressable
        accessibilityRole="button"
        onPress={onCreateAlert}
        disabled={showDisabled}
        className="flex-1 flex-row items-center justify-center bg-primary-500 rounded-sm h-11 gap-2"
        style={showDisabled ? { opacity: 0.5 } : undefined}
      >
        <BellPlus color="#F8FAFC" size={18} />
        <Text className="text-sm font-extrabold text-typography">
          {watchlistLoading ? 'Loading...' : !watchedProp ? 'Add to Watchlist First' : 'Create Alert'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={toggle}
        style={[
          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, height: 44, gap: 8 },
          isWatched
            ? { backgroundColor: '#EF444420', borderColor: '#EF4444', borderWidth: 1 }
            : { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
        ]}>
        {isWatched ? (
          <MinusCircle color="#F8FAFC" size={18} />
        ) : (
          <PlusCircle color="#F8FAFC" size={18} />
        )}
        <Text style={isWatched ? { color: '#EF4444' } : { color: '#F8FAFC' }} className="text-sm font-extrabold">
          {isWatched ? 'Remove' : 'Add to Watchlist'}
        </Text>
      </Pressable>
    </View>
  );
}
