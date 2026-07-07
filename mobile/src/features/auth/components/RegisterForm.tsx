import { useRef } from 'react';
import {
  Platform,
  Pressable as RNPressable,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { Mail, Lock, Eye, EyeOff, User, RefreshCw } from 'lucide-react-native';

import { Box, HStack, Spinner, Text, VStack } from '@/shared/ui/primitives';
import { LoginField } from '@/features/auth/components/LoginField';
import type { RegisterFormValues } from '@/features/auth/types';

type RegisterFormProps = {
  formik: {
    values: RegisterFormValues;
    errors: Partial<Record<keyof RegisterFormValues, string>>;
    touched: Partial<Record<keyof RegisterFormValues, boolean>>;
    isSubmitting: boolean;
    isValid: boolean;
    handleSubmit: () => void;
    setFieldValue: (field: string, value: unknown) => void;
    setFieldTouched: (field: string) => void;
  };
  fieldErrors: Record<string, string>;
  errorMessage: string | null;
  successMessage: string | null;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onNavigateToLogin: () => void;
  metrics: {
    fieldHeight: number;
    bodySize: number;
    labelSize: number;
    buttonHeight: number;
  };
};

const FIELD_SURFACE = '#121A25';
const FIELD_BORDER = 'rgba(66, 71, 84, 0.92)';
const BRAND = '#3B82F6';
const FORM_ERROR = '#F8B4B4';
const FORM_ERROR_BORDER = 'rgba(239, 68, 68, 0.24)';
const TEXT_MUTED = '#94A3B8';

export function RegisterForm({
  formik,
  fieldErrors,
  errorMessage,
  successMessage,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
  onNavigateToLogin,
  metrics,
}: RegisterFormProps) {
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);

  const isFormInvalid =
    formik.isSubmitting ||
    !formik.isValid ||
    !formik.values.agreeTerms;

  const getFieldError = (field: keyof RegisterFormValues): string | null => {
    if (fieldErrors[field]) return fieldErrors[field];
    if (formik.touched[field] && formik.errors[field]) return formik.errors[field] ?? null;
    return null;
  };

  return (
    <VStack space="md">
      {/* Full Name Field */}
      <VStack space="xs">
        <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>FULL NAME</Text>
        <LoginField
          accessibilityLabel="Full name"
          autoCapitalize="words"
          autoComplete="off"
          fieldHeight={metrics.fieldHeight}
          icon={<User color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          invalid={Boolean(getFieldError('fullName'))}
          keyboardType="default"
          onBlur={() => formik.setFieldTouched('fullName')}
          onChangeText={(value) => formik.setFieldValue('fullName', value)}
          onSubmitEditing={() => emailRef.current?.focus()}
          placeholder="Enter your full name"
          returnKeyType="next"
          textContentType="name"
          value={formik.values.fullName}
        />
        {getFieldError('fullName') ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2%' }}>{getFieldError('fullName')}</Text>
        ) : null}
      </VStack>

      {/* Email Field */}
      <VStack space="xs">
        <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>EMAIL ADDRESS</Text>
        <LoginField
          accessibilityLabel="Email address"
          autoComplete="email"
          fieldHeight={metrics.fieldHeight}
          icon={<Mail color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          inputRef={emailRef}
          invalid={Boolean(getFieldError('email'))}
          keyboardType="email-address"
          onBlur={() => formik.setFieldTouched('email')}
          onChangeText={(value) => formik.setFieldValue('email', value)}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="you@example.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={formik.values.email}
        />
        {getFieldError('email') ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2%' }}>{getFieldError('email')}</Text>
        ) : null}
      </VStack>

      {/* Password Field */}
      <VStack space="xs">
        <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>PASSWORD</Text>
        <LoginField
          accessibilityLabel="Password"
          autoComplete="password"
          fieldHeight={metrics.fieldHeight}
          icon={<Lock color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          inputRef={passwordRef}
          invalid={Boolean(getFieldError('password'))}
          onBlur={() => formik.setFieldTouched('password')}
          onChangeText={(value) => formik.setFieldValue('password', value)}
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          placeholder="Enter your password"
          returnKeyType="next"
          rightAccessory={
            <RNPressable
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              onPress={onTogglePassword}
              className="items-center justify-center"
              style={{ minWidth: '14%', paddingVertical: '2%' }}>
              {showPassword ? <EyeOff color={BRAND} size={metrics.fieldHeight * 0.33} /> : <Eye color={BRAND} size={metrics.fieldHeight * 0.33} />}
            </RNPressable>
          }
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={formik.values.password}
        />
        {getFieldError('password') ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2%' }}>{getFieldError('password')}</Text>
        ) : (
          <Text className="text-typography-muted" style={{ fontSize: metrics.bodySize * 0.78, lineHeight: metrics.bodySize * 1.3, marginTop: '1.5%' }}>Must be at least 8 characters long.</Text>
        )}
      </VStack>

      {/* Confirm Password Field */}
      <VStack space="xs">
        <Text className="text-typography-muted font-bold" style={{ fontSize: metrics.labelSize, letterSpacing: metrics.labelSize * 0.12 }}>CONFIRM PASSWORD</Text>
        <LoginField
          accessibilityLabel="Confirm password"
          autoComplete="password"
          fieldHeight={metrics.fieldHeight}
          icon={<RefreshCw color="#94A3B8" size={metrics.fieldHeight * 0.33} />}
          inputRef={confirmPasswordRef}
          invalid={Boolean(getFieldError('confirmPassword'))}
          onBlur={() => formik.setFieldTouched('confirmPassword')}
          onChangeText={(value) => formik.setFieldValue('confirmPassword', value)}
          onSubmitEditing={() => formik.handleSubmit()}
          placeholder="Re-enter your password"
          returnKeyType="done"
          rightAccessory={
            <RNPressable
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              accessibilityRole="button"
              onPress={onToggleConfirmPassword}
              className="items-center justify-center"
              style={{ minWidth: '14%', paddingVertical: '2%' }}>
              {showConfirmPassword ? <EyeOff color={BRAND} size={metrics.fieldHeight * 0.33} /> : <Eye color={BRAND} size={metrics.fieldHeight * 0.33} />}
            </RNPressable>
          }
          secureTextEntry={!showConfirmPassword}
          textContentType="newPassword"
          value={formik.values.confirmPassword}
        />
        {getFieldError('confirmPassword') ? (
          <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2%' }}>{getFieldError('confirmPassword')}</Text>
        ) : null}
      </VStack>

      {/* Terms Checkbox */}
      <HStack className="items-center justify-start">
        <RNPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: formik.values.agreeTerms }}
          onPress={() => formik.setFieldValue('agreeTerms', !formik.values.agreeTerms)}
          className="flex-row items-center"
          style={{ minHeight: metrics.fieldHeight * 0.72 }}>
          <Box
            className="items-center justify-center border rounded-sm"
            style={{
              backgroundColor: formik.values.agreeTerms ? '#ADC6FF' : FIELD_SURFACE,
              borderColor: formik.values.agreeTerms ? '#ADC6FF' : FIELD_BORDER,
              borderWidth: 1.2,
              height: metrics.fieldHeight * 0.38,
              width: metrics.fieldHeight * 0.38,
            }}>
            <Text className="font-bold" style={{ color: formik.values.agreeTerms ? '#0F172A' : 'transparent', fontSize: metrics.bodySize }}>✓</Text>
          </Box>
          <Text
            className="text-typography-muted"
            style={{
              fontSize: metrics.bodySize * 0.88,
              lineHeight: metrics.bodySize * 1.35,
              marginLeft: '3.6%',
              flexShrink: 1,
            }}>
            I agree to the{' '}
            <Text className="text-primary-500 font-bold" style={{ fontSize: metrics.bodySize * 0.88, lineHeight: metrics.bodySize * 1.35 }}>Terms of Service</Text>
            {' '}and{' '}
            <Text className="text-primary-500 font-bold" style={{ fontSize: metrics.bodySize * 0.88, lineHeight: metrics.bodySize * 1.35 }}>Privacy Policy</Text>.
          </Text>
        </RNPressable>
      </HStack>
      {formik.touched.agreeTerms && formik.errors.agreeTerms ? (
        <Text className="text-[#F8B4B4]" style={{ fontSize: metrics.bodySize * 0.84, lineHeight: metrics.bodySize * 1.35, marginTop: '2%' }}>{formik.errors.agreeTerms}</Text>
      ) : null}

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

      {/* Success Banner */}
      {successMessage ? (
        <Box
          className="border rounded-cardxl"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            borderColor: 'rgba(34, 197, 94, 0.24)',
            borderWidth: 1,
            paddingHorizontal: '4.6%',
            paddingVertical: '3.4%',
          }}>
          <Text className="text-center text-market-up" style={{ fontSize: metrics.bodySize * 0.9, lineHeight: metrics.bodySize * 1.45 }}>{successMessage}</Text>
        </Box>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.88}
        disabled={isFormInvalid || successMessage !== null}
        onPress={() => formik.handleSubmit()}
        className="w-full items-center justify-center px-6 py-3 rounded-cardxl"
        style={{
          backgroundColor: isFormInvalid ? 'rgba(173, 198, 255, 0.4)' : '#ADC6FF',
          minHeight: metrics.buttonHeight,
        }}>
        <HStack className="items-center justify-center">
          {formik.isSubmitting ? (
            <>
              <Spinner color="#0F172A" size="small" />
              <Text className="text-[#0F172A] font-extrabold" style={{ fontSize: metrics.bodySize * 1.03, letterSpacing: metrics.bodySize * 0.02, marginLeft: '3%' }}>Creating account</Text>
            </>
          ) : (
            <>
              <Text className="text-[#0F172A] font-extrabold" style={{ fontSize: metrics.bodySize * 1.03, letterSpacing: metrics.bodySize * 0.02 }}>Register Account</Text>
              <Text className="text-[#0F172A] font-extrabold" style={{ fontSize: metrics.bodySize * 1.12, marginLeft: '2%' }}>→</Text>
            </>
          )}
        </HStack>
      </TouchableOpacity>

      {/* Navigate to Login */}
      <HStack className="items-center justify-center" style={{ paddingTop: '2%' }}>
        <Text className="text-typography-muted text-center" style={{ fontSize: metrics.bodySize * 0.92, lineHeight: metrics.bodySize * 1.5 }}>
          Already have an account?{' '}
        </Text>
        <RNPressable onPress={onNavigateToLogin}>
          <Text className="text-primary-500 font-bold" style={{ fontSize: metrics.bodySize * 0.92 }}>Log in</Text>
        </RNPressable>
      </HStack>
    </VStack>
  );
}
