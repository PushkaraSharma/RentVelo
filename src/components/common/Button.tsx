import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { hapticsLight } from '../../utils/haptics';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon
}: ButtonProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.textTertiary;
        if (variant === 'primary') return theme.colors.accent;
        return 'transparent';
    };

    const getBorderColor = () => {
        if (disabled) return theme.colors.textTertiary;
        if (variant === 'outline') return theme.colors.border;
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'primary') return '#FFFFFF';
        if (variant === 'ghost') return theme.colors.textSecondary;
        return theme.colors.textPrimary;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                style,
            ]}
            onPress={() => { hapticsLight(); onPress(); }}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text style={[styles.text, { color: getTextColor(), marginLeft: icon ? 8 : 0 }, textStyle]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 48,
        borderRadius: theme.borderRadius.l,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
    },
    text: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
    },
});
