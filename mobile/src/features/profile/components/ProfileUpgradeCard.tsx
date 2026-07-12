import { ArrowRight, Crown, Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/shared/ui';
import type { UserProfile } from '@/features/profile/types';

function isActivePro(profile: UserProfile | null) {
  return profile?.plan === 'PRO' && profile?.subscription_status === 'ACTIVE';
}

function formatExpiry(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ProfileUpgradeCard({
  onPress,
  profile,
}: {
  onPress: () => void;
  profile: UserProfile | null;
}) {
  const activePro = isActivePro(profile);
  const expiry = formatExpiry(profile?.subscription_expires_at);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card
          className={`rounded-cardxl border gap-4 overflow-hidden p-4 relative ${activePro ? 'bg-[#312E81] border-[#A78BFA]' : 'bg-[#1D4ED8] border-[#60A5FA]'} ${pressed ? 'opacity-90' : ''}`}>
          <View className={`absolute -right-[50px] -top-[40px] w-[150px] h-[150px] rounded-full ${!pressed ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          <View className={`absolute -left-[40px] top-[60px] w-[130px] h-[130px] rounded-full ${!pressed ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'rgba(191, 219, 254, 0.12)' }} />

          <View className="flex-row items-center gap-2">
            <View className="items-center justify-center w-[38px] h-[38px] rounded-md border" style={{ backgroundColor: 'rgba(15, 23, 42, 0.26)', borderColor: 'rgba(255, 255, 255, 0.18)' }}>
              <Crown color="#F8FAFC" size={18} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-2xs text-[#BFDBFE] font-bold leading-4" style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>{activePro ? 'PRO active' : 'Go Pro'}</Text>
              <Text className="text-lg text-[#F8FAFC] font-bold leading-6">
                {activePro ? 'Premium benefits are unlocked' : 'Unlock the Pro plan from your profile'}
              </Text>
            </View>
            <ArrowRight color="#F8FAFC" size={18} />
          </View>

          <Text className="text-sm text-[#DBEAFE] leading-5">
            {activePro
              ? `Your PRO plan is active${expiry ? ` until ${expiry}` : ''}. Tap to review benefits and payment details.`
              : 'Tap to see PRO benefits, pricing, and a one-step upgrade button for mobile users.'}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-1 px-2 py-[6px] rounded-full border" style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)', borderColor: 'rgba(255, 255, 255, 0.14)' }}>
              <Sparkles color="#FCD34D" size={14} />
              <Text className="text-2xs text-[#E2E8F0] font-bold leading-4">50-stock watchlist</Text>
            </View>
            <View className="flex-row items-center gap-1 px-2 py-[6px] rounded-full border" style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)', borderColor: 'rgba(255, 255, 255, 0.14)' }}>
              <Sparkles color="#93C5FD" size={14} />
              <Text className="text-2xs text-[#E2E8F0] font-bold leading-4">Premium access</Text>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}
