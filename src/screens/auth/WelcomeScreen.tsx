import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useDispatch } from 'react-redux';
import { login, completeOnboarding } from '../../redux/authSlice';

export default function WelcomeScreen() {
    const dispatch = useDispatch();

    const handleGoogleLogin = () => {
        // Implementing Mock Auth Logic as per plan
        dispatch(login({
            name: 'User',
            email: 'user@example.com'
        }));
    };

    const handleSkip = () => {
        dispatch(login({
            name: 'Guest User',
            email: 'guest@example.com'
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Image source={require('../../assets/logo.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
                </View>
                <Text style={styles.subtitle}>RentVelo</Text>

                <View style={styles.spacer} />

                <Text style={styles.title}>Simplify Your Rentals</Text>
                <Text style={styles.description}>
                    Manage your properties with clarity, ease, and efficiency.
                </Text>

                <View style={styles.spacer} />

                <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
                    <View style={styles.gIcon}>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.surface }}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </Pressable>

                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Continue as Guest</Text>
                </Pressable>

                <Text style={styles.securityNote}>
                    Why Google? To securely store encrypted backups of your data in your own Google Drive.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        ...theme.shadows.small
    },
    subtitle: {
        fontSize: theme.typography.xs,
        color: theme.colors.textSecondary,
        letterSpacing: 2,
        fontWeight: theme.typography.bold,
        textTransform: 'uppercase'
    },
    spacer: {
        height: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
        textAlign: 'center',
    },
    description: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.round, // Pill shape
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
        justifyContent: 'center',
        marginBottom: theme.spacing.l,
        ...theme.shadows.small
    },
    gIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#DB4437', // Google Red
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.s
    },
    googleButtonText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    skipButton: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
        marginBottom: theme.spacing.l,
    },
    skipButtonText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
        textDecorationLine: 'underline',
    },
    securityNote: {
        fontSize: theme.typography.xs,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.l
    }
});
