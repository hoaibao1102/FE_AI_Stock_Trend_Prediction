import { View } from 'react-native';

import { Text } from '@/shared/ui';

function ProfileStatusChip({ status }: { status?: string }) {
  if (!status) {
    return null;
  }

  const tone =
    status === 'ACTIVE'
      ? { borderColor: '#22C55E', textColor: '#22C55E' }
      : status === 'INACTIVE'
        ? { borderColor: '#F59E0B', textColor: '#F59E0B' }
        : status === 'LOCKED' || status === 'BLOCKED'
          ? { borderColor: '#EF4444', textColor: '#EF4444' }
          : { borderColor: '#F59E0B', textColor: '#F59E0B' };

  return (
    <View className="rounded-full border px-2 py-1" style={{ borderColor: tone.borderColor }}>
      <Text className="text-[11px] font-bold leading-[14px]" style={{ color: tone.textColor, textTransform: 'uppercase' }}>{status}</Text>
    </View>
  );
}

export function ProfileScreenHeader({ status }: { status?: string }) {
  return (
    <View className="flex-row items-start justify-between gap-2">
      <View className="flex-1 gap-1">
        <Text className="text-2xl text-typography font-bold leading-8">Profile</Text>
        <Text className="text-sm text-typography-muted leading-5">Account &amp; app preferences</Text>
      </View>
      <ProfileStatusChip status={status} />
    </View>
  );
}
