import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';

type ModeType = 'light' | 'dark' | 'system';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastMessage = {
    id: string;
    title: string;
    description?: string;
    type: ToastType;
};

type ToastContextType = {
    showToast: (title: string, description?: string, type?: ToastType) => void;
    hideToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
    hideToast: () => { },
});

export const useToast = () => useContext(ToastContext);

const TOAST_COLORS: Record<ToastType, { bg: string; text: string }> = {
    success: { bg: '#166534', text: '#F0FDF4' },
    error: { bg: '#991B1B', text: '#FEF2F2' },
    warning: { bg: '#92400E', text: '#FFFBEB' },
    info: { bg: '#1E3A5F', text: '#F0F9FF' },
};

function ToastItem({ message, onHide }: { message: ToastMessage; onHide: () => void }) {
    const opacity = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(3000),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide());
    }, []);

    const colors = TOAST_COLORS[message.type];

    return (
        <Animated.View
            className="rounded-lg p-3"
            style={[
                { opacity, backgroundColor: colors.bg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
            ]}
        >
            <Text style={[styles.toastTitle, { color: colors.text }]}>{message.title}</Text>
            {message.description && (
                <Text style={[styles.toastDesc, { color: colors.text }]}>{message.description}</Text>
            )}
        </Animated.View>
    );
}

export function ThemeProvider({
    mode = 'dark',
    children,
    style,
}: {
    mode?: ModeType;
    children?: React.ReactNode;
    style?: View['props']['style'];
}) {
    const { setColorScheme } = useColorScheme();
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastCounter = useRef(0);

    React.useEffect(() => {
        setColorScheme(mode);
    }, [mode, setColorScheme]);

    const showToast = useCallback((title: string, description?: string, type: ToastType = 'info') => {
        const id = `toast-${++toastCounter.current}`;
        setToasts(prev => [...prev, { id, title, description, type }]);
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            <View style={[{ flex: 1, height: '100%', width: '100%' }, style]}>
                {children}
            </View>
            {/* Toast portal */}
            <View className="absolute left-4 right-4 z-[9999] gap-2" style={{ top: 60 }} pointerEvents="box-none">
                {toasts.map(t => (
                    <ToastItem key={t.id} message={t} onHide={() => hideToast(t.id)} />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

const styles = {
    toastTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    toastDesc: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.9,
    },
};
