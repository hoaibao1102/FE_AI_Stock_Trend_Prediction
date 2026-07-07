import React from 'react';
import { View, Image, Text } from 'react-native';

type AvatarProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  source?: { uri: string };
  name?: string;
};

const SIZES: Record<string, number> = {
  xs: 24, sm: 32, md: 48, lg: 64, xl: 96, '2xl': 128,
};

function Avatar({ size = 'md', source, name }: AvatarProps) {
  const dim = SIZES[size] || 48;
  return (
    <View className="items-center justify-center overflow-hidden bg-primary-500" style={{ width: dim, height: dim, borderRadius: dim / 2 }}>
      {source ? (
        <Image source={source} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
      ) : (
        <Text className="text-white font-semibold uppercase" style={{ fontSize: dim * 0.4 }}>
          {name ? name.charAt(0).toUpperCase() : '?'}
        </Text>
      )}
    </View>
  );
}

function AvatarBadge() { return null; }
function AvatarGroup({ children }: { children?: React.ReactNode }) { return <View className="flex-row-reverse">{children}</View>; }

Avatar.displayName = 'Avatar';
AvatarBadge.displayName = 'AvatarBadge';
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarBadge, AvatarGroup };
