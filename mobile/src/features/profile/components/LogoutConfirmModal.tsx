import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';

type LogoutConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function LogoutConfirmModal({
  onCancel,
  onConfirm,
  visible,
}: LogoutConfirmModalProps) {
  return (
    <Modal animationType="fade" visible={visible} transparent>
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)' }}>
        <View className="bg-surface-elevated border-border rounded-cardxl border p-4 gap-4 w-full">
          <Text className="text-xl text-typography font-bold leading-7">Log out?</Text>
          <Text className="text-sm text-typography-muted leading-5">
            You will need to sign in again to access your watchlist and market dashboard.
          </Text>

          <View className="flex-row gap-2 justify-end">
            <Pressable accessibilityRole="button" onPress={onCancel} className="items-center justify-center min-h-[44px] px-4 rounded-sm border border-border">
              <Text className="text-sm text-typography font-semibold leading-5">Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onConfirm} className="items-center justify-center min-h-[44px] px-4 rounded-sm" style={{ backgroundColor: '#EF4444' }}>
              <Text className="text-sm text-[#F8FAFC] font-bold leading-5">Log out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
