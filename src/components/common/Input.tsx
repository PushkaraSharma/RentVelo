import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../theme';

interface InputProps extends TextInputProps {
    label?: string;
    icon?: React.ReactNode;
    error?: string;
}

export default function Input({ label, icon, error, style, ...props }: InputProps) {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error && styles.errorBorder]}>
                {icon && <View style={styles.icon}>{icon}</View>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={theme.colors.textTertiary}
                    {...props}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.m,
    },
    label: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        fontWeight: theme.typography.medium,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m, // Increased padding
        paddingVertical: theme.spacing.s, // Added vertical padding
        minHeight: 48, // Touch target size
    },
    errorBorder: {
        borderColor: theme.colors.danger,
    },
    icon: {
        marginRight: theme.spacing.s,
    },
    input: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: theme.typography.m,
        height: '100%',
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: theme.typography.xs,
        marginTop: theme.spacing.xs,
    },
});
