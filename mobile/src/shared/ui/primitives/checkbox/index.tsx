'use client';
import React, { useState } from 'react';
import { Pressable, View, Text } from 'react-native';

type CheckboxProps = {
  value?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  color?: string;
};

const BOX_SIZE = { sm: 16, md: 20, lg: 24 };
const FONT_SIZE = { sm: 12, md: 14, lg: 16 };

function Checkbox({
  value = false,
  onChange,
  label,
  size = 'md',
  disabled,
  color = '#3B82F6',
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(value);
  const checked = onChange ? value : internalChecked;
  const dim = BOX_SIZE[size];

  const handlePress = () => {
    if (disabled) return;
    const next = !checked;
    if (onChange) {
      onChange(next);
    } else {
      setInternalChecked(next);
    }
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      className="flex-row items-center gap-2"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: checked ? color : '#334155',
          backgroundColor: checked ? color : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {checked && (
          <Text style={{ color: '#FFFFFF', fontSize: dim * 0.7, lineHeight: dim }}>
            ✓
          </Text>
        )}
      </View>
      {label && (
        <Text className="font-medium text-typography" style={{ fontSize: FONT_SIZE[size] }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

Checkbox.displayName = 'Checkbox';
export { Checkbox };
export type { CheckboxProps };
