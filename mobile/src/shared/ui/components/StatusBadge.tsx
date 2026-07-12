import { Text, View } from 'react-native';

type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'up' | 'down' | 'warning' | 'primary';
};

const TONE_CLASSES: Record<string, { border: string; text: string }> = {
  neutral: { border: 'border-typography-disabled', text: 'text-typography-disabled' },
  up: { border: 'border-market-up', text: 'text-market-up' },
  down: { border: 'border-market-down', text: 'text-market-down' },
  warning: { border: 'border-warning', text: 'text-warning' },
  primary: { border: 'border-primary-500', text: 'text-primary-500' },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const classes = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  return (
    <View className={`self-start rounded-full border px-1 py-0.5 ${classes.border}`}>
      <Text className={`text-2xs font-semibold uppercase tracking-[0.4px] ${classes.text}`}>{label}</Text>
    </View>
  );
}
