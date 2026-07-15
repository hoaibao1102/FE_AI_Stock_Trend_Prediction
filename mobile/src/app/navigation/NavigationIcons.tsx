import { Bell, List, LayoutDashboard, Search, TrendingUp, User } from 'lucide-react-native';

import type { IconProps } from './navigation.types';

export function DashboardIcon(props: IconProps) {
  return <LayoutDashboard {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Search {...props} />;
}

export function WatchlistIcon(props: IconProps) {
  return <List {...props} />;
}

export function AlertsIcon(props: IconProps) {
  return <Bell {...props} />;
}

export function ProfileIcon(props: IconProps) {
  return <User {...props} />;
}

export function BrandTrendIcon(props: IconProps) {
  return <TrendingUp {...props} />;
}

export { Bell as BellIcon };
