import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UpdateToastProps {
    visible: boolean;
}

export default function UpdateToast({ visible }: UpdateToastProps) {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(200)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 200,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible && slideAnim.hasOwnProperty('_value') && (slideAnim as any)._value === 200) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    bottom: insets.bottom + 16,
                    transform: [{ translateY: slideAnim }],
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    ...theme.shadows.medium,
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Updating...</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Downloading the latest improvements
                    </Text>
                </View>
                <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        zIndex: 9999,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
    },
});
