import React, { createContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const hideToast = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setToast(null);
        });
    }, [slideAnim]);

    const showToast = useCallback((options: ToastOptions) => {
        // Clear internal timer if exists
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        setToast(options);

        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
        }).start();

        timerRef.current = setTimeout(() => {
            hideToast();
        }, options.duration || 3000);
    }, [slideAnim, hideToast]);

    const getIcon = (type: ToastType) => {
        const size = 24;
        switch (type) {
            case 'success': return <CheckCircle2 size={size} color={theme.colors.success} />;
            case 'error': return <XCircle size={size} color={theme.colors.danger} />;
            case 'warning': return <AlertTriangle size={size} color={theme.colors.warning} />;
            case 'info': return <Info size={size} color={theme.colors.accent} />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            top: insets.top + (Platform.OS === 'ios' ? 0 : 10),
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            ...theme.shadows.medium,
                        },
                    ]}
                >
                    <View style={styles.toastContent}>
                        <View style={styles.iconContainer}>
                            {getIcon(toast.type)}
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.toastTitle, { color: theme.colors.textPrimary }]}>{toast.title}</Text>
                            {toast.message && (
                                <Text style={[styles.toastMessage, { color: theme.colors.textSecondary }]}>{toast.message}</Text>
                            )}
                        </View>
                        <Pressable onPress={hideToast} style={styles.closeBtn}>
                            <X size={18} color={theme.colors.textTertiary} />
                        </Pressable>
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        zIndex: 10000,
        elevation: 10,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    toastTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    toastMessage: {
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
        marginLeft: 8,
    },
});
