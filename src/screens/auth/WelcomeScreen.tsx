import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { useDispatch } from 'react-redux';
import { login } from '../../redux/authSlice';
import { initGoogleAuth, signInWithGoogle } from '../../services/googleAuthService';
import { requestNotificationPermissions } from '../../services/pushNotificationService';
import { FontAwesome } from '@expo/vector-icons';
import { AnalyticsEvents, trackEvent, setAnalyticsUser } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

export default function WelcomeScreen() {
    const dispatch = useDispatch();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        initGoogleAuth();
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const user = await signInWithGoogle();
            if (user) {
                dispatch(login({
                    name: user.name || 'User',
                    email: user.email,
                    photoUrl: user.photo || undefined
                }));

                trackEvent(AnalyticsEvents.SIGN_IN, { method: 'google' });
                await setAnalyticsUser({
                    email: user.email,
                    name: user.name || 'User'
                });

                // Request permissions after login
                setTimeout(() => requestNotificationPermissions(), 1000);
            }
        } catch (error: any) {
            console.error('Failed to sign in with Google:', error);
            // Don't show alert for user-cancelled sign-in
            if (error?.code !== '12501' && error?.code !== 'SIGN_IN_CANCELLED') {
                showToast({
                    type: 'error',
                    title: 'Sign In Failed',
                    message: 'Could not sign in with Google. Please check your internet connection and try again.'
                });
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            {/* Background Decorative Elements */}
            <View style={[styles.decorCircle, styles.decor1, { backgroundColor: theme.colors.accent + '15' }]} />
            <View style={[styles.decorCircle, styles.decor2, { backgroundColor: theme.colors.success + '10' }]} />
            <View style={[styles.decorCircle, styles.decor3, { backgroundColor: theme.colors.warning + '10' }]} />

            <View style={styles.content}>
                <View style={styles.topSection}>
                    <View style={styles.iconContainer}>
                        <Image
                            source={isDark ? require('../../../assets/app-icon-dark.png') : require('../../../assets/app-icon.png')}
                            style={styles.logo}
                        />
                    </View>
                    <Text style={styles.subtitle}>RentVelo</Text>
                </View>

                <View style={styles.middleSection}>
                    <Text style={styles.title}>Simplify Your{"\n"}Rentals</Text>
                    <Text style={styles.description}>
                        Manage your properties with clarity, ease, and efficiency. Designed for modern owners.
                    </Text>
                </View>

                <View style={styles.bottomSection}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.googleButton,
                            (loading || pressed) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                    >
                        <View style={styles.gIcon}>
                            <FontAwesome name="google" size={18} color="#EA4335" />
                        </View>
                        <Text style={styles.googleButtonText}>
                            {loading ? 'Connecting...' : 'Continue with Google'}
                        </Text>
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.securityNote}>
                            Sign in to securely backup your data to Google Drive.
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
        zIndex: 1,
    },
    decorCircle: {
        position: 'absolute',
        borderRadius: 200,
    },
    decor1: {
        width: 300,
        height: 300,
        top: -100,
        right: -100,
    },
    decor2: {
        width: 250,
        height: 250,
        bottom: -50,
        left: -80,
    },
    decor3: {
        width: 150,
        height: 150,
        top: '40%',
        left: -40,
    },
    topSection: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.medium,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        borderRadius: 28,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        letterSpacing: 4,
        fontWeight: theme.typography.bold,
        textTransform: 'uppercase',
    },
    middleSection: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 36,
        lineHeight: 44,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: theme.spacing.m,
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: 18,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
        justifyContent: 'center',
        marginBottom: theme.spacing.m,
        ...theme.shadows.small,
    },
    gIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },

    footer: {
        marginTop: theme.spacing.l,
    },
    securityNote: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.xl,
        lineHeight: 16,
    },
});
