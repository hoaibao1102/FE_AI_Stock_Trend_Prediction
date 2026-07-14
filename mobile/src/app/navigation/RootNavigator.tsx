import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import MainTabNavigator from '@/app/navigation/MainTabNavigator';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { ChangePasswordScreen } from '@/features/profile/screens/ChangePasswordScreen';
import { EditProfileScreen } from '@/features/profile/screens/EditProfileScreen';
import { UpgradePlanScreen } from '@/features/profile/screens/UpgradePlanScreen';
import { StartupScreen } from '@/features/startup/screens/StartupScreen';
import { StockDetailScreen } from '@/features/stocks/screens/StockDetailScreen';
import { AiAnalysisScreen } from '@/features/stocks/screens/AiAnalysisScreen';
import type { RootStackParamList } from '@/app/navigation/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const profileChildScreenOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  contentStyle: {
    backgroundColor: '#0F172A',
  },
  gestureEnabled: true,
  headerStyle: {
    backgroundColor: '#0F172A',
  },
  navigationBarColor: '#0F172A',
  statusBarBackgroundColor: '#0F172A',
};

const detailScreenOptions: NativeStackNavigationOptions = {
  animationDuration: 100,
  contentStyle: {
    backgroundColor: '#0F172A',
  },
  gestureEnabled: true,
  headerShown: false,
  navigationBarColor: '#0F172A',
  presentation: 'modal',
  statusBarBackgroundColor: '#0F172A',
};

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Startup"
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#0F172A',
        },
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: '#0F172A',
        },
        headerShown: false,
        navigationBarColor: '#0F172A',
        statusBarBackgroundColor: '#0F172A',
      }}>
      <Stack.Screen name="Startup" component={StartupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ animation: 'none' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={profileChildScreenOptions}
      />
      <Stack.Screen
        name="UpgradePlan"
        component={UpgradePlanScreen}
        options={profileChildScreenOptions}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={detailScreenOptions}
      />
      <Stack.Screen
        name="AiAnalysis"
        component={AiAnalysisScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={profileChildScreenOptions}
      />
    </Stack.Navigator>
  );
}
