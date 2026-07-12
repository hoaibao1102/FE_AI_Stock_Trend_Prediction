import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Card, Text } from '@/shared/ui';

type ProfileRowProps = {
  accent?: 'default' | 'danger';
  centered?: boolean;
  description?: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  value?: string;
};

export function ProfileRow({
  accent = 'default',
  centered = false,
  description,
  disabled = false,
  icon: Icon,
  label,
  onPress,
  showChevron = true,
  value,
}: ProfileRowProps) {
  const iconColor =
    accent === 'danger'
      ? '#EF4444'
      : disabled
        ? '#94A3B8'
        : '#64748B';
  const labelColor = accent === 'danger' ? '#EF4444' : '#F8FAFC';
  const valueColor = accent === 'danger' ? '#EF4444' : '#64748B';
  const chevronColor =
    accent === 'danger'
      ? '#EF4444'
      : disabled
        ? '#94A3B8'
        : '#64748B';

  const content = (
    <View className={`flex-row items-center gap-2 justify-between min-h-[56px] px-4 py-2 ${centered ? 'justify-center' : ''} ${disabled ? 'opacity-70' : ''}`}>
      <View className={`flex-row items-center flex-1 gap-2 ${centered ? 'justify-center' : ''}`}>
        <View className={`items-center justify-center w-9 h-9 rounded-sm bg-surface-elevated ${centered ? 'absolute left-0' : ''}`}>
          <Icon color={iconColor} size={18} />
        </View>
        <View className={`flex-1 gap-1 ${centered ? 'items-center justify-center' : ''}`}>
          <Text className={`text-sm font-semibold leading-5 ${centered ? 'text-center' : ''}`} style={{ color: labelColor }}>
            {label}
          </Text>
          {description ? <Text className="text-2xs text-typography-muted leading-4">{description}</Text> : null}
        </View>
      </View>
      <View className={`flex-row items-center gap-2 ${centered ? 'absolute right-4' : ''}`}>
        {value ? <Text className="text-2xs leading-4" style={{ color: valueColor }}>{value}</Text> : null}
        {showChevron ? (
          <ChevronRight color={chevronColor} size={18} />
        ) : null}
      </View>
    </View>
  );

  return (
    <Card className="bg-surface border-border rounded-cardxl border overflow-hidden">
      {disabled || !onPress ? (
        content
      ) : (
        <TouchableOpacity
          activeOpacity={1}
          accessibilityRole="button"
          onPress={onPress}
          className="min-h-[56px]">
          {content}
        </TouchableOpacity>
      )}
    </Card>
  );
}
