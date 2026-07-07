import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/shared/ui/primitives';

const FIELD_SURFACE = '#121A25';
const FIELD_BORDER = 'rgba(66, 71, 84, 0.92)';
const FIELD_BORDER_FOCUS = 'rgba(173, 198, 255, 0.58)';
const FORM_ERROR_BORDER = 'rgba(239, 68, 68, 0.24)';

type LoginFieldProps = {
  accessibilityLabel: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  autoCorrect?: boolean;
  fieldHeight: number;
  icon?: React.ReactNode;
  iconText?: string;
  inputRef?: React.RefObject<TextInput | null>;
  invalid?: boolean;
  keyboardType?: 'default' | 'email-address';
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: 'done' | 'next';
  rightAccessory?: React.ReactNode;
  secureTextEntry?: boolean;
  textContentType?: string;
  value: string;
};

export function LoginField({
  accessibilityLabel,
  autoCapitalize = 'none',
  autoComplete,
  autoCorrect = false,
  fieldHeight,
  icon,
  iconText,
  inputRef,
  invalid,
  keyboardType,
  onBlur,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType,
  rightAccessory,
  secureTextEntry,
  textContentType,
  value,
}: LoginFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { fieldBorderColor, leadingColor, leadingFontSize, inputFontSize, inputMinHeight } = useMemo(
    () => ({
      fieldBorderColor: invalid ? FORM_ERROR_BORDER : isFocused ? FIELD_BORDER_FOCUS : FIELD_BORDER,
      leadingColor: isFocused ? '#3B82F6' : '#94A3B8',
      leadingFontSize: fieldHeight * 0.34,
      inputFontSize: fieldHeight * 0.3,
      inputMinHeight: fieldHeight * 0.96,
    }),
    [fieldHeight, invalid, isFocused],
  );

  return (
    <View className="flex-row items-center border rounded-cardxl bg-[#121A25]" style={{ borderColor: fieldBorderColor, minHeight: fieldHeight, paddingHorizontal: '4.8%' }}>
      {icon ? (
        <View className="w-[9%] items-center">{icon}</View>
      ) : iconText ? (
        <Text className="font-bold w-[9%]" style={{ color: leadingColor, fontSize: leadingFontSize }}>{iconText}</Text>
      ) : null}
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        importantForAutofill="yes"
        keyboardType={keyboardType}
        onBlur={() => {
          setIsFocused(false);
          onBlur();
        }}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        selectionColor="#3B82F6"
        className="flex-1 text-typography"
        style={{ fontSize: inputFontSize, minHeight: inputMinHeight, paddingHorizontal: '2%' }}
        textContentType={textContentType}
        value={value}
      />
      {rightAccessory}
    </View>
  );
}
