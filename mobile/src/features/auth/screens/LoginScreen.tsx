import { useMemo } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Card } from '@/shared/ui/primitives';
import { LoginHeader } from '@/features/auth/components/LoginHeader';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import type { RootScreenProps } from '@/app/navigation/navigation.types';

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const { formik, errorMessage, handleGoogleLogin, isGoogleSubmitting, showPassword, setShowPassword } = useLoginForm(() => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  });

  const metrics = useMemo(() => {
    const shortSide = Math.min(width, height);
    return {
      cardWidth: (width < 380 ? '92%' : width < 430 ? '88%' : '85%') as `${number}%`,
      cardPadding: Math.max(shortSide * 0.055, 18),
      titleSize: Math.max(shortSide * 0.07, 26),
      welcomeSize: Math.max(shortSide * 0.085, 32),
      subtitleSize: Math.max(shortSide * 0.037, 14),
      labelSize: Math.max(shortSide * 0.028, 11),
      bodySize: Math.max(shortSide * 0.037, 14),
      buttonHeight: Math.max(height * 0.066, 48),
      fieldHeight: Math.max(height * 0.068, 50),
      cardTopBottomSpace: Math.max(height * 0.09, 56),
      glowSize: width * 0.68,
    };
  }, [height, width]);

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className="flex-1 bg-background">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-background">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingBottom: Math.max(metrics.cardTopBottomSpace, insets.bottom + 24),
                paddingTop: Math.max(metrics.cardTopBottomSpace, insets.top + 24),
              }}>
              <View className="items-center">
                <Box style={{ width: metrics.cardWidth, alignItems: 'center' }}>
                  <Card
                    className="w-full border border-border overflow-hidden"
                    style={{
                      backgroundColor: '#111827',
                      borderRadius: Math.max(14, Math.min(width * 0.045, 18)),
                      paddingHorizontal: metrics.cardPadding,
                      paddingVertical: metrics.cardPadding * 1.02,
                    }}>
                    <LoginHeader metrics={metrics} />
                    <Box style={{ height: 24 }} />
                    <LoginForm
                      formik={formik}
                      errorMessage={errorMessage}
                      isGoogleSubmitting={isGoogleSubmitting}
                      onGoogleLogin={handleGoogleLogin}
                      showPassword={showPassword}
                      onTogglePassword={() => setShowPassword((v) => !v)}
                      onNavigateToRegister={() => navigation.navigate('Register')}
                      metrics={metrics}
                    />
                  </Card>
                </Box>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
