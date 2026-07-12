import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { Text } from '@/shared/ui';

type ProfileChildHeaderProps = {
  onBack: () => void;
  subtitle: string;
  title: string;
};

export function ProfileChildHeader({ onBack, subtitle, title }: ProfileChildHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-background px-4" style={{ paddingTop: insets.top + 8, paddingBottom: 16 }}>
      <View className="flex-row items-center gap-4">
        <Pressable accessibilityRole="button" onPress={onBack} className="items-center justify-center w-10 h-10 border border-border" style={{ borderRadius: 999 }}>
          <ArrowLeft color="#F8FAFC" size={18} />
        </Pressable>
        <View className="flex-1 gap-1">
          <Text className="text-xl text-typography font-bold leading-7">{title}</Text>
          <Text className="text-2xs text-typography-muted leading-4">{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}
