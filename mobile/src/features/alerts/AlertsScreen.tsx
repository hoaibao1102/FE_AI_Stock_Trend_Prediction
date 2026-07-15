import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';

import { fetchWatchlists } from '@/features/watchlist/services/watchlist.service';
import { Text, Spinner } from '@/shared/ui';
import { useToast } from '@/shared/ui/utils/ThemeProvider';
import { useAuthStore } from '@/stores/auth.store';
import { AlertRow } from './components/AlertRow';
import { CreateAlertModal } from './components/CreateAlertModal';
import {
  getAlerts,
  deleteAlert as apiDeleteAlert,
  toggleAlert as apiToggleAlert,
} from './services/alert.service';
import type { AlertItem, AlertStatus } from './types';

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const isAuthenticated = Boolean(useAuthStore((s) => s.session?.accessToken));

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [data, stocks] = await Promise.all([
        getAlerts(),
        fetchWatchlists().catch(() => null),
      ]);
      setAlerts(data);
      if (stocks) {
        const items = stocks.items ?? [];
        setWatchlistSymbols(
          items.map((i: any) => i.stock?.symbol).filter(Boolean),
        );
      }
      setWatchlistLoading(false);
    } catch (e) {
      setWatchlistLoading(false);
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleToggle = useCallback(
    async (id: string, status: AlertStatus) => {
      setToggling((prev) => new Set(prev).add(id));
      try {
        const updated = await apiToggleAlert(id, status);
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)),
        );
        showToast('Alert updated', '', 'success');
      } catch (err) {
        showToast(
          'Failed to toggle alert',
          err instanceof Error ? err.message : 'An error occurred',
          'error',
        );
      } finally {
        setToggling((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting((prev) => new Set(prev).add(id));
      try {
        await apiDeleteAlert(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        showToast('Alert deleted', '', 'success');
      } catch (err) {
        showToast(
          'Failed to delete alert',
          err instanceof Error ? err.message : 'An error occurred',
          'error',
        );
      } finally {
        setDeleting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [showToast],
  );

  const canCreate = watchlistSymbols.length > 0;
  const showDisabled = !watchlistLoading && !canCreate;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-4"
        contentContainerStyle={{
          gap: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            onRefresh={loadAlerts}
            refreshing={loading && alerts.length > 0}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text className="text-[28px] font-bold text-typography">
              Alerts
            </Text>
            <Text className="text-[13px] text-typography-muted">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowCreate(true)}
            disabled={showDisabled}
            className="h-11 px-4 rounded-full flex-row items-center gap-1.5"
            style={{
              backgroundColor: showDisabled ? '#1E293B' : '#3B82F6',
              opacity: showDisabled ? 0.4 : 1,
            }}
          >
            <Plus color={showDisabled ? '#64748B' : '#FFFFFF'} size={18} />
            <Text
              className="text-[13px] font-bold"
              style={{ color: showDisabled ? '#64748B' : '#FFFFFF' }}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && alerts.length === 0 ? (
          <View className="items-center justify-center py-20 gap-3">
            <Spinner />
            <Text className="text-[13px] text-typography-muted">
              Loading alerts...
            </Text>
          </View>
        ) : null}

        {/* Error */}
        {error && !loading ? (
          <View className="bg-surface border border-border rounded-cardxl p-4 gap-3 items-center">
            <Text className="text-[13px] text-market-down text-center">
              {error}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={loadAlerts}
              className="px-4 py-2 rounded-sm bg-primary-500"
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Empty */}
        {!loading && !error && alerts.length === 0 ? (
          <View className="items-center justify-center py-20 gap-4">
            <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
              <Text className="text-[28px]">🔔</Text>
            </View>
            <Text className="text-[17px] font-bold text-typography">
              No alerts yet
            </Text>
            <Text className="text-[13px] text-typography-muted text-center max-w-[260px]">
              Create your first alert to get notified about stock price
              movements.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowCreate(true)}
              disabled={showDisabled}
              className="px-5 py-2.5 rounded-full"
              style={{
                backgroundColor: showDisabled ? '#1E293B' : '#3B82F6',
                opacity: showDisabled ? 0.4 : 1,
              }}
            >
              <Text
                className="text-[13px] font-bold"
                style={{ color: showDisabled ? '#64748B' : '#FFFFFF' }}
              >
                + Create Alert
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* List */}
        {!loading && !error
          ? alerts.map((a) => (
              <AlertRow
                key={a.id}
                item={a}
                onToggle={handleToggle}
                onDelete={handleDelete}
                toggling={toggling.has(a.id)}
                deleting={deleting.has(a.id)}
              />
            ))
          : null}
      </ScrollView>

      <CreateAlertModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => void loadAlerts()}
        watchlistSymbols={watchlistSymbols}
      />
    </View>
  );
}
