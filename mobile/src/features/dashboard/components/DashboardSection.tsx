import type { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@/shared/ui';

type DashboardSectionProps = {
  children: ReactNode;
  subtitle: string;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function DashboardSection({
  children,
  subtitle,
  title,
  actionLabel,
  onActionPress,
}: DashboardSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-4 justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-xl font-bold leading-7 text-typography">{title}</Text>
          <Text className="text-xs leading-4 text-typography-muted">{subtitle}</Text>
        </View>
        {actionLabel && onActionPress ? (
          <TouchableOpacity activeOpacity={0.82} onPress={onActionPress}>
            <Text className="text-xs font-bold leading-4 text-primary-500">{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}
