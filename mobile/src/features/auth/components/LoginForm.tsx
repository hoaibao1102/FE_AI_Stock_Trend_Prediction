import { useRef } from 'react';
import {
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

import { Box, HStack, Pressable, Spinner, Text, VStack } from '@/shared/ui/primitives';
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton';
import { LoginField } from '@/features/auth/components/LoginField';
import type { LoginFormValues } from '@/features/auth/types';

type LoginFormProps = {
  formik: {
    values: LoginFormValues;
    errors: Partial<Record<keyof LoginFormValues, string>>;
    touched: Partial<Record<keyof LoginFormValues, boolean>>;
    isSubmitting: boolean;
    handleSubmit: () => void;
    setFieldValue: (field: string, value: unknown) => void;
    setFieldTouched: (field: string) => void;
  };
  errorMessage: string | null;
  isGoogleSubmitting: boolean;
  showPassword: boolean;
  onGoogleLogin: () => void;
  onTogglePassword: () => void;
  onNavigateToRegister?: () => void;
  metrics: {
    fieldHeight: number;
    bodySize: number;
    labelSize: number;
    buttonHeight: number;
    cardPadding: number;
  };
};

export function LoginForm({
  formik,
  errorMessage,
  isGoogleSubmitting,
  showPassword,
  onGoogleLogin,
  onTogglePassword,
  onNavigateToRegister,
  metrics,
}: LoginFormProps) {
  const passwordRef = useRef<TextInput | null>(null);
  const FIELD_SURFACE = '#121A25';
  const FIELD_BORDER = 'rgba(66, 71, 84, 0.92)';
  const FORM_ERROR = '#F8B4B4';
  const FORM_ERROR_BORDER = 'rgba(239, 68, 68, 0.24)';

  return (
    <VStack space="md">
      {/* Email Field */}
      <VStack space="xs">
        <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>EMAIL ADDRESS</Text>
        <LoginField
          accessibilityLabel="Email address"
          autoComplete="email"
          fieldHeight={metrics.fieldHeight}
          icon={<Mail color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          invalid={Boolean(formik.touched.email && formik.errors.email)}
          keyboardType="email-address"
          onBlur={() => formik.setFieldTouched('email')}
          onChangeText={(value) => formik.setFieldValue('email', value)}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="youremail@gmail.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={formik.values.email}
        />
        {formik.touched.email && formik.errors.email ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2.2%' }}>{formik.errors.email}</Text>
        ) : null}
      </VStack>

      {/* Password Field */}
      <VStack space="xs">
        <HStack className="items-center justify-between">
          <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>PASSWORD</Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Forgot Password',
                'Password recovery is currently handled through your operations team.'
              )
            }>
            <Text className="text-primary-500 font-bold" style={{ fontSize: metrics.labelSize }}>Forgot Password?</Text>
          </Pressable>
        </HStack>
        <LoginField
          accessibilityLabel="Password"
          autoComplete="password"
          fieldHeight={metrics.fieldHeight}
          icon={<Lock color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          inputRef={passwordRef}
          invalid={Boolean(formik.touched.password && formik.errors.password)}
          onBlur={() => formik.setFieldTouched('password')}
          onChangeText={(value) => formik.setFieldValue('password', value)}
          onSubmitEditing={() => formik.handleSubmit()}
          placeholder="Enter your password"
          returnKeyType="done"
          rightAccessory={
            <Pressable
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              onPress={onTogglePassword}
              className="items-center justify-center"
              style={{ minWidth: '14%', paddingVertical: '2%' }}>
              {showPassword ? <EyeOff color="#3B82F6" size={metrics.fieldHeight * 0.33} /> : <Eye color="#3B82F6" size={metrics.fieldHeight * 0.33} />}
            </Pressable>
          }
          secureTextEntry={!showPassword}
          textContentType="password"
          value={formik.values.password}
        />
        {formik.touched.password && formik.errors.password ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2.2%' }}>{formik.errors.password}</Text>
        ) : null}
      </VStack>

      {/* Remember Me */}
      <HStack className="items-center justify-start">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: formik.values.rememberMe }}
          onPress={() => formik.setFieldValue('rememberMe', !formik.values.rememberMe)}
          className="flex-row items-center"
          style={{ minHeight: metrics.fieldHeight * 0.72 }}>
          <Box
            className="items-center justify-center border rounded-sm"
            style={{
              backgroundColor: formik.values.rememberMe ? '#3B82F6' : FIELD_SURFACE,
              borderColor: formik.values.rememberMe ? '#3B82F6' : FIELD_BORDER,
              borderWidth: 1.2,
              height: metrics.fieldHeight * 0.38,
              width: metrics.fieldHeight * 0.38,
            }}>
            <Text
              className="font-bold"
              style={{ color: formik.values.rememberMe ? '#08111A' : 'transparent', fontSize: metrics.bodySize }}>
              ✓
            </Text>
          </Box>
          <Text className="text-typography-muted" style={{ fontSize: metrics.bodySize * 0.94, marginLeft: '3.6%' }}>Remember me</Text>
        </Pressable>
      </HStack>

      {/* Error Banner */}
      {errorMessage ? (
        <Box
          className="border rounded-cardxl"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderColor: FORM_ERROR_BORDER,
            borderWidth: 1,
            paddingHorizontal: '4.6%',
            paddingVertical: '3.4%',
          }}>
          <Text className="text-center text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.9, lineHeight: metrics.bodySize * 1.45 }}>{errorMessage}</Text>
        </Box>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.88}
        disabled={formik.isSubmitting || isGoogleSubmitting}
        onPress={() => formik.handleSubmit()}
        className="w-full items-center justify-center px-6 py-3"
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 14,
          minHeight: metrics.buttonHeight,
          opacity: formik.isSubmitting || isGoogleSubmitting ? 0.6 : 1,
        }}>
        <HStack className="items-center justify-center">
          {formik.isSubmitting ? (
            <>
              <Spinner color="#F8FAFC" size="small" />
              <Text className="text-white font-extrabold" style={{ fontSize: metrics.bodySize * 1.03, letterSpacing: metrics.bodySize * 0.02, marginLeft: '3%' }}>Signing in</Text>
            </>
          ) : (
            <>
              <Text className="text-white font-extrabold" style={{ fontSize: metrics.bodySize * 1.03, letterSpacing: metrics.bodySize * 0.02 }}>Login</Text>
              <Text className="text-white font-extrabold" style={{ fontSize: metrics.bodySize * 1.12, marginLeft: '2%' }}>→</Text>
            </>
          )}
        </HStack>
      </TouchableOpacity>

      <HStack className="items-center justify-center" style={{ marginTop: '1%' }}>
        <Box className="flex-1 h-[1px]" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }} />
        <Text
          className="text-typography-muted font-bold"
          style={{
            fontSize: metrics.labelSize,
            letterSpacing: metrics.labelSize * 0.08,
            marginHorizontal: 12,
          }}>
          OR CONTINUE WITH
        </Text>
        <Box className="flex-1 h-[1px]" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }} />
      </HStack>

      <GoogleAuthButton
        bodySize={metrics.bodySize * 0.98}
        buttonHeight={metrics.buttonHeight}
        disabled={formik.isSubmitting || isGoogleSubmitting}
        isSubmitting={isGoogleSubmitting}
        onPress={onGoogleLogin}
      />

      {/* Navigate to Register */}
      {onNavigateToRegister ? (
        <HStack className="items-center justify-center" style={{ paddingTop: '1%' }}>
          <Text className="text-typography-muted" style={{ fontSize: metrics.bodySize * 0.92, lineHeight: metrics.bodySize * 1.5 }}>
            Don&apos;t have an account?{' '}
          </Text>
          <Pressable onPress={onNavigateToRegister}>
            <Text className="text-primary-500 font-bold" style={{ fontSize: metrics.bodySize * 0.92 }}>Register</Text>
          </Pressable>
        </HStack>
      ) : null}
    </VStack>
  );
}
