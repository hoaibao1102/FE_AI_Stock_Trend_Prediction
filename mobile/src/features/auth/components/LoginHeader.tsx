import { useMemo } from 'react';

import { Text, VStack } from '@/shared/ui/primitives';

type LoginHeaderProps = {
  metrics: {
    titleSize: number;
    welcomeSize: number;
    subtitleSize: number;
  };
};

export function LoginHeader({ metrics }: LoginHeaderProps) {
  const styles = useMemo(
    () => ({
      brandText: {
        fontSize: metrics.titleSize * 0.56,
        letterSpacing: metrics.titleSize * 0.08,
      },
      welcomeText: {
        fontSize: metrics.welcomeSize,
        lineHeight: metrics.welcomeSize * 1.15,
      },
      subtitleText: {
        fontSize: metrics.subtitleSize,
        lineHeight: metrics.subtitleSize * 1.55,
      },
    }),
    [metrics],
  );

  return (
    <VStack space="sm">
      <Text className="text-primary-500 font-extrabold text-center" style={styles.brandText}>AI STOCK TREND</Text>
      <Text className="text-typography font-extrabold text-center" style={styles.welcomeText}>Welcome back</Text>
      <Text className="text-typography-muted text-center" style={styles.subtitleText}>
        Sign in to your operational dashboard
      </Text>
    </VStack>
  );
}
