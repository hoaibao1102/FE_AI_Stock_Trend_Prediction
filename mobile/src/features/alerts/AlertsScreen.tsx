import { useEffect } from 'react';

import { Text } from '@/shared/ui/primitives';
import { FeaturePlaceholderScreen } from '@/shared/ui/components/FeaturePlaceholderScreen';
import { useAppShellStore } from '@/stores/app-shell.store';

export function AlertsScreen() {
  const { markNotificationsRead, unreadNotifications } = useAppShellStore();

  useEffect(() => {
    if (unreadNotifications > 0) {
      markNotificationsRead();
    }
  }, [markNotificationsRead, unreadNotifications]);

  return (
    <FeaturePlaceholderScreen
      body="Alert workflows, anomaly rules, and notification history will land here while the shared shell already preserves navigation state and unread badge handling."
      eyebrow="Alerts"
      footer={<Text style={{ color: '#94A3B8', fontSize: 12 }}>Notification center ready for future market triggers.</Text>}
      title="Signal escalation workspace"
    />
  );
}
