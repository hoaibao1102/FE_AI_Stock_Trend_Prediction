import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockKeyhole, LogOut, UserRoundPen } from 'lucide-react-native';

import type { MainTabScreenProps } from '@/app/navigation/navigation.types';
import { Text } from '@/shared/ui';
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

export function ProfileScreen({ navigation }: MainTabScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const clearSession = useAuthStore((state) => state.clearSession);
  const session = useAuthStore((state) => state.session);
  const sessionUser = useAuthStore((state) => state.session?.user);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
