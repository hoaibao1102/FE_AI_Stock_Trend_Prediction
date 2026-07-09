import { useState } from 'react';
import {
  Alert,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Text } from '@/shared/ui';
import type { AlertItem, AlertStatus } from '../types';

type AlertRowProps = {
  item: AlertItem;
  onToggle: (id: string, status: AlertStatus) => void;
  onDelete: (id: string) => void;
  toggling?: boolean;
  deleting?: boolean;
};

const TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  PRICE_ABOVE: { icon: '↑', label: 'Above', color: '#22C55E' },
  PRICE_BELOW: { icon: '↓', label: 'Below', color: '#EF4444' },
  VOLUME_SPIKE: { icon: '●', label: 'Volume', color: '#F97316' },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  ACTIVE: { label: 'Active', bg: '#166534', text: '#4ADE80' },
  TRIGGERED: { label: 'Triggered', bg: '#78350F', text: '#FBBF24' },
  DISABLED: { label: 'Disabled', bg: '#1E293B', text: '#64748B' },
};

export function AlertRow({
  item,
  onToggle,
  onDelete,
  toggling,
  deleting,
}: AlertRowProps) {
  const typeCfg = TYPE_CONFIG[item.alert_type] ?? TYPE_CONFIG.PRICE_ABOVE;
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DISABLED;

  const handleDelete = () => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ],
    );
  };

  const thresholdLabel =
    item.alert_type === 'VOLUME_SPIKE'
      ? `${item.threshold}x`
      : item.threshold.toLocaleString('en-US');

  const currentPrice = item.latest_price?.close_price?.toLocaleString('en-US') ?? '--';
  const busy = toggling || deleting;

  return (
    <View className="bg-surface border border-border rounded-cardxl p-4 gap-3">
      {/* Top row: Symbol + company + status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-[15px] font-bold text-typography">
            {item.symbol}
          </Text>
          <Text
            className="text-[13px] text-typography-muted flex-1"
            numberOfLines={1}
          >
            {item.company_name}
          </Text>
        </View>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: statusCfg.bg }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.5px]"
            style={{ color: statusCfg.text }}
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Middle: Alert type + threshold */}
      <View className="flex-row items-center gap-3">
        <View
          className="rounded-full border px-2.5 py-1"
          style={{ borderColor: typeCfg.color }}
        >
          <Text
            className="text-[12px] font-semibold"
            style={{ color: typeCfg.color }}
          >
            {typeCfg.icon} {typeCfg.label}
          </Text>
        </View>
        <Text className="text-[15px] font-semibold text-typography">
          {thresholdLabel}
        </Text>
      </View>

      {/* Bottom: current price + triggered + actions */}
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text className="text-[12px] text-typography-muted">
            Latest: {currentPrice}
          </Text>
          {item.triggered_at && (
            <Text className="text-[12px] text-typography-muted">
              Triggered:{' '}
              {new Date(item.triggered_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {item.triggered_value
                ? ` (${item.triggered_value.toLocaleString('en-US')})`
                : ''}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          {busy ? (
            <View className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent" />
          ) : (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => onToggle(item.id, item.status)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View
                  className="w-10 h-6 rounded-full items-center justify-center"
                  style={{
                    backgroundColor:
                      item.status === 'ACTIVE' ? '#22C55E30' : '#33415550',
                  }}
                >
                  <Text
                    className="text-[14px]"
                    style={{
                      color:
                        item.status === 'ACTIVE' ? '#22C55E' : '#64748B',
                    }}
                  >
                    {item.status === 'ACTIVE' ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 color="#EF4444" size={18} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
