import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';
import {
    changeDirectionIcon,
    formatPercent,
    formatPrice,
    formatSignedNumber,
    formatVolume,
} from '@/shared/utils/format';

// ─── Types ───────────────────────────────────────────────────────────

export type StockListItemVariant = 'default' | 'compact' | 'expanded';

export type StockListItemProps = {
    symbol: string;
    companyName: string;
    exchangeCode?: string | null;
    price?: number | null;
    priceChange?: number | null;
    priceChangePercent?: number | null;
    volume?: number | null;
    /** Optional subtitle shown below company name (replaces exchange badge context) */
    subtitle?: string | null;
    /** Extra metadata displayed on the far right below price */
    rightMeta?: string | null;
    isPinned?: boolean;
    hasAlert?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    /** Custom element rendered before the left text column */
    leftAccessory?: React.ReactNode;
    /** Custom element rendered after the right price column */
    rightAccessory?: React.ReactNode;
    variant?: StockListItemVariant;
};

// ─── Component ───────────────────────────────────────────────────────

export function StockListItem({
    symbol,
    companyName,
    exchangeCode,
    price,
    priceChange,
    priceChangePercent,
    volume,
    subtitle,
    rightMeta,
    isPinned,
    hasAlert,
    onPress,
    onLongPress,
    leftAccessory,
    rightAccessory,
    variant = 'default',
}: StockListItemProps) {
    const changeColorClass = useMemo(() => {
        if (priceChangePercent == null) return 'text-typography-disabled';
        if (priceChangePercent > 0) return 'text-market-up';
        if (priceChangePercent < 0) return 'text-market-down';
        return 'text-typography-disabled';
    }, [priceChangePercent]);

    const icon = changeDirectionIcon(priceChangePercent);

    return (
        <Pressable
            accessibilityHint={`View ${symbol} details`}
            accessibilityLabel={`${symbol} - ${companyName}`}
            accessibilityRole="button"
            onPress={onPress}
            onLongPress={onLongPress}
            className="min-h-[76px] px-4 py-2.5"
            style={({ pressed }) => pressed ? { backgroundColor: '#1E293B' } : undefined}>
            <View className="flex-row items-center justify-between">
                {/* Left accessory */}
                {leftAccessory && <View className="mr-2">{leftAccessory}</View>}

                {/* Left: text column */}
                <View className="flex-1 justify-center min-w-0 pr-2">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-base font-bold leading-[22px] text-typography" numberOfLines={1}>
                            {symbol}
                        </Text>
                        {exchangeCode ? (
                            <View className="bg-primary-500/20 rounded-full px-1.5 py-[1px]">
                                <Text className="text-primary-500 text-2xs font-bold tracking-[0.3px]">{exchangeCode}</Text>
                            </View>
                        ) : null}
                        {isPinned ? <Text className="text-[11px] leading-4">📌</Text> : null}
                        {hasAlert ? <Text className="text-[11px] leading-4">🔔</Text> : null}
                    </View>
                    <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-normal leading-4 text-typography-muted flex-shrink" numberOfLines={1}>
                            {subtitle ?? companyName}
                        </Text>
                    </View>
                </View>

                {/* Right: price column */}
                <View className="items-end justify-center min-w-[96px]">
                    {price != null ? (
                        <>
                            <Text className="text-base font-bold leading-[22px] text-typography">{formatPrice(price)}</Text>
                            <View className="flex-row items-center gap-2">
                                <Text className={`text-xs font-bold leading-4 ${changeColorClass}`}>
                                    {icon} {formatPercent(priceChangePercent)}
                                </Text>
                                {priceChange != null && (
                                    <Text className={`text-[11px] font-medium leading-[14px] ${changeColorClass}`}>
                                        {formatSignedNumber(priceChange)}
                                    </Text>
                                )}
                            </View>
                            {volume != null && (
                                <Text className="text-2xs font-medium leading-[14px] text-typography-muted">Vol: {formatVolume(volume)}</Text>
                            )}
                            {rightMeta && <Text className="text-2xs font-medium leading-[14px] text-typography-muted">{rightMeta}</Text>}
                        </>
                    ) : null}
                </View>

                {/* Right accessory */}
                {rightAccessory && <View className="ml-2">{rightAccessory}</View>}
            </View>
        </Pressable>
    );
}
