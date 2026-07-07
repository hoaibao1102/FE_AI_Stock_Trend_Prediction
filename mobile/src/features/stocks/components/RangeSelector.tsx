import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';
import type { StockTimeframe } from '@/features/stocks/types';
import {
  timeframeOptions,
  timeframeLabels,
} from '@/features/stocks/utils/stockDetailCalculations';

type RangeSelectorProps = {
  active: StockTimeframe;
  onChange: (timeframe: StockTimeframe) => void;
};

export function RangeSelector({ active, onChange }: RangeSelectorProps) {
  return (
    <View className="flex-row border border-border bg-surface rounded-cardxl gap-1 mx-4 p-1">
      {timeframeOptions.map((timeframe) => {
        const isActive = timeframe === active;

        return (
          <Pressable
            accessibilityRole="button"
            key={timeframe}
            onPress={() => onChange(timeframe)}
            style={[
              { alignItems: 'center', flex: 1, height: 36, justifyContent: 'center', borderRadius: 4 },
              isActive && { backgroundColor: '#1E293B', borderColor: '#3B82F6', borderWidth: 1 },
            ]}>
            <Text style={[isActive && { color: '#F8FAFC' }]} className="text-[12px] font-bold leading-4 text-typography-muted">
              {timeframeLabels[timeframe]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
