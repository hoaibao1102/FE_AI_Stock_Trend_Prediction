import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ─── Root Stack ─────────────────────────────────────

export type RootStackParamList = {
  Startup: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EditProfile: undefined;
  UpgradePlan: undefined;
  StockDetail: { symbol?: string } | undefined;
  CreateAlert: { symbol?: string };
  EditAlert: { alertId: string };
  NotificationCenter: undefined;
  ChangePassword: undefined;
};

// ─── Main Tab ────────────────────────────────────────

export type MainTabParamList = {
  Alerts: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Search: undefined;
  Watchlist: undefined;
};

// ─── Screen Prop Types ───────────────────────────────

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type IconProps = {
  color?: string;
  size?: number;
};
