'use client';
import React, { useState } from 'react';
import { View, TextInput, Text, ViewStyle } from 'react-native';

type InputProps = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: any;
};

function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  disabled,
  multiline,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
  style,
  inputStyle,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-1" style={style}>
      {label && <Text className="text-[13px] font-medium text-typography-muted mb-0.5">{label}</Text>}
      <View
        className="flex-row items-center bg-surface border border-border rounded-sm min-h-[44px]"
        style={[
          isFocused && { borderColor: '#3B82F6', borderWidth: 2 },
          error && { borderColor: '#EF4444' },
          disabled && { opacity: 0.4 },
        ]}
      >
        {leftIcon && <View className="pl-2">{leftIcon}</View>}
        <TextInput
          editable={!disabled}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 text-[15px] text-typography px-4 py-2"
          style={[
            leftIcon && { paddingLeft: 4 },
            rightIcon && { paddingRight: 4 },
            multiline && { minHeight: 80, textAlignVertical: 'top' },
            inputStyle,
          ]}
        />
        {rightIcon && <View className="pr-2">{rightIcon}</View>}
      </View>
      {error && <Text className="text-market-down text-xs mt-0.5">{error}</Text>}
    </View>
  );
}

Input.displayName = 'Input';
export { Input };
export type { InputProps };
