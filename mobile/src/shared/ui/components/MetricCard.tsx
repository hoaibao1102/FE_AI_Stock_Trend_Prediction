import { Text, View } from 'react-native';

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'up' | 'down' | 'warning';
};

const TONE_CLASSES: Record<string, string> = {
  neutral: 'text-typography-disabled',
  up: 'text-market-up',
  down: 'text-market-down',
  warning: 'text-warning',
};

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  return (
    <View className="flex-1 min-w-[150px] gap-1 border border-border rounded-cardxl bg-surface p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-typography-disabled">{label}</Text>
      <Text className="text-[24px] font-bold leading-[32px] text-typography">{value}</Text>
      <Text className={`text-xs font-medium ${toneClass}`}>{detail}</Text>
    </View>
  );
}
