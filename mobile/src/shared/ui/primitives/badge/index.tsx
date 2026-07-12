import React from 'react';
import { View, Text } from 'react-native';

type BadgeProps = {
  children?: React.ReactNode;
  action?: 'error' | 'warning' | 'success' | 'info' | 'muted';
  size?: 'sm' | 'md' | 'lg';
};

const COLORS: Record<string, { bg: string; text: string; border: string }> = {
  error: { bg: 'transparent', text: '#EF4444', border: '#EF4444' },
  warning: { bg: 'transparent', text: '#F59E0B', border: '#F59E0B' },
  success: { bg: 'transparent', text: '#22C55E', border: '#22C55E' },
  info: { bg: 'transparent', text: '#3B82F6', border: '#3B82F6' },
  muted: { bg: 'transparent', text: '#64748B', border: '#64748B' },
};

function Badge({ children, action = 'muted' }: BadgeProps) {
  const c = COLORS[action];
  return (
    <View className="items-center self-start rounded-full border flex-row gap-1 px-2 py-0.5" style={{ borderColor: c.border }}>
      {typeof children === 'string' ? (
        <Text className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: c.text }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function BadgeText({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={style}>{children}</Text>;
}
function BadgeIcon({ children }: { children?: React.ReactNode }) {
  return <View style={{ width: 14, height: 14 }}>{children}</View>;
}

Badge.displayName = 'Badge';
BadgeText.displayName = 'BadgeText';
BadgeIcon.displayName = 'BadgeIcon';

export { Badge, BadgeText, BadgeIcon };
