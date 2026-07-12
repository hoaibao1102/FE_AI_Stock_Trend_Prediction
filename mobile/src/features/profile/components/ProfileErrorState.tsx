import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';

export function ProfileErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="bg-surface border-border rounded-cardxl border p-4 gap-4">
      <Text className="text-base text-typography font-bold leading-6">Unable to load profile</Text>
      <Text className="text-sm text-typography-muted leading-5">{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} className="items-center self-start justify-center min-h-[44px] px-4 rounded-sm bg-primary-500">
        <Text className="text-sm text-[#F8FAFC] font-bold leading-5">Retry</Text>
      </Pressable>
    </View>
  );
}
