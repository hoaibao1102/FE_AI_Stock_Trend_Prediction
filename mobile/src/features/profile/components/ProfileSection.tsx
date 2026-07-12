import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/shared/ui';

type ProfileSectionProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function ProfileSection({ children, description, title }: ProfileSectionProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-lg text-typography font-semibold leading-6">{title}</Text>
        {description ? <Text className="text-2xs text-typography-muted leading-4">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}
