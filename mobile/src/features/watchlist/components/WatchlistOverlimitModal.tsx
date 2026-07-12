import { useCallback, useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCircle, ChevronLeft } from '@/shared/ui/primitives/icon';
import type { WatchlistOverlimitItem } from '@/features/watchlist/types';

type WatchlistOverlimitModalProps = {
    open: boolean;
    items: WatchlistOverlimitItem[];
    limit: number;
    onTrimSuccess: () => void;
    onTrimItems: (keepStockIds: string[]) => void;
    isTrimming: boolean;
    onBackToDashboard: () => void;
};

function getStockId(item: WatchlistOverlimitItem): string {
    return String(item.stock_id || '');
}

function getStockSymbol(item: WatchlistOverlimitItem): string {
    return String(item.stock_code || '--');
}

function getStockName(item: WatchlistOverlimitItem): string {
    return String(item.stock_name || '--');
}

export function WatchlistOverlimitModal({
    open,
    items,
    limit,
    onTrimSuccess,
    onTrimItems,
    isTrimming,
    onBackToDashboard,
}: WatchlistOverlimitModalProps) {
    const insets = useSafeAreaInsets();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const toggleStock = useCallback(
        (stockId: string) => {
            setErrorMessage(null);

            setSelectedIds((prev) => {
                if (prev.includes(stockId)) {
                    return prev.filter((id) => id !== stockId);
                }

                if (prev.length >= limit) {
                    setErrorMessage(`You can only keep ${limit} stocks.`);
                    return prev;
                }

                return [...prev, stockId];
            });
        },
        [limit],
    );

    const handleConfirmTrim = useCallback(async () => {
        if (selectedIds.length === 0) {
            setErrorMessage('Please select at least one stock to keep.');
            return;
        }

        if (selectedIds.length > limit) {
            setErrorMessage(`You can only keep ${limit} stocks.`);
            return;
        }

        setErrorMessage(null);
        onTrimItems(selectedIds);
        onTrimSuccess();
    }, [selectedIds, limit, onTrimItems, onTrimSuccess]);

    const handleClose = useCallback(() => {
        setSelectedIds([]);
        setErrorMessage(null);
    }, []);

    const selectionLabel = useMemo(
        () => `${selectedIds.length}/${limit} selected`,
        [selectedIds.length, limit],
    );

    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            onDismiss={handleClose}
        >
            <View className="flex-1 bg-black/78 justify-center items-center p-4">
                {/* Back button — top-left corner of the dim overlay */}
                <View className="absolute left-4 z-10" style={{ top: insets.top + 8 }}>
                    <Pressable
                        accessibilityHint="Go back to dashboard"
                        accessibilityLabel="Back"
                        accessibilityRole="button"
                        hitSlop={12}
                        onPress={onBackToDashboard}
                        className="w-11 h-11 rounded-full items-center justify-center bg-[rgba(15,23,42,0.85)] border border-[rgba(51,65,85,0.7)]"
                        style={({ pressed }) => pressed ? { opacity: 0.7, backgroundColor: 'rgba(30,41,59,0.95)' } : undefined}
                    >
                        <ChevronLeft size={22} color="#F1F5F9" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <View
                    className="w-full max-w-[600px] max-h-[88%] bg-surface overflow-hidden"
                    style={{ borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.9)', borderRadius: 20, paddingTop: insets.top + 16 }}
                >
                    {/* Header */}
                    <View className="px-6 pb-4 border-b border-[rgba(51,65,85,0.8)]">
                        <View className="gap-2">
                            <View className="flex-row items-center gap-2">
                                <AlertCircle size={20} color="#FCD34D" />
                                <Text className="text-typography text-[20px] font-bold">
                                    Watchlist limit reached
                                </Text>
                            </View>
                            <Text className="text-typography-muted text-sm leading-[22px]">
                                Your current plan only allows you to keep up to{' '}
                                <Text className="text-typography font-bold">
                                    {limit}
                                </Text>{' '}
                                stocks. Select the stocks you want to keep, or
                                upgrade your plan to continue using a larger
                                watchlist.
                            </Text>
                        </View>
                    </View>

                    {/* Select box */}
                    <View
                        className="mx-6 mt-4 overflow-hidden bg-background"
                        style={{ borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.85)', borderRadius: 14 }}
                    >
                        <View className="flex-row items-center justify-between px-4 border-b border-[rgba(51,65,85,0.85)]" style={{ paddingVertical: 12 }}>
                            <Text className="text-typography text-sm font-semibold">
                                Select stocks to keep
                            </Text>
                            <Text className="text-typography-muted text-xs font-medium">
                                {selectionLabel}
                            </Text>
                        </View>

                        <ScrollView
                            className="max-h-[300px]"
                            contentContainerClassName="p-3"
                        >
                            {items.length === 0 ? (
                                <View className="py-8 items-center">
                                    <Text className="text-typography-muted text-sm">
                                        No watchlist items found.
                                    </Text>
                                </View>
                            ) : (
                                items.map((item) => {
                                    const stockId = getStockId(item);
                                    const selected =
                                        selectedIds.includes(stockId);

                                    return (
                                        <Pressable
                                            key={stockId}
                                            accessibilityHint={`${selected ? 'Deselect' : 'Select'} ${getStockSymbol(item)}`}
                                            accessibilityLabel={`${getStockSymbol(item)} - ${getStockName(item)}`}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected,
                                            }}
                                            onPress={() =>
                                                toggleStock(stockId)
                                            }
                                            className="flex-row items-center bg-background mb-1.5"
                                            style={({ pressed }) => ({
                                                paddingVertical: 12,
                                                paddingHorizontal: 10,
                                                borderWidth: 1,
                                                borderColor: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(51, 65, 85, 0.9)',
                                                borderRadius: 12,
                                                backgroundColor: selected ? 'rgba(59, 130, 246, 0.12)' : '#0F172A',
                                                opacity: pressed ? 0.8 : 1,
                                            })}
                                        >
                                            <View
                                                className="w-[22px] h-[22px] rounded-full border items-center justify-center mr-2"
                                                style={{
                                                    borderColor: selected ? '#3B82F6' : '#64748B',
                                                    backgroundColor: selected ? '#3B82F6' : 'transparent',
                                                }}
                                            >
                                                {selected && (
                                                    <Text className="text-white text-[13px] font-bold">
                                                        ✓
                                                    </Text>
                                                )}
                                            </View>

                                            <View className="flex-1 ml-2 gap-0.5">
                                                <Text className="text-typography text-sm font-bold">
                                                    {getStockSymbol(item)}
                                                </Text>
                                                <Text
                                                    className="text-typography-muted text-xs"
                                                    numberOfLines={1}
                                                >
                                                    {getStockName(item)}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>

                    {/* Error message */}
                    {errorMessage && (
                        <View
                            className="mx-6 mt-3 px-3 py-2 border rounded-xl"
                            style={{ borderColor: 'rgba(248, 113, 113, 0.35)', backgroundColor: 'rgba(127, 29, 29, 0.25)' }}
                        >
                            <Text className="text-[#FECACA] text-[13px]">
                                {errorMessage}
                            </Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View className="flex-row justify-between gap-3 px-6 py-6">
                        <Pressable
                            accessibilityHint="Navigate to upgrade screen"
                            accessibilityLabel="Upgrade Plan"
                            accessibilityRole="button"
                            onPress={() => {
                                // Close modal — user can navigate via profile
                                handleClose();
                            }}
                            className="flex-1 items-center justify-center py-3 rounded-lg bg-transparent border border-border"
                            style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
                        >
                            <Text className="text-typography text-sm font-semibold">
                                Upgrade Plan
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityHint="Confirm selected stocks"
                            accessibilityLabel="Keep Selected Stocks"
                            accessibilityRole="button"
                            disabled={isTrimming || selectedIds.length === 0}
                            onPress={handleConfirmTrim}
                            className="flex-1 items-center justify-center py-3 rounded-lg bg-primary-500"
                            style={({ pressed }) => [
                                { opacity: (isTrimming || selectedIds.length === 0) ? 0.5 : pressed ? 0.8 : 1 },
                            ]}
                        >
                            <Text className="text-white text-sm font-semibold">
                                {isTrimming
                                    ? 'Saving...'
                                    : 'Keep Selected Stocks'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
