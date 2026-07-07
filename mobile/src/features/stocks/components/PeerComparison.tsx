import { View } from 'react-native';

import { Text } from '@/shared/ui';
import {
  formatMoney,
  formatPercent,
} from '@/features/stocks/utils/stockDetailCalculations';

const peers = [
  { symbol: 'MWG', price: 64100, change: 1.24 },
  { symbol: 'MSN', price: 82600, change: -0.58 },
  { symbol: 'VNM', price: 71100, change: 0.36 },
];

export function PeerComparison() {
  return (
    <View className="gap-2 px-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold leading-6 text-typography">Peer Comparison</Text>
        <Text className="text-[12px] font-extrabold leading-4 text-primary-500">View all</Text>
      </View>
      <View className="flex-row gap-2">
        {peers.map((peer) => {
          const color = peer.change >= 0 ? '#22C55E' : '#EF4444';

          return (
            <View key={peer.symbol} className="flex-1 border border-border bg-surface rounded-md gap-1 p-2">
              <Text className="text-[12px] font-extrabold leading-4 text-typography-muted">{peer.symbol}</Text>
              <Text numberOfLines={1} className="text-sm font-extrabold leading-[18px] text-typography">
                {formatMoney(peer.price)}
              </Text>
              <Text style={{ color }} className="text-[12px] font-extrabold leading-4">
                {formatPercent(peer.change)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
