import { TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HStack, Spinner, Text } from '@/shared/ui/primitives';

type GoogleAuthButtonProps = {
  bodySize: number;
  buttonHeight: number;
  disabled?: boolean;
  isSubmitting?: boolean;
  onPress: () => void;
};

export function GoogleAuthButton({
  bodySize,
  buttonHeight,
  disabled = false,
  isSubmitting = false,
  onPress,
}: GoogleAuthButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      className="w-full items-center justify-center border bg-[#F8FAFC] rounded-cardxl px-6 py-3"
      style={{
        borderColor: 'rgba(173, 198, 255, 0.18)',
        minHeight: buttonHeight,
        opacity: disabled ? 0.6 : 1,
      }}>
      <HStack className="items-center justify-center">
        {isSubmitting ? (
          <>
            <Spinner color="#F8FAFC" size="small" />
            <Text className="text-[#08111A] font-extrabold" style={{ fontSize: bodySize, marginLeft: 8 }}>
              Connecting Google
            </Text>
          </>
        ) : (
          <>
            <View className="mr-2">
              <GoogleMark />
            </View>
            <Text className="text-[#08111A] font-extrabold" style={{ fontSize: bodySize }}>
              Sign in with Google
            </Text>
          </>
        )}
      </HStack>
    </TouchableOpacity>
  );
}

function GoogleMark() {
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18}>
      <Path
        d="M12 5.04c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 1.84 14.95 1 12 1 7.36 1 3.4 3.66 1.48 7.56l3.8 2.95C6.18 7.37 8.87 5.04 12 5.04z"
        fill="#EA4335"
      />
      <Path
        d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.45c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.87 3.38-8.48z"
        fill="#4285F4"
      />
      <Path
        d="M5.28 14.59c-.23-.68-.36-1.41-.36-2.17s.13-1.49.36-2.17l-3.8-2.95C.52 9.07 0 10.48 0 12s.52 2.93 1.48 4.67l3.8-3.08z"
        fill="#FBBC05"
      />
      <Path
        d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.13 0-5.82-2.33-6.77-5.47l-3.8 2.95C3.4 20.34 7.36 23 12 23z"
        fill="#34A853"
      />
    </Svg>
  );
}
