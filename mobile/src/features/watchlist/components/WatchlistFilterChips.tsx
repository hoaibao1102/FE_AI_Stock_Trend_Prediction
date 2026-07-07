import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/shared/ui';

type Chip = {
    key: string;
    label: string;
};

const FILTER_CHIPS: Chip[] = [
    { key: 'all', label: 'All' },
    { key: 'gainers', label: 'Gainers' },
    { key: 'losers', label: 'Losers' },
    { key: 'hose', label: 'HOSE' },
];

type WatchlistFilterChipsProps = {
    activeChip: string;
    onChipChange: (key: string) => void;
};

export function WatchlistFilterChips({ activeChip, onChipChange }: WatchlistFilterChipsProps) {
    const renderChip = useCallback(
        (chip: Chip) => {
            const isActive = activeChip === chip.key;
            return (
                <Pressable
                    key={chip.key}
                    accessibilityHint={`Filter by ${chip.label}`}
                    accessibilityLabel={chip.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => onChipChange(chip.key)}
                    className={`px-4 py-1.5 border rounded-full active:opacity-80 ${
                        isActive
                            ? 'bg-primary-500 border-primary-500'
                            : 'bg-surface-elevated border-outline-300'
                    }`}>
                    <Text
                        className={`text-xs font-semibold ${
                            isActive ? 'text-white' : 'text-typography-400'
                        }`}>
                        {chip.label}
                    </Text>
                </Pressable>
            );
        },
        [activeChip, onChipChange],
    );

    return (
        <View className="mb-2">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2">
                {FILTER_CHIPS.map(renderChip)}
            </ScrollView>
        </View>
    );
}
