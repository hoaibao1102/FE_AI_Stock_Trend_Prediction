import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootScreenProps } from '@/app/navigation/navigation.types';
import type { AuthSession } from '@/features/auth/types';
import { ProfileChildHeader } from '@/features/profile/components/ProfileChildHeader';
import { ProfileRequestError, updateProfile } from '@/features/profile/services/profile.service';
import { persistRememberedSession } from '@/shared/services/tokenStorage';
import { Card, Text } from '@/shared/ui';
import { useAuthStore } from '@/stores/auth.store';

export function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [fullName, setFullName] = useState(session?.user.full_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => fullName.trim().length >= 2, [fullName]);

  const returnToProfile = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback(async () => {
    if (!session?.accessToken) {
      clearSession();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (!canSubmit) {
      setError('Full name must be between 2 and 100 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const user = await updateProfile(session.accessToken, fullName);
      const nextSession: AuthSession = {
        ...session,
        user: {
          id: user.id ?? session.user.id,
          email: user.email ?? session.user.email,
          full_name: user.full_name ?? session.user.full_name,
          role: (user.role as AuthSession['user']['role']) ?? session.user.role,
          status: user.status ?? session.user.status,
        },
      };

      setSession(nextSession);
      await persistRememberedSession(nextSession);
      returnToProfile();
    } catch (error) {
      if (error instanceof ProfileRequestError && error.status === 401) {
        clearSession();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setError(error instanceof Error ? error.message : 'Unable to update profile right now.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, clearSession, fullName, navigation, returnToProfile, session, setSession]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
        <ProfileChildHeader
          onBack={returnToProfile}
          subtitle="Update the name shown on your account"
          title="Edit Profile"
        />

        <ScrollView
          contentContainerClassName="pb-8 px-4"
          keyboardShouldPersistTaps="handled"
          className="flex-1 bg-background">
          <Card className="bg-surface border-border rounded-cardxl border p-4 gap-4">
            <Text className="text-2xs text-typography-muted font-bold leading-4">FULL NAME</Text>
            <TextInput
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#64748B"
              className="bg-background border border-border rounded-sm text-typography text-sm min-h-[48px] px-4"
              value={fullName}
            />

            {error ? <Text className="text-2xs text-market-down leading-4">{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => {
                void handleSave();
              }}
              className="items-center justify-center min-h-[48px] rounded-sm"
              style={({ pressed }) => [
                { backgroundColor: '#3B82F6' },
                { opacity: (pressed || isSubmitting) ? 0.8 : 1 },
              ]}>
              <Text className="text-sm text-[#F8FAFC] font-bold leading-5">
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
