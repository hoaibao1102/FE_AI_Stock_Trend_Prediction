import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';
import { useMarketStore } from '@/stores/market.store';

type WatchlistHeaderProps = {
    title: string;
    onAddStock: () => void;
};

export function WatchlistHeader({ title, onAddStock }: WatchlistHeaderProps) {
    const { marketStatus } = useMarketStore();
    const statusDotColor = marketStatus === 'OPEN' ? '#22C55E' : '#F59E0B';
    const statusColor = marketStatus === 'OPEN' ? 'text-market-up' : 'text-typography-disabled';

    return (
        <View className="flex-row items-start justify-between pt-4 pb-2">
            <View className="flex-shrink gap-1">
                <Text className="text-typography text-[24px] font-bold leading-[32px]">{title}</Text>
                <View className="flex-row items-center gap-1">
                    <View style={{ backgroundColor: statusDotColor, width: 6, height: 6, borderRadius: 999 }} />
                    <Text className={`text-[11px] font-semibold tracking-[0.3px] ${statusColor}`}>
                        AI Stock Trend · {marketStatus === 'OPEN' ? 'Market Open' : 'Latest session'}
                    </Text>
                </View>
            </View>
            <Pressable
                accessibilityHint="Add stock to watchlist"
                accessibilityLabel="Add stock"
                accessibilityRole="button"
                onPress={onAddStock}
                className="bg-primary-500 rounded-lg px-4 py-2.5"
                style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}>
                <Text className="text-white text-[13px] font-bold">+ Add</Text>
            </Pressable>
        </View>
    );
}
