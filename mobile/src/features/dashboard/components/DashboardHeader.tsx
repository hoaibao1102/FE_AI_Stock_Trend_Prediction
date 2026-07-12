import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/shared/ui';
import { BrandTrendIcon, BellIcon } from '@/app/navigation/NavigationIcons';
import { useAppShellStore } from '@/stores/app-shell.store';

type DashboardHeaderProps = {
    badgeLabel?: string;
    onNotificationPress: () => void;
};

export function DashboardHeader({ badgeLabel, onNotificationPress }: DashboardHeaderProps) {
    const insets = useSafeAreaInsets();
    const { unreadNotifications } = useAppShellStore();

    return (
        <View style={{ paddingTop: insets.top + 8 }} className="bg-background pb-2 px-4">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                    <BrandTrendIcon color={'#F8FAFC'} size={20} />
                    <Text className="text-base font-bold text-primary-500">AI STOCK TREND</Text>
                </View>

                <View className="flex-row items-center gap-2">
                    {badgeLabel ? (
                        <View className="items-center bg-surface border-border rounded-full border px-[10px] py-[6px]">
                            <Text className="text-2xs font-bold text-primary-500">{badgeLabel}</Text>
                        </View>
                    ) : null}

                    <Pressable
                        accessibilityHint="Open notification center"
                        accessibilityLabel="Notifications"
                        accessibilityRole="button"
                        onPress={onNotificationPress}
                        className="items-center bg-surface border-border rounded-full border w-[38px] h-[38px] active:opacity-[0.74]">
                        <BellIcon color={'#94A3B8'} size={18} />
                        {unreadNotifications > 0 ? (
                            <View className="items-center bg-primary-500 rounded-full justify-center min-w-4 px-[3px] absolute -right-0.5 -top-0.5">
                                <Text style={{ color: '#08111A' }} className="text-2xs font-bold">
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
