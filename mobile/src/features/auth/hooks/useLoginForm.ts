import { Alert } from 'react-native';
import { useState } from 'react';
import { useFormik } from 'formik';

import type { LoginFormValues } from '@/features/auth/types';
import { loginValidationSchema } from '@/features/auth/schemas/login.schema';
import {
  getRoleAccessMessage,
  isMobileAllowedRole,
  loginWithCredentials,
} from '@/features/auth/services/auth.service';
import { persistRememberedSession, clearPersistedSession } from '@/shared/services/tokenStorage';
import { useAuthStore } from '@/stores/auth.store';

export function useLoginForm(onSuccess: () => void) {
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { beginSubmit, clearError, errorMessage, failSubmit, setSession } = useAuthStore();

  async function completeSignIn(
    session: Awaited<ReturnType<typeof loginWithCredentials>>,
    rememberMe: boolean,
  ) {
    if (!isMobileAllowedRole(session.user.role)) {
      await clearPersistedSession();
      failSubmit(getRoleAccessMessage(session.user.role));
      return false;
    }

    if (rememberMe) {
      await persistRememberedSession(session);
    } else {
      await clearPersistedSession();
    }

    setSession(session);
    onSuccess();
    return true;
  }

  const formik = useFormik<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
    validationSchema: loginValidationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values) => {
      beginSubmit();
      clearError();

      try {
        const session = await loginWithCredentials({
          email: values.email.trim(),
          password: values.password,
        });
        await completeSignIn(session, values.rememberMe);
      } catch (error) {
        failSubmit(
          error instanceof Error
            ? error.message
            : 'Unable to sign in right now. Please try again.'
        );
      }
    },
  });

  function handleGoogleLogin() {
    Alert.alert('Tính năng tạm thời không khả dụng', 'Đăng nhập bằng Google hiện chưa hỗ trợ trên ứng dụng di động. Vui lòng sử dụng email và mật khẩu hoặc truy cập bản web để có trải nghiệm đầy đủ.');
  }

  return {
    formik,
    showPassword,
    setShowPassword,
    handleGoogleLogin,
    errorMessage,
    isGoogleSubmitting,
    isSubmitting: formik.isSubmitting,
  };
}
