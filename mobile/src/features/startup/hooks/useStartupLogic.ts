import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { readPersistedSession } from '@/shared/services/tokenStorage';
import { runStartup as initializeApp } from '@/features/startup/startup.service';
import { useStartupStore } from '@/stores/startup.store';
import { useAuthStore } from '@/stores/auth.store';
import type { RootStackParamList } from '@/app/navigation/navigation.types';

export function useStartupLogic(
  navigation: NativeStackNavigationProp<RootStackParamList, 'Startup'>
) {
  const spinner = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const detailOpacity = useRef(new Animated.Value(0.72)).current;
  const progressSweep = useRef(new Animated.Value(0)).current;

  const {
    beginInitialization, canRetry, completeInitialization, errorMessage,
    failInitialization, resetRetryState, retryKey, statusText, triggerRetry, updateStatus,
  } = useStartupStore();
  const clearSession = useAuthStore((s) => s.clearSession);
  const setSession = useAuthStore((s) => s.setSession);

  // Entry animation
  useEffect(() => {
    Animated.timing(fade, { duration: 520, easing: Easing.out(Easing.quad), toValue: 1, useNativeDriver: true }).start();
  }, [fade]);

  // Spinner + opacity loops
  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(spinner, { duration: 1080, easing: Easing.linear, toValue: 1, useNativeDriver: true }),
    );
    const opacityLoop = Animated.loop(Animated.sequence([
      Animated.timing(detailOpacity, { duration: 1200, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
      Animated.timing(detailOpacity, { duration: 1200, easing: Easing.inOut(Easing.quad), toValue: 0.62, useNativeDriver: true }),
    ]));
    const progressLoop = Animated.loop(
      Animated.timing(progressSweep, {
        duration: 1700,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    rotationLoop.start();
    opacityLoop.start();
    progressLoop.start();
    return () => { rotationLoop.stop(); opacityLoop.stop(); progressLoop.stop(); };
  }, [detailOpacity, progressSweep, spinner]);

  // Initialization logic
  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    async function runInitialization() {
      resetRetryState();
      beginInitialization();
      const result = await initializeApp();
      if (cancelled) return;
      updateStatus(result.statusText);

      if (result.ok) {
        if (result.destination === '/dashboard') {
          const persistedSession = await readPersistedSession();
          if (persistedSession) setSession(persistedSession);
        } else {
          clearSession();
        }
        completeInitialization(result.statusText);
        Animated.timing(fade, { duration: 280, easing: Easing.out(Easing.quad), toValue: 0, useNativeDriver: true })
          .start(() => {
            if (!cancelled) {
              navigation.reset({
                index: 0,
                routes: [{ name: result.destination === '/dashboard' ? 'MainTabs' : 'Login' }],
              });
            }
          });
        return;
      }

      failInitialization({
        canRetry: result.canRetry, message: result.message,
        phase: result.stage, retryDelayMs: result.retryDelayMs, statusText: result.statusText,
      });
      if (result.canRetry) retryTimeout = setTimeout(() => { triggerRetry(); }, result.retryDelayMs);
    }

    runInitialization();
    return () => { cancelled = true; if (retryTimeout) clearTimeout(retryTimeout); };
  }, [beginInitialization, completeInitialization, clearSession, failInitialization, fade,
    navigation, resetRetryState, retryKey, setSession, triggerRetry, updateStatus]);

  const rotation = spinner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressTranslate = progressSweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-96, 260],
  });

  return {
    fade,
    rotation,
    detailOpacity,
    progressTranslate,
    statusText,
    errorMessage,
    canRetry,
    retryKey,
    triggerRetry,
  };
}
