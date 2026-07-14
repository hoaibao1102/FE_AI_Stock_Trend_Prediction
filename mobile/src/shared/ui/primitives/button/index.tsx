'use client';
import React, { createContext, useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';

// ─── Color config ─────────────────────────────────────────────────

const BG_COLORS: Record<string, string> = {
  'primary-solid': '#3B82F6',
  'primary-outline': 'transparent',
  'primary-link': 'transparent',
  'secondary-solid': '#1E293B',
  'secondary-outline': 'transparent',
  'secondary-link': 'transparent',
  'positive-solid': '#22C55E',
  'positive-outline': 'transparent',
  'positive-link': 'transparent',
  'negative-solid': '#EF4444',
  'negative-outline': 'transparent',
  'negative-link': 'transparent',
  'default-solid': '#1E293B',
  'default-outline': 'transparent',
  'default-link': 'transparent',
};

const BORDER_COLORS: Record<string, string> = {
  'primary-solid': '#3B82F6',
  'primary-outline': '#3B82F6',
  'primary-link': 'transparent',
  'secondary-solid': '#1E293B',
  'secondary-outline': '#334155',
  'secondary-link': 'transparent',
  'positive-solid': '#22C55E',
  'positive-outline': '#22C55E',
  'positive-link': 'transparent',
  'negative-solid': '#EF4444',
  'negative-outline': '#EF4444',
  'negative-link': 'transparent',
  'default-solid': '#334155',
  'default-outline': '#334155',
  'default-link': 'transparent',
};

const TEXT_COLORS: Record<string, string> = {
  'primary-solid': '#FFFFFF',
  'primary-outline': '#93C5FD',
  'primary-link': '#3B82F6',
  'secondary-solid': '#F8FAFC',
  'secondary-outline': '#94A3B8',
  'secondary-link': '#94A3B8',
  'positive-solid': '#FFFFFF',
  'positive-outline': '#4ADE80',
  'positive-link': '#22C55E',
  'negative-solid': '#FFFFFF',
  'negative-outline': '#F87171',
  'negative-link': '#EF4444',
  'default-solid': '#F8FAFC',
  'default-outline': '#94A3B8',
  'default-link': '#94A3B8',
};

const HEIGHTS: Record<string, number> = {
  xs: 32, sm: 36, md: 40, lg: 44, xl: 48,
};

const FONT_SIZES: Record<string, number> = {
  xs: 11, sm: 13, md: 14, lg: 15, xl: 15,
};

const ICON_DIMS: Record<string, number> = {
  xs: 14, sm: 16, md: 18, lg: 20, xl: 20,
};

function colorKey(action: string, variant: string) {
  return `${action}-${variant}`;
}

// ─── Context ──────────────────────────────────────────────────────

type ButtonCtx = {
  variant: 'solid' | 'outline' | 'link';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  action: 'primary' | 'secondary' | 'positive' | 'negative' | 'default';
};

const ButtonCtx = createContext<ButtonCtx>({
  variant: 'solid', size: 'md', action: 'primary',
});

// ─── Button ───────────────────────────────────────────────────────

type ButtonProps = {
  variant?: 'solid' | 'outline' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  action?: 'primary' | 'secondary' | 'positive' | 'negative' | 'default';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: ViewStyle;
};

function Button({
  variant = 'solid', size = 'md', action = 'primary',
  disabled, loading, onPress, children, className, style,
}: ButtonProps) {
  const key = colorKey(action, variant);
  const height = HEIGHTS[size];
  const useCustomStyle = !className;

  return (
    <ButtonCtx.Provider value={{ variant, size, action }}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        className={className}
        style={({ pressed }) => [
          useCustomStyle && {
            alignItems: 'center',
            backgroundColor: BG_COLORS[key] ?? '#1E293B',
            borderColor: BORDER_COLORS[key] ?? '#334155',
            borderRadius: 4,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 8,
            height,
            justifyContent: 'center',
            opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
            paddingHorizontal: variant === 'link' ? 0 : 16,
          },
          !useCustomStyle && {
            alignItems: 'center',
            borderRadius: 4,
            borderWidth: 0,
            flexDirection: 'row',
            gap: 8,
            height,
            justifyContent: 'center',
            paddingHorizontal: variant === 'link' ? 0 : 16,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={TEXT_COLORS[key] ?? '#F8FAFC'} size="small" />
        ) : (
          children
        )}
      </Pressable>
    </ButtonCtx.Provider>
  );
}

// ─── ButtonText ───────────────────────────────────────────────────

type ButtonTextProps = {
  children: React.ReactNode;
  style?: TextStyle;
};

function ButtonText({ children, style }: ButtonTextProps) {
  const { variant, size, action } = useContext(ButtonCtx);
  const key = colorKey(action, variant);

  return (
    <Text
      style={[
        {
          color: TEXT_COLORS[key] ?? '#F8FAFC',
          fontSize: FONT_SIZES[size],
          fontWeight: '600',
        },
        variant === 'link' && { textDecorationLine: 'underline' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ─── ButtonIcon ───────────────────────────────────────────────────

type ButtonIconProps = {
  icon: React.ReactNode;
  size?: number;
};

function ButtonIcon({ icon, size }: ButtonIconProps) {
  const { size: parentSize } = useContext(ButtonCtx);
  const dim = size ?? ICON_DIMS[parentSize];
  return <View style={{ width: dim, height: dim }}>{icon}</View>;
}

// ─── ButtonGroup ──────────────────────────────────────────────────

type ButtonGroupProps = {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  gap?: number;
  style?: ViewStyle;
};

function ButtonGroup({ children, direction = 'column', gap = 8, style }: ButtonGroupProps) {
  return (
    <View
      style={[
        { flexDirection: direction, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

Button.displayName = 'Button';
ButtonText.displayName = 'ButtonText';
ButtonIcon.displayName = 'ButtonIcon';
ButtonGroup.displayName = 'ButtonGroup';

export { Button, ButtonText, ButtonIcon, ButtonGroup };
export type { ButtonProps, ButtonTextProps, ButtonIconProps, ButtonGroupProps };
