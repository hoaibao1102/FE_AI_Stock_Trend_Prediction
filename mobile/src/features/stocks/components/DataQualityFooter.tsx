import { View } from 'react-native';

import { Text } from '@/shared/ui';

type DataQualityFooterProps = {
  fetchedAt: Date | null;
  lastUpdated: string | null;
};

export function DataQualityFooter({ fetchedAt, lastUpdated }: DataQualityFooterProps) {
  const timestamp = lastUpdated ?? fetchedAt?.toLocaleString() ?? '--';

  return (
    <View className="flex-row flex-wrap border border-border bg-surface rounded-md mx-4 p-4 gap-y-2">
      <View className="gap-1 w-1/2">
        <Text className="text-[11px] font-bold leading-[14px] text-typography-muted">Source</Text>
        <Text className="text-[13px] font-bold leading-[18px] text-typography">HOSE</Text>
      </View>
      <View className="gap-1 w-1/2">
        <Text className="text-[11px] font-bold leading-[14px] text-typography-muted">Status</Text>
        <Text className="text-[13px] font-extrabold leading-[18px] text-market-up">Stable</Text>
      </View>
      <View className="gap-1 w-full">
        <Text className="text-[11px] font-bold leading-[14px] text-typography-muted">Last updated</Text>
        <Text className="text-[13px] font-bold leading-[18px] text-typography">{timestamp}</Text>
      </View>
    </View>
  );
}
