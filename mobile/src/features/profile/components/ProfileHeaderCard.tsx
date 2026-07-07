import { View } from 'react-native';

import { Card, Text } from '@/shared/ui';
import type { UserProfile } from '@/features/profile/types';

function getFallbackValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '--';
}

function getInitials(fullName?: string) {
  const safeName = fullName?.trim();
  if (!safeName) {
    return '--';
  }

  const initials = safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '--';
}

function getStatusTone(status?: string) {
  if (status === 'ACTIVE') {
    return {
      borderColor: '#22C55E',
      textColor: '#22C55E',
    };
  }

  if (status === 'INACTIVE') {
    return {
      borderColor: '#F59E0B',
      textColor: '#F59E0B',
    };
  }

  if (status === 'LOCKED' || status === 'BLOCKED') {
    return {
      borderColor: '#EF4444',
      textColor: '#EF4444',
    };
  }

  return {
    borderColor: '#F59E0B',
    textColor: '#F59E0B',
  };
}

function getPlanTone(plan?: string) {
  if (plan === 'PRO') {
    return {
      borderColor: '#A78BFA',
      textColor: '#C4B5FD',
    };
  }

  return {
    borderColor: '#3B82F6',
    textColor: '#3B82F6',
  };
}

function formatCreatedDate(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function ProfileBadge({
  label,
  tone,
}: {
  label: string;
  tone: { borderColor: string; textColor: string };
}) {
  return (
    <View className="rounded-full border px-2 py-1" style={{ borderColor: tone.borderColor }}>
      <Text className="text-[11px] font-bold leading-[14px]" style={{ color: tone.textColor, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

export function ProfileHeaderCard({ profile }: { profile: UserProfile | null }) {
  const statusValue = getFallbackValue(profile?.status);
  const statusTone = getStatusTone(profile?.status);
  const planValue = getFallbackValue(profile?.plan ?? 'FREE');
  const planTone = getPlanTone(profile?.plan);

  return (
    <Card className="bg-surface-elevated border-border rounded-cardxl border p-4 gap-4">
      <View className="flex-row gap-4">
        <View className="items-center justify-center w-14 h-14 rounded-full bg-background border border-border">
          <Text className="text-lg text-typography font-bold leading-[22px]">{getInitials(profile?.full_name)}</Text>
        </View>
        <View className="flex-1 gap-2">
          <Text className="text-xl text-typography font-bold leading-7">{getFallbackValue(profile?.full_name)}</Text>
          <Text className="text-sm text-typography-muted leading-5">{getFallbackValue(profile?.email)}</Text>
          <View className="flex-row flex-wrap gap-2">
            <ProfileBadge label={planValue} tone={planTone} />
            <ProfileBadge
              label={getFallbackValue(profile?.role)}
              tone={{ borderColor: '#3B82F6', textColor: '#3B82F6' }}
            />
            <ProfileBadge label={statusValue} tone={statusTone} />
          </View>
        </View>
      </View>

      <View className="border-t pt-4" style={{ borderTopColor: '#334155', borderTopWidth: 0.5 }}>
        <View className="flex-1 gap-1">
          <Text className="text-2xs text-typography-muted leading-4">Created</Text>
          <Text className="text-sm text-typography font-semibold leading-5">{formatCreatedDate(profile?.created_at)}</Text>
        </View>
      </View>
    </Card>
  );
}
