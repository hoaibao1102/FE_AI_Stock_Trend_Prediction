import { type ReactNode } from 'react';
import { Dimensions } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 300 };

interface SwipeBackGestureProps {
  children: ReactNode;
  onGoBack: () => void;
}

export function SwipeBackGesture({
  children,
  onGoBack,
}: SwipeBackGestureProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(15)
    .activeOffsetX(10)
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD || e.velocityX > 400) {
        runOnJS(onGoBack)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
