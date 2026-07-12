import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Crown, LockKeyhole, LogOut, Mail, Shield, UserRoundPen } from 'lucide-react-native';

import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import { Text, Switch } from '@/shared/ui';
import { clearPersistedSession } from '@/shared/services/tokenStorage';
import { logoutCurrentSession } from '@/features/auth/services/auth.service';
import { LogoutConfirmModal } from '@/features/profile/components/LogoutConfirmModal';
import { ProfileHeaderCard } from '@/features/profile/components/ProfileHeaderCard';
import { ProfileRow } from '@/features/profile/components/ProfileRow';
import { ProfileScreenHeader } from '@/features/profile/components/ProfileScreenHeader';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton';
import { ProfileUpgradeCard } from '@/features/profile/components/ProfileUpgradeCard';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useAuthStore } from '@/stores/auth.store';
import { getAlerts } from '@/features/alerts/services/alert.service';
import { PLAN_LIMITS } from '@/features/alerts/types';

export function ProfileScreen({ navigation }: MainTabScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const clearSession = useAuthStore((state) => state.clearSession);
  const session = useAuthStore((state) => state.session);
  const sessionUser = useAuthStore((state) => state.session?.user);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [alertUsage, setAlertUsage] = useState<{
    stockCount: number;
    maxPerStock: number;
  } | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('alert_email').then((v) => {
      if (v !== null) setEmailEnabled(v !== 'false');
    });
  }, []);

  useEffect(() => {
    if (effectiveProfile) {
      getAlerts()
        .then((a) => {
          const stockCount = new Set(a.map((x) => x.symbol)).size;
          const limit =
            PLAN_LIMITS[effectiveProfile.plan as keyof typeof PLAN_LIMITS] ??
            PLAN_LIMITS.FREE;
          setAlertUsage({
            stockCount,
            maxPerStock:
              a.length > 0
                ? Math.max(
                    ...Array.from(
                      new Set(a.map((x) => x.symbol)),
                      (sym) => a.filter((x) => x.symbol === sym).length,
                    ),
                  )
                : 0,
          });
        })
        .catch(() => {});
    }
  }, [effectiveProfile]);

  const handleUnauthorized = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const { error, isLoading, isRefreshing, profile, refresh, retry } = useProfile({
    onUnauthorized: handleUnauthorized,
  });
  const effectiveProfile = profile ?? sessionUser ?? null;
  const showSkeleton = isLoading && !effectiveProfile;

  const handleLogout = useCallback(async () => {
    setShowLogoutModal(false);
    try {
      if (session?.accessToken) {
        await logoutCurrentSession(session.accessToken);
      }
    } catch {
      // Clear local auth state even if the remote logout request fails.
    }

    await clearPersistedSession();
    clearSession();
  }, [clearSession, session]);

  const openEditPanel = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const openPasswordPanel = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const openUpgradePanel = useCallback(() => {
    navigation.navigate('UpgradePlan');
  }, [navigation]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      <View className="flex-1 bg-background">
        <ScrollView
          contentContainerClassName="px-4"
          contentContainerStyle={{ gap: 24, paddingBottom: 32 + insets.bottom, paddingTop: insets.top + 8 }}
          refreshControl={
            <RefreshControl
              onRefresh={refresh}
              refreshing={isRefreshing}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-background">
          <ProfileScreenHeader status={effectiveProfile?.status} />

          {showSkeleton ? <ProfileSkeleton /> : null}

          {!showSkeleton ? (
            <View className="gap-6">
              <ProfileHeaderCard profile={effectiveProfile} />
              <ProfileUpgradeCard onPress={openUpgradePanel} profile={effectiveProfile} />

              {/* Plan Info */}
              <ProfileSection title="Plan Info">
                <View className="gap-3">
                  <ProfileRow icon={Shield} label="Current plan" value={effectiveProfile?.plan ?? 'FREE'} showChevron={false} />
                  {alertUsage && (
                    <>
                      <ProfileRow icon={Crown} label="Alert stocks" value={`${alertUsage.stockCount} / ${PLAN_LIMITS[effectiveProfile?.plan as keyof typeof PLAN_LIMITS]?.max_alert_stocks ?? 2}`} showChevron={false} />
                      <ProfileRow icon={Crown} label="Max alerts / stock" value={`${alertUsage.maxPerStock} / ${PLAN_LIMITS[effectiveProfile?.plan as keyof typeof PLAN_LIMITS]?.max_alerts_per_stock ?? 2}`} showChevron={false} />
                    </>
                  )}
                  {effectiveProfile?.plan === 'PRO' && effectiveProfile?.subscription_expires_at && (
                    <ProfileRow icon={Crown} label="PRO expires" value={new Date(effectiveProfile.subscription_expires_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} showChevron={false} />
                  )}
                  <View className="flex-row items-center justify-between px-4 py-3 min-h-[56px]">
                    <View className="flex-row items-center flex-1 gap-2">
                      <View className="items-center justify-center w-9 h-9 rounded-sm bg-surface-elevated">
                        <Mail color="#64748B" size={18} />
                      </View>
                      <View className="gap-0.5 flex-1">
                        <Text className="text-typography text-[14px] font-semibold">Email Notifications</Text>
                        <Text className="text-typography-muted text-[11px]">Receive alert emails</Text>
                      </View>
                    </View>
                    <Switch
                      value={emailEnabled}
                      onValueChange={async (v) => {
                        setEmailEnabled(v);
                        await AsyncStorage.setItem('alert_email', String(v));
                      }}
                      trackColor={{ false: '#334155', true: '#22C55E' }}
                      thumbColor="#F8FAFC"
                    />
                  </View>
                </View>
              </ProfileSection>

              {error ? (
                <View className="flex-row items-center justify-between gap-2 px-4 py-2 bg-surface border border-border rounded-cardxl">
                  <Text className="text-2xs text-typography-muted leading-4 flex-1">
                    {error}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={retry}>
                    <Text className="text-2xs text-[#3B82F6] font-bold leading-4">Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              <ProfileSection
                description="Account actions"
                title="Actions">
                <View className="gap-2">
                  <ProfileRow
                    centered
                    icon={UserRoundPen}
                    label="Edit user information"
                    onPress={openEditPanel}
                    showChevron={false}
                  />
                  <ProfileRow
                    centered
                    icon={LockKeyhole}
                    label="Change password"
                    onPress={openPasswordPanel}
                    showChevron={false}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={1}
                    onPress={() => setShowLogoutModal(true)}
                    className="self-stretch items-center justify-center flex-row gap-2 mt-2 min-h-[56px] px-4 w-full rounded-full border-2"
                    style={{ backgroundColor: '#2B1316', borderColor: '#EF4444', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 8 }}>
                    <LogOut color="#EF4444" size={18} />
                    <Text className="text-sm text-market-down font-bold leading-5 text-center">Log out</Text>
                  </TouchableOpacity>
                </View>
              </ProfileSection>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <LogoutConfirmModal
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          void handleLogout();
        }}
        visible={showLogoutModal}
      />
    </SafeAreaView>
  );
}
