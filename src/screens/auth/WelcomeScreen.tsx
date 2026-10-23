import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, Linking, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { useDispatch } from 'react-redux';
import { login } from '../../redux/authSlice';
import { initGoogleAuth, signInWithGoogle } from '../../services/googleAuthService';
import { applyDriveAccessGranted, clearFreshSetupProperty, ensureDriveAccess, hasFreshSetupProperty } from '../../services/backupService';
import { signInWithApple } from '../../services/appleAuthService';
import {
    confirmPhoneOtp,
    isValidIndianMobile,
    phoneAuthErrorMessage,
    sendPhoneOtp,
} from '../../services/phoneAuthService';
import { FontAwesome } from '@expo/vector-icons';
import { AnalyticsEvents, trackEvent, setAnalyticsUser, setEnrichedUserProperties } from '../../services/analyticsService';
import { setCrashlyticsUser } from '../../services/crashlyticsService';
import { storage } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';
import { notifyNewUserSignup } from '../../services/notificationService';

const TERMS_URL = 'https://rentvelo.indieroots.in/terms/';
const PRIVACY_URL = 'https://rentvelo.indieroots.in/privacy-policy/';

function GoogleLogo({ size = 22 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
            <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <Path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.4 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </Svg>
    );
}

export default function WelcomeScreen() {
    const dispatch = useDispatch();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme);
    const savingProperty = hasFreshSetupProperty();
    const [googleLoading, setGoogleLoading] = React.useState(false);
    const [appleLoading, setAppleLoading] = React.useState(false);
    const [phoneLoading, setPhoneLoading] = React.useState(false);
    const [step, setStep] = React.useState<'number' | 'code'>('number');
    const [phoneDigits, setPhoneDigits] = React.useState('');
    const [code, setCode] = React.useState('');
    const [resendIn, setResendIn] = React.useState(0);
    const phoneInputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
    const codeInputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
    const sendingRef = React.useRef(false);
    const slide = React.useRef(new Animated.Value(0)).current;
    const [formWidth, setFormWidth] = React.useState(Dimensions.get('window').width - 64);
    const busy = googleLoading || appleLoading || phoneLoading;

    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 'number') phoneInputRef.current?.focus();
            else codeInputRef.current?.focus();
        }, 320);
        return () => clearTimeout(timer);
    }, [step]);

    React.useEffect(() => {
        if (resendIn <= 0) return;
        const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    React.useEffect(() => {
        initGoogleAuth();
    }, []);

    const handleGoogleLogin = async () => {
        // if (__DEV__) {
        //     dispatch(login({
        //         name: 'Dev User',
        //         email: 'dev@rentvelo.app',
        //         photoUrl: undefined,
        //         isGoogleLinked: true,
        //         authMethod: 'google',
        //     }));
        //     return;
        // }

        try {
            setGoogleLoading(true);
            const user = await signInWithGoogle();
            if (user) {
                const driveOk = await ensureDriveAccess();
                if (driveOk) {
                    applyDriveAccessGranted();
                }
                dispatch(login({
                    name: user.name || 'User',
                    email: user.email,
                    photoUrl: user.photo || undefined,
                    isGoogleLinked: driveOk,
                    authMethod: 'google',
                }));

                trackEvent(AnalyticsEvents.SIGN_IN, { method: 'google' });
                const userData = { email: user.email, name: user.name || 'User' };
                await setAnalyticsUser(userData);
                await setCrashlyticsUser(userData);
                await setEnrichedUserProperties({ authMethod: 'google' });

                // Record signup date for days_since_signup analytics
                if (!storage.getString('@signup_date')) {
                    storage.set('@signup_date', new Date().toISOString());
                    notifyNewUserSignup(user.name || 'User', user.email, Platform.OS);
                }
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
            setGoogleLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        try {
            setAppleLoading(true);
            const user = await signInWithApple();
            if (user) {
                clearFreshSetupProperty();
                dispatch(login({
                    name: user.name || 'Apple User',
                    email: user.email || 'Private Apple ID',
                    isGoogleLinked: false,
                    authMethod: 'apple',
                }));

                trackEvent(AnalyticsEvents.SIGN_IN, { method: 'apple' });
                const userData = { email: user.email || 'apple-user@rentvelo.app', name: user.name || 'User' };
                await setAnalyticsUser(userData);
                await setCrashlyticsUser(userData);
                await setEnrichedUserProperties({ authMethod: 'apple' });

                // Record signup date for days_since_signup analytics
                if (!storage.getString('@signup_date')) {
                    storage.set('@signup_date', new Date().toISOString());
                    notifyNewUserSignup(user.name || 'Apple User', user.email || 'Private Apple ID', Platform.OS);
                }
            }
        } catch (error: any) {
            console.error('Failed to sign in with Apple:', error);
            showToast({
                type: 'error',
                title: 'Sign In Failed',
                message: 'Could not sign in with Apple. Please try again.'
            });
        } finally {
            setAppleLoading(false);
        }
    };

    const animateTo = (next: 'number' | 'code') => {
        setStep(next);
        Animated.timing(slide, {
            toValue: next === 'code' ? 1 : 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const finishPhoneLogin = async (phone: string) => {
        clearFreshSetupProperty();
        dispatch(login({
            name: 'Owner',
            email: '',
            phone,
            isGoogleLinked: false,
            authMethod: 'phone',
        }));

        trackEvent(AnalyticsEvents.SIGN_IN, { method: 'phone' });
        const userData = { phone, name: 'Owner' };
        await setAnalyticsUser(userData);
        await setCrashlyticsUser(userData);
        await setEnrichedUserProperties({ authMethod: 'phone' });

        if (!storage.getString('@signup_date')) {
            storage.set('@signup_date', new Date().toISOString());
            notifyNewUserSignup('Owner', phone, Platform.OS);
        }
    };

    const handleSendCode = async (forceResend = false, digits = phoneDigits) => {
        if (sendingRef.current) return;
        if (!isValidIndianMobile(digits)) {
            showToast({
                type: 'error',
                title: 'Check the number',
                message: 'Enter a 10-digit Indian mobile number.',
            });
            return;
        }

        sendingRef.current = true;
        try {
            setPhoneLoading(true);
            await sendPhoneOtp(digits, forceResend);
            setCode('');
            animateTo('code');
            setResendIn(30);
        } catch (error) {
            console.error('Failed to send phone code:', error);
            showToast({
                type: 'error',
                title: 'Could not send code',
                message: phoneAuthErrorMessage(error),
            });
        } finally {
            sendingRef.current = false;
            setPhoneLoading(false);
        }
    };

    const onPhoneChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        setPhoneDigits(digits);
        if (digits.length === 10) {
            handleSendCode(false, digits);
        }
    };

    const handleConfirmCode = async (nextCode: string) => {
        if (nextCode.length !== 6 || sendingRef.current) return;

        sendingRef.current = true;
        try {
            setPhoneLoading(true);
            const verified = await confirmPhoneOtp(nextCode);
            await finishPhoneLogin(verified.phone);
        } catch (error) {
            console.error('Failed to confirm phone code:', error);
            setCode('');
            codeInputRef.current?.focus();
            showToast({
                type: 'error',
                title: 'Code not accepted',
                message: phoneAuthErrorMessage(error),
            });
        } finally {
            sendingRef.current = false;
            setPhoneLoading(false);
        }
    };

    const onCodeChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 6);
        setCode(digits);
        if (digits.length === 6) {
            handleConfirmCode(digits);
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            {/* Background Decorative Elements */}
            <View style={[styles.decorCircle, styles.decor1, { backgroundColor: theme.colors.accent + '15' }]} />
            <View style={[styles.decorCircle, styles.decor2, { backgroundColor: theme.colors.success + '10' }]} />
            <View style={[styles.decorCircle, styles.decor3, { backgroundColor: theme.colors.warning + '10' }]} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <View style={styles.topSection}>
                    <View style={styles.iconContainer}>
                        <Image
                            source={isDark ? require('../../../assets/app-icon-dark.png') : require('../../../assets/app-icon.png')}
                            style={styles.logo}
                        />
                    </View>
                    <Text style={styles.subtitle}>RentVelo</Text>
                </View>

                <View
                    style={styles.pager}
                    onLayout={(event) => setFormWidth(event.nativeEvent.layout.width)}
                >
                    <Animated.View
                        style={[
                            styles.pagerTrack,
                            {
                                width: formWidth * 2,
                                transform: [{
                                    translateX: slide.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -formWidth],
                                    }),
                                }],
                            },
                        ]}
                    >
                        <View style={[styles.page, { width: formWidth }]}>
                            <Text style={styles.title}>Simplify Rentals</Text>
                            <Text style={styles.description}>
                                Manage your properties with clarity, ease, and efficiency. Designed for modern owners.
                            </Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>+91</Text>
                                </View>
                                <TextInput
                                    ref={phoneInputRef}
                                    style={styles.phoneInput}
                                    value={phoneDigits}
                                    autoFocus
                                    onChangeText={onPhoneChange}
                                    keyboardType="number-pad"
                                    placeholder="10-digit mobile number"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    maxLength={10}
                                    textContentType="telephoneNumber"
                                    autoComplete="tel"
                                    editable={!busy}
                                />
                            </View>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    (phoneLoading || pressed) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => handleSendCode(false)}
                                disabled={busy}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {phoneLoading ? 'Sending...' : 'Continue'}
                                </Text>
                            </Pressable>
                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>or continue with</Text>
                                <View style={styles.orLine} />
                            </View>
                            <View style={styles.socialRow}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.socialButton,
                                        (googleLoading || pressed) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                                    ]}
                                    onPress={handleGoogleLogin}
                                    disabled={busy}
                                    accessibilityLabel="Continue with Google"
                                >
                                    {googleLoading ? (
                                        <ActivityIndicator color="#EA4335" />
                                    ) : (
                                        <GoogleLogo />
                                    )}
                                </Pressable>
                                {Platform.OS === 'ios' && (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.socialButton,
                                            (appleLoading || pressed) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                                        ]}
                                        onPress={handleAppleLogin}
                                        disabled={busy}
                                        accessibilityLabel="Continue with Apple"
                                    >
                                        {appleLoading ? (
                                            <ActivityIndicator color={theme.colors.textPrimary} />
                                        ) : (
                                            <FontAwesome name="apple" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
                                        )}
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <View style={[styles.page, { width: formWidth }]}>
                            <Text style={styles.title}>Enter the code</Text>
                            <Text style={styles.sent}>
                                Sent to <Text style={styles.sentNumber}>+91 {phoneDigits.slice(0, 5)} {phoneDigits.slice(5)}</Text>
                                {' · '}
                                <Text
                                    style={styles.editLink}
                                    onPress={() => {
                                        if (phoneLoading) return;
                                        setCode('');
                                        animateTo('number');
                                    }}
                                >
                                    Edit
                                </Text>
                            </Text>
                            <View style={styles.codeWrap}>
                                <View style={styles.boxes} pointerEvents="none">
                                    {Array.from({ length: 6 }, (_, index) => (
                                        <View
                                            key={index}
                                            style={[styles.box, code.length === index && styles.boxActive]}
                                        >
                                            <Text style={styles.boxDigit}>{code[index] || ''}</Text>
                                        </View>
                                    ))}
                                </View>
                                <TextInput
                                    ref={codeInputRef}
                                    style={styles.hiddenCode}
                                    value={code}
                                    onChangeText={onCodeChange}
                                    keyboardType="number-pad"
                                    textContentType="oneTimeCode"
                                    autoComplete="sms-otp"
                                    maxLength={6}
                                    caretHidden
                                    editable={!phoneLoading}
                                />
                            </View>
                            <Pressable
                                onPress={() => handleSendCode(true)}
                                disabled={phoneLoading || resendIn > 0}
                            >
                                <Text style={[styles.resend, resendIn === 0 && !phoneLoading && styles.resendReady]}>
                                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
            <Text style={styles.legal}>
                By continuing, you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
                    Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                    Privacy Policy
                </Text>
                .
            </Text>
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing.xl,
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
    pager: {
        width: '100%',
        overflow: 'hidden',
    },
    pagerTrack: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    page: {
        alignItems: 'center',
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
        fontSize: theme.typography.xs,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.m,
        ...theme.shadows.small,
    },
    countryCode: {
        paddingLeft: theme.spacing.l,
        paddingRight: theme.spacing.m,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    phoneInput: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.textPrimary,
        paddingVertical: 18,
        paddingHorizontal: theme.spacing.m,
    },
    primaryButton: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 18,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: theme.typography.bold,
    },
    codeWrap: {
        width: '100%',
        height: 56,
        marginTop: theme.spacing.l,
    },
    boxes: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    box: {
        flex: 1,
        height: 56,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxActive: {
        borderColor: theme.colors.accent,
    },
    boxDigit: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    hiddenCode: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        opacity: 0.02,
        color: 'transparent',
    },
    sent: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.s,
    },
    sentNumber: {
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.semiBold,
    },
    editLink: {
        color: theme.colors.accent,
        fontWeight: theme.typography.semiBold,
    },
    resend: {
        marginTop: theme.spacing.l,
        fontSize: 14,
        color: theme.colors.textTertiary,
        fontWeight: theme.typography.semiBold,
    },
    resendReady: {
        color: theme.colors.accent,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: theme.spacing.l,
        marginTop: theme.spacing.m,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    orText: {
        marginHorizontal: theme.spacing.m,
        color: theme.colors.textTertiary,
        fontSize: 13,
        fontWeight: theme.typography.medium,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.small,
    },
    legal: {
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.m,
    },
    legalLink: {
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.semiBold,
    },
});
