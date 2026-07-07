import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bolt, Crown, ShieldCheck, Star, TrendingUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootScreenProps } from '@/app/navigation/navigation.types';
import { clearPersistedSession } from '@/shared/services/tokenStorage';
import { Card, Text, useToast } from '@/shared/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useProfile } from '@/features/profile/hooks/useProfile';
import {
  createSubscriptionPayment,
  openSubscriptionCheckout,
  SubscriptionRequestError,
} from '@/features/profile/services/subscription.service';

const BENEFITS = [
  {
    icon: Crown,
    text: 'Expand your watchlist from 5 stocks to 50 stocks.',
  },
  {
    icon: TrendingUp,
    text: 'Unlock premium workflows and deeper stock-following capability.',
  },
  {
    icon: ShieldCheck,
    text: 'Keep your plan status synced directly from the backend subscription service.',
  },
];

function isActivePro(plan?: string, status?: string) {
  return plan === 'PRO' && status === 'ACTIVE';
}

function formatExpiry(value?: string | null) {
  if (!value) {
    return 'No active expiry date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No active expiry date';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function UpgradePlanScreen({ navigation }: RootScreenProps<'UpgradePlan'>) {
  const { showToast } = useToast();
  const clearSession = useAuthStore((state) => state.clearSession);
  const session = useAuthStore((state) => state.session);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnauthorized = useCallback(() => {
    clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [clearSession, navigation]);

  const { error, isLoading, profile, refresh, retry } = useProfile({
    onUnauthorized: handleUnauthorized,
  });

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const effectiveProfile = profile ?? session?.user ?? null;
  const activePro = isActivePro(
    effectiveProfile?.plan,
    effectiveProfile?.subscription_status,
  );

  const planLabel = useMemo(() => {
    if (activePro) {
      return 'PRO active';
    }

    return effectiveProfile?.plan === 'PRO' ? 'PRO pending' : 'FREE plan';
  }, [activePro, effectiveProfile?.plan]);

  const handleUpgrade = useCallback(async () => {
    const accessToken = useAuthStore.getState().session?.accessToken;

    if (!accessToken) {
      await clearPersistedSession();
      clearSession();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payment = await createSubscriptionPayment(accessToken);
      showToast(
        'Redirecting to payment',
        'The PayOS checkout page is opening in your browser.',
        'info',
      );
      await openSubscriptionCheckout(payment.checkoutUrl);
      void refresh();
    } catch (error) {
      if (error instanceof SubscriptionRequestError && error.status === 401) {
        await clearPersistedSession();
        clearSession();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start the upgrade flow right now.';

      showToast('Upgrade unavailable', message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [clearSession, navigation, refresh, showToast]);

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow gap-6 px-4"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} className="self-start items-center justify-center min-h-[38px] px-4 bg-surface border border-border rounded-full">
          <Text className="text-xs text-typography font-bold leading-5">Back</Text>
        </Pressable>

        <Card className="bg-[#1D4ED8] border-[#60A5FA] rounded-cardxl border overflow-hidden p-4 gap-4 relative">
          <View className="absolute -right-[65px] -top-[55px] w-[180px] h-[180px] rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          <View className="absolute right-[50px] -bottom-[50px] w-[140px] h-[140px] rounded-full" style={{ backgroundColor: 'rgba(191, 219, 254, 0.12)' }} />
          <View className="items-center justify-center w-11 h-11 rounded-cardxl border" style={{ backgroundColor: 'rgba(15, 23, 42, 0.22)', borderColor: 'rgba(255, 255, 255, 0.16)' }}>
            <Crown color="#F8FAFC" size={20} />
          </View>
          <Text className="text-2xs text-[#BFDBFE] font-bold leading-4" style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>AI Stock Trend Pro</Text>
          <Text className="text-3xl text-[#F8FAFC] font-bold leading-8">See the benefits and upgrade in one tap</Text>
          <Text className="text-sm text-[#DBEAFE] leading-5">
            This mobile page is built for user accounts that want a clear PRO offer and a direct upgrade button.
          </Text>

          <View className="flex-row items-center flex-wrap gap-2 justify-between">
            <View className="flex-row items-center gap-1 px-2 py-[6px] rounded-full border" style={{ backgroundColor: 'rgba(15, 23, 42, 0.26)', borderColor: 'rgba(255, 255, 255, 0.14)' }}>
              <Star color="#FCD34D" size={14} />
              <Text className="text-2xs text-[#F8FAFC] font-bold leading-4">{planLabel}</Text>
            </View>
            <Text className="text-sm text-[#E2E8F0] font-bold leading-5">50,000 VND / 30 days</Text>
          </View>
        </Card>

        <Card className="bg-surface-elevated border-border rounded-cardxl border p-4 gap-4">
          <Text className="text-lg text-typography font-bold leading-6">PRO benefits</Text>
          <View className="gap-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <View key={benefit.text} className="flex-row items-center gap-2">
                  <View className="items-center justify-center w-9 h-9 rounded-md" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)' }}>
                    <Icon color="#3B82F6" size={18} />
                  </View>
                  <Text className="text-sm text-typography leading-5 flex-1">{benefit.text}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card className="bg-surface-elevated border-border rounded-cardxl border p-4 gap-4">
          <Text className="text-lg text-typography font-bold leading-6">Current subscription</Text>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-2xs text-typography-muted leading-5 flex-1">Plan</Text>
            <Text className="text-2xs text-typography font-bold leading-5 flex-1 text-right">{effectiveProfile?.plan ?? 'FREE'}</Text>
          </View>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-2xs text-typography-muted leading-5 flex-1">Status</Text>
            <Text className="text-2xs text-typography font-bold leading-5 flex-1 text-right">{effectiveProfile?.subscription_status ?? 'NONE'}</Text>
          </View>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-2xs text-typography-muted leading-5 flex-1">Expires on</Text>
            <Text className="text-2xs text-typography font-bold leading-5 flex-1 text-right">{formatExpiry(effectiveProfile?.subscription_expires_at)}</Text>
          </View>
          {error ? (
            <Pressable accessibilityRole="button" onPress={retry} className="self-start items-center justify-center min-h-[40px] px-4 bg-surface border border-border rounded-sm">
              <Text className="text-2xs text-typography font-bold leading-5">Retry loading account data</Text>
            </Pressable>
          ) : null}
        </Card>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || isLoading || activePro}
          onPress={() => {
            void handleUpgrade();
          }}
          className={`items-center justify-center min-h-[56px] px-4 rounded-cardxl ${isLoading || activePro ? 'opacity-60' : ''}`}
          style={({ pressed }) => [
            { backgroundColor: '#3B82F6' },
            { opacity: (pressed || isSubmitting) ? 0.88 : 1 },
          ]}>
          {isSubmitting ? (
            <ActivityIndicator color="#F8FAFC" size="small" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Bolt color="#F8FAFC" size={18} />
              <Text className="text-base text-[#F8FAFC] font-bold leading-5">
                {activePro ? 'Your PRO plan is already active' : 'Upgrade to PRO'}
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
