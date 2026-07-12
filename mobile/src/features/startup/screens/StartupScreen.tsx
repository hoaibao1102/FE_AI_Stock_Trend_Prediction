import { Animated, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text } from '@/shared/ui/primitives';
import { TrendMark } from '@/features/startup/components/TrendMark';
import { useStartupLogic } from '@/features/startup/hooks/useStartupLogic';
import { useStartupScreenStyles } from '@/features/startup/screens/startup-screen.styles';
import type { RootScreenProps } from '@/app/navigation/navigation.types';

export function StartupScreen({ navigation }: RootScreenProps<'Startup'>) {
  const insets = useSafeAreaInsets();
  const { fade, detailOpacity, progressTranslate, statusText, errorMessage, canRetry, triggerRetry } =
    useStartupLogic(navigation);

  const styles = useStartupScreenStyles(insets);

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className={styles.root}>
      <View pointerEvents="none" className={styles.gridBackground}>
        {Array.from({ length: 13 }).map((_, row) => (
          <View key={`row-${row}`} className={styles.gridRow}>
            {Array.from({ length: 22 }).map((__, col) => (
              <View key={`dot-${row}-${col}`} className={styles.gridDot.className} style={styles.gridDot.style} />
            ))}
          </View>
        ))}
      </View>

      <Animated.View className={styles.shell.className} style={[styles.shell.style, { opacity: fade }]}>
        <View className={styles.topDivider.className} style={styles.topDivider.style} />

        <View className={styles.card.className} style={styles.card.style}>
          <View className={styles.cardTopDivider.className} style={styles.cardTopDivider.style} />

          <View className={styles.brandCore}>
            <View className={styles.brandHaloOuter.className} style={styles.brandHaloOuter.style}>
              <View className={styles.brandHaloInner.className} style={styles.brandHaloInner.style}>
                <View className={styles.brandBadge.className} style={styles.brandBadge.style}>
                  <TrendMark size={28} />
                </View>
              </View>
              <View className={styles.brandMiniBadge.className} style={styles.brandMiniBadge.style}>
                <TrendMark size={10} />
              </View>
            </View>
          </View>

          <Text className={styles.brandName}>AI STOCK TREND</Text>
          <Text className={styles.brandSubhead} style={styles.brandSubheadStyle}>AI-BASED STOCK TREND PREDICTION</Text>

          <View className={styles.statusBlock}>
            <Animated.View className={styles.statusRow} style={[{ opacity: detailOpacity }]}>
              <View className={styles.statusDot.className} style={styles.statusDot.style} />
              <Text numberOfLines={1} className={styles.statusText}>
                {statusText}
              </Text>
            </Animated.View>
            <View className={styles.progressTrack.className} style={styles.progressTrack.style}>
              <Animated.View
                className={styles.progressFill.className}
                style={[
                  styles.progressFill.style,
                  { opacity: detailOpacity, transform: [{ translateX: progressTranslate }] },
                ]}
              />
            </View>
          </View>

          {errorMessage ? (
            <View className={styles.errorBlock}>
              <Text className={styles.errorText}>{errorMessage}</Text>
              {canRetry ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={triggerRetry}
                  className={styles.retryButton.className}
                  style={({ pressed }) => [styles.retryButton.style, pressed && { opacity: 0.72 }]}>
                  <Text className={styles.retryText}>Retry startup</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className={styles.cardFooterSpacer} />
          )}

          <Text className={styles.versionText} style={styles.versionTextStyle}>v2.4.3_AI_STOCK_TREND // MOBILE</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
