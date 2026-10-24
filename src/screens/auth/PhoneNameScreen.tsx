import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import { login } from '../../redux/authSlice';
import { RootState } from '../../redux/store';
import { markPhoneNameConfirmed } from '../../utils/phoneProfile';
import { setAnalyticsUser, setEnrichedUserProperties } from '../../services/analyticsService';
import { setCrashlyticsUser } from '../../services/crashlyticsService';

export default function PhoneNameScreen() {
    const dispatch = useDispatch();
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const { user } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const trimmed = name.trim();

    const handleSave = async () => {
        if (!trimmed || saving) return;
        setSaving(true);
        markPhoneNameConfirmed();
        dispatch(login({
            name: trimmed,
            email: user?.email || '',
            phone: user?.phone,
            photoUrl: user?.photoUrl,
            authMethod: 'phone',
        }));
        const userData = { name: trimmed, email: user?.email || '', phone: user?.phone };
        await setAnalyticsUser(userData);
        await setCrashlyticsUser(userData);
        await setEnrichedUserProperties({ authMethod: 'phone' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.body}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Text style={styles.title}>Your name</Text>
                <Text style={styles.description}>This is how you appear in RentVelo.</Text>
                <View style={styles.field}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Rahul Sharma"
                        placeholderTextColor={theme.colors.textTertiary}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                        editable={!saving}
                    />
                </View>
                <Pressable
                    style={[styles.button, (!trimmed || saving) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={!trimmed || saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Continue</Text>
                    )}
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    body: {
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xxl,
    },
    title: {
        fontSize: 36,
        lineHeight: 44,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    description: {
        fontSize: theme.typography.xs,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.l,
    },
    field: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.m,
        ...theme.shadows.small,
    },
    input: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        paddingVertical: 18,
        paddingHorizontal: theme.spacing.m,
    },
    button: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: theme.typography.bold,
    },
});
