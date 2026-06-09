import { Pressable, StyleSheet, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';

import { Box, Text } from '@/shared/ui';
import { palette, radius, spacing } from '@/shared/design/tokens';
import { useMarketStore } from '@/stores/market.store';

type WatchlistHeaderProps = {
    title: string;
    onSortFilter: () => void;
    onAddStock: () => void;
};

export function WatchlistHeader({ title, onSortFilter, onAddStock }: WatchlistHeaderProps) {
    const { marketStatus } = useMarketStore();
    const statusColor = marketStatus === 'OPEN' ? palette.positive : palette.textMuted;
    const statusDot = marketStatus === 'OPEN' ? palette.positive : palette.warning;

    return (
        <View style={styles.header}>
            <View style={styles.titleCol}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.subtitleRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
                    <Text style={[styles.subtitle, { color: statusColor }]}>
                        HOSE · {marketStatus === 'OPEN' ? 'Market Open' : 'Latest session'}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <Pressable
                    accessibilityHint="Sort or filter watchlist"
                    accessibilityLabel="Sort filter"
                    accessibilityRole="button"
                    onPress={onSortFilter}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
                    <Box style={styles.iconBox}>
                        <SlidersHorizontal color={palette.textSecondary} size={18} strokeWidth={2} />
                    </Box>
                </Pressable>
                <Pressable
                    accessibilityHint="Add stock to watchlist"
                    accessibilityLabel="Add stock"
                    accessibilityRole="button"
                    onPress={onAddStock}
                    style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
                    <Text style={styles.addButtonText}>+ Add</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    titleCol: {
        flexShrink: 1,
        gap: spacing.xs,
    },
    title: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 32,
    },
    subtitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
    },
    statusDot: {
        borderRadius: radius.pill,
        height: 6,
        width: 6,
    },
    subtitle: {
        color: palette.textMuted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    actions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },
    iconButton: {
        height: 40,
        width: 40,
    },
    iconButtonPressed: {
        opacity: 0.8,
    },
    iconBox: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 40,
        justifyContent: 'center',
        width: 40,
    },
    addButton: {
        backgroundColor: palette.primary,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
    },
    addButtonPressed: {
        opacity: 0.8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
