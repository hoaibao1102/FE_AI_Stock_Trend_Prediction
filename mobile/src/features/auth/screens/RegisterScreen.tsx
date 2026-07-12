import { useMemo } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Text, Pressable } from '@/shared/ui/primitives';
import { SwipeBackGesture } from '@/shared/ui/components/SwipeBackGesture';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { useRegisterForm } from '@/features/auth/hooks/useRegisterForm';
import type { RootScreenProps } from '@/app/navigation/navigation.types';

export function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
    const insets = useSafeAreaInsets();
    const { height, width } = useWindowDimensions();

    const {
        formik,
        showPassword,
        showConfirmPassword,
        setShowPassword,
        setShowConfirmPassword,
        fieldErrors,
        successMessage,
        errorMessage,
    } = useRegisterForm(() => {
        navigation.navigate('Login');
    });

    const metrics = useMemo(() => {
        const shortSide = Math.min(width, height);
        return {
            titleSize: Math.max(shortSide * 0.065, 24),
            subtitleSize: Math.max(shortSide * 0.035, 13),
            labelSize: Math.max(shortSide * 0.028, 11),
            bodySize: Math.max(shortSide * 0.037, 14),
            buttonHeight: Math.max(height * 0.066, 48),
            fieldHeight: Math.max(height * 0.068, 50),
            headerHeight: Math.max(height * 0.09, 64),
            safeHorizontal: Math.max(width * 0.055, 20),
        };
    }, [height, width]);

    return (
        <SwipeBackGesture onGoBack={navigation.goBack}>
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className="flex-1 bg-background">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1 bg-background">
                    {/* Compact Header */}
                    <View
                        className="flex-row items-center bg-surface-low"
                        style={{
                            borderBottomColor: '#334155',
                            borderBottomWidth: 1,
                            minHeight: metrics.headerHeight,
                            paddingBottom: Math.max(height * 0.014, 8),
                            paddingHorizontal: metrics.safeHorizontal,
                            paddingTop: Math.max(insets.top, 8),
                        }}>
                        <Pressable
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                            onPress={() => navigation.goBack()}
                            className="items-center justify-center"
                            style={{ minWidth: 40, minHeight: 40, marginRight: 4 }}>
                            <Text className="text-typography-muted font-semibold" style={{ fontSize: Math.max(metrics.titleSize * 0.7, 20) }}>←</Text>
                        </Pressable>
                        <Text
                            className="text-primary-500 font-extrabold text-center"
                            style={{
                                flex: 1,
                                fontSize: metrics.titleSize * 0.52,
                                letterSpacing: metrics.titleSize * 0.08,
                                marginRight: 40,
                            }}>
                            AI STOCK TREND
                        </Text>
                    </View>

                    {/* Form Area */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}>
                        <ScrollView
                            bounces={false}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                flexGrow: 1,
                                paddingBottom: Math.max(insets.bottom + 24, 40),
                                paddingTop: 24,
                                paddingHorizontal: metrics.safeHorizontal,
                            }}>
                            <Box>
                                <Text className="text-typography font-extrabold" style={{ fontSize: metrics.titleSize, lineHeight: metrics.titleSize * 1.2 }}>Create Account</Text>
                                <Text className="text-typography-muted" style={{ fontSize: metrics.subtitleSize, lineHeight: metrics.subtitleSize * 1.55, marginTop: 8 }}>
                                    Register to access professional trading dashboards and real-time alerts.
                                </Text>
                            </Box>

                            <Box style={{ height: 32 }} />

                            <RegisterForm
                                formik={formik}
                                fieldErrors={fieldErrors}
                                errorMessage={errorMessage}
                                successMessage={successMessage}
                                showPassword={showPassword}
                                showConfirmPassword={showConfirmPassword}
                                onTogglePassword={() => setShowPassword((v) => !v)}
                                onToggleConfirmPassword={() => setShowConfirmPassword((v) => !v)}
                                onNavigateToLogin={() => navigation.navigate('Login')}
                                metrics={metrics}
                            />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
        </SwipeBackGesture>
    );
}
