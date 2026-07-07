import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootScreenProps } from '@/app/navigation/navigation.types';
import { ProfileChildHeader } from '@/features/profile/components/ProfileChildHeader';
import {
  changePassword,
  ProfileRequestError,
} from '@/features/profile/services/profile.service';
import { Text, Card } from '@/shared/ui';
import { useAuthStore } from '@/stores/auth.store';

export function ChangePasswordScreen({ navigation }: RootScreenProps<'ChangePassword'>) {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      currentPassword.trim().length > 0 &&
      newPassword.trim().length >= 8 &&
      newPassword === confirmPassword,
    [confirmPassword, currentPassword, newPassword],
  );

  const returnToProfile = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!session?.accessToken) {
      clearSession();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (!canSubmit) {
      setError('Please make sure the new password is at least 8 characters and matches.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await changePassword(session.accessToken, currentPassword, newPassword);
      returnToProfile();
    } catch (error) {
      if (error instanceof ProfileRequestError && error.status === 401) {
        clearSession();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setError(error instanceof Error ? error.message : 'Unable to change password right now.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, clearSession, currentPassword, navigation, newPassword, returnToProfile, session]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
        <ProfileChildHeader
          onBack={returnToProfile}
          subtitle="Use your current password before setting a new one"
          title="Change Password"
        />

        <ScrollView
          contentContainerClassName="pb-8 px-4"
          keyboardShouldPersistTaps="handled"
          className="flex-1 bg-background">
          <Card className="bg-surface border-border rounded-cardxl border p-4 gap-4">
            <View className="gap-2">
              <Text className="text-2xs text-typography-muted font-bold leading-4">CURRENT PASSWORD</Text>
              <TextInput
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#64748B"
                secureTextEntry
                className="bg-background border border-border rounded-sm text-typography text-sm min-h-[48px] px-4"
                value={currentPassword}
              />
            </View>

            <View className="gap-2">
              <Text className="text-2xs text-typography-muted font-bold leading-4">NEW PASSWORD</Text>
              <TextInput
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#64748B"
                secureTextEntry
                className="bg-background border border-border rounded-sm text-typography text-sm min-h-[48px] px-4"
                value={newPassword}
              />
            </View>

            <View className="gap-2">
              <Text className="text-2xs text-typography-muted font-bold leading-4">CONFIRM NEW PASSWORD</Text>
              <TextInput
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#64748B"
                secureTextEntry
                className="bg-background border border-border rounded-sm text-typography text-sm min-h-[48px] px-4"
                value={confirmPassword}
              />
            </View>

            {error ? <Text className="text-2xs text-market-down leading-4">{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => {
                void handleSubmit();
              }}
              className="items-center justify-center min-h-[48px] rounded-sm"
              style={({ pressed }) => [
                { backgroundColor: '#3B82F6' },
                { opacity: (pressed || isSubmitting) ? 0.8 : 1 },
              ]}>
              <Text className="text-sm text-[#F8FAFC] font-bold leading-5">
                {isSubmitting ? 'Updating...' : 'Update password'}
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
