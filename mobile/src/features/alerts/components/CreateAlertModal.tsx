import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchWatchlists } from '@/features/watchlist/services/watchlist.service';
import { Text, Input, Button } from '@/shared/ui';
import { useToast } from '@/shared/ui/utils/ThemeProvider';
import {
  createAlert,
  updateAlert,
  validateThreshold,
} from '../services/alert.service';
import type { AlertItem, AlertType } from '../types';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'PRICE_ABOVE', label: 'Price Above' },
  { value: 'PRICE_BELOW', label: 'Price Below' },
  { value: 'VOLUME_SPIKE', label: 'Volume Spike' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  preSelectedSymbol?: string;
  onSuccess: () => void;
  editingAlert?: AlertItem | null;
  watchlistSymbols?: string[];
};

export function CreateAlertModal({
  visible,
  onClose,
  preSelectedSymbol,
  onSuccess,
  editingAlert,
  localWatchlistSymbols: propWatchlistSymbols,
}: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [symbol, setSymbol] = useState(preSelectedSymbol ?? '');
  const [alertType, setAlertType] = useState<AlertType>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localSymbols, setLocalSymbols] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const isEdit = !!editingAlert;

  const localWatchlistSymbols =
    propWatchlistSymbols ?? localSymbols;

  useEffect(() => {
    if (visible) {
      if (editingAlert) {
        setSymbol(editingAlert.symbol);
        setAlertType(editingAlert.alert_type);
        setThreshold(String(editingAlert.threshold));
      } else {
        setSymbol(preSelectedSymbol ?? '');
        setAlertType('PRICE_ABOVE');
        setThreshold('');
      }
      setFieldError(null);

      if (!preSelectedSymbol && !editingAlert && !propWatchlistSymbols) {
        fetchWatchlists()
          .then((data) => {
            const items = data.items ?? [];
            const symbols = items
              .map((i: any) => i.stock?.symbol)
              .filter(Boolean);
            setLocalSymbols(symbols);
          })
          .catch(() => {});
      }
    }
  }, [visible, editingAlert, preSelectedSymbol, propWatchlistSymbols]);

  const isValid =
    (preSelectedSymbol || symbol) && alertType && Number(threshold) > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setFieldError('Please fill in all fields');
      return;
    }

    const validationError = validateThreshold(alertType, threshold);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const targetSymbol = preSelectedSymbol ?? symbol;
    if (!isEdit && !localWatchlistSymbols.includes(targetSymbol)) {
      showToast('Not in watchlist', 'Add this stock to your watchlist first', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && editingAlert) {
        await updateAlert(editingAlert.id, {
          threshold: Number(threshold),
        });
        showToast('Alert updated', `Threshold changed to ${Number(threshold).toLocaleString('en-US')}`, 'success');
      } else {
        await createAlert({
          symbol: preSelectedSymbol ?? symbol,
          alert_type: alertType,
          threshold: Number(threshold),
        });
        showToast(
          'Alert created',
          `${alertType.replace(/_/g, ' ')} alert set at ${Number(threshold).toLocaleString('en-US')}`,
          'success',
        );
      }
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')) {
        showToast('Limit reached', `${msg}. Upgrade to PRO for more.`, 'warning');
      } else {
        showToast(isEdit ? 'Failed to update alert' : 'Failed to create alert', msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="bg-surface rounded-t-2xl"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-[17px] font-bold text-typography">
              {isEdit ? 'Edit Alert' : 'New Alert'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color="#94A3B8" size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerClassName="px-4 pt-4"
            contentContainerStyle={{ gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Stock */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-typography-muted">
                Stock
              </Text>
              {preSelectedSymbol || isEdit ? (
                <View className="h-11 rounded-md border border-border bg-surface-high px-3 justify-center">
                  <Text className="text-[15px] text-typography">
                    {symbol}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {localWatchlistSymbols.length === 0 ? (
                    <Text className="text-[13px] text-typography-muted italic">
                      Add stocks to your watchlist first
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row"
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {localWatchlistSymbols.map((s) => (
                        <TouchableOpacity
                          key={s}
                          accessibilityRole="button"
                          onPress={() => setSymbol(s)}
                        >
                          <View
                            className="rounded-full px-3 py-1.5 border"
                            style={{
                              backgroundColor:
                                symbol === s ? '#3B82F620' : 'transparent',
                              borderColor:
                                symbol === s ? '#3B82F6' : '#334155',
                            }}
                          >
                            <Text
                              className="text-[13px] font-semibold"
                              style={{
                                color:
                                  symbol === s ? '#3B82F6' : '#F8FAFC',
                              }}
                            >
                              {s}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {symbol && (
                    <Text className="text-[13px] text-primary-500">
                      Selected: {symbol}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Alert type */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-typography-muted">
                Alert Type
              </Text>
              <View className="flex-row gap-2">
                {ALERT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    accessibilityRole="button"
                    onPress={() => {
                      setAlertType(t.value);
                      setFieldError(null);
                    }}
                    className="flex-1"
                  >
                    <View
                      className="rounded-md border py-2.5 items-center"
                      style={{
                        backgroundColor:
                          alertType === t.value ? '#3B82F620' : '#1E293B',
                        borderColor:
                          alertType === t.value ? '#3B82F6' : '#334155',
                      }}
                    >
                      <Text
                        className="text-[13px] font-semibold"
                        style={{
                          color:
                            alertType === t.value ? '#3B82F6' : '#94A3B8',
                        }}
                      >
                        {t.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Threshold */}
            <View className="gap-1">
              <Text className="text-[13px] font-medium text-typography-muted">
                {alertType === 'VOLUME_SPIKE'
                  ? 'Volume multiplier (x)'
                  : 'Threshold (VND)'}
              </Text>
              <Input
                value={threshold}
                onChangeText={(t) => {
                  setThreshold(t);
                  setFieldError(null);
                }}
                placeholder={
                  alertType === 'VOLUME_SPIKE' ? 'e.g. 3.0' : 'e.g. 140000'
                }
                keyboardType="numeric"
                error={fieldError ?? undefined}
              />
              <Text className="text-[12px] text-typography-muted mt-0.5">
                {alertType === 'PRICE_ABOVE'
                  ? 'Notify when price goes above this value'
                  : alertType === 'PRICE_BELOW'
                    ? 'Notify when price goes below this value'
                    : 'Notify when volume exceeds this × average'}
              </Text>
            </View>

            {/* Submit */}
            <Button
              disabled={!isValid || submitting}
              loading={submitting}
              onPress={handleSubmit}
              action="primary"
              variant="solid"
              size="lg"
            >
              <Text className="text-white text-[15px] font-bold">
                {isEdit ? 'Save Changes' : 'Create Alert'}
              </Text>
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
