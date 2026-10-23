import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Pressable, Animated as RNAnimated,
    KeyboardAvoidingView, Platform, ScrollView, Keyboard, BackHandler,
    type TextInputInstance
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withTiming,
    withDelay,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { completeSetup } from '../../redux/authSlice';
import { RootState } from '../../redux/store';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createProperty, createUnit, createTenant, deleteProperty } from '../../db';
import { PROPERTY_TYPES, CURRENCY, OTA_VERSION } from '../../utils/Constants';
import { ArrowLeft, Check } from 'lucide-react-native';
import { trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';
import { hapticsLight, hapticsSuccess } from '../../utils/haptics';
import { storage } from '../../utils/storage';
import { markFreshSetupProperty } from '../../services/backupService';

const TOTAL_STEPS = 5;
const RING_R = 34;
const RING_LEN = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DrawnCheck({ color, track }: { color: string; track: string }) {
    const ring = useSharedValue(RING_LEN);
    const check = useSharedValue(0);

    React.useEffect(() => {
        ring.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
        check.value = withDelay(340, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
        const timer = setTimeout(() => hapticsSuccess(), 380);
        return () => clearTimeout(timer);
    }, [ring, check]);

    const ringProps = useAnimatedProps(() => ({
        strokeDashoffset: ring.value,
    }));
    const checkStyle = useAnimatedStyle(() => ({
        opacity: check.value,
        transform: [{ scale: 0.7 + check.value * 0.3 }],
    }));

    return (
        <View style={drawnStyles.wrap}>
            <Svg width={88} height={88}>
                <Circle cx={44} cy={44} r={RING_R} fill={track} />
                <AnimatedCircle
                    cx={44}
                    cy={44}
                    r={RING_R}
                    stroke={color}
                    strokeWidth={3.5}
                    fill="transparent"
                    strokeDasharray={`${RING_LEN} ${RING_LEN}`}
                    strokeLinecap="round"
                    animatedProps={ringProps}
                    originX={44}
                    originY={44}
                    rotation={-90}
                />
            </Svg>
            <Animated.View style={[drawnStyles.check, checkStyle]}>
                <Check size={34} color={color} strokeWidth={3} />
            </Animated.View>
        </View>
    );
}

function FadeRow({ index, children }: { index: number; children: React.ReactNode }) {
    const shown = useSharedValue(0);

    React.useEffect(() => {
        shown.value = withDelay(
            460 + index * 90,
            withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
        );
    }, [index, shown]);

    const style = useAnimatedStyle(() => ({
        opacity: shown.value,
        transform: [{ translateY: (1 - shown.value) * 8 }],
    }));

    return <Animated.View style={style}>{children}</Animated.View>;
}

const drawnStyles = StyleSheet.create({
    wrap: {
        width: 88,
        height: 88,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    check: {
        position: 'absolute',
    },
});

export default function SetupWizardScreen() {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const styles = getStyles(theme, isDark);

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [includeTenant, setIncludeTenant] = useState(false);
    const progressAnim = useRef(new RNAnimated.Value(1 / TOTAL_STEPS)).current;
    const animating = useRef(false);
    const direction = useRef(1);
    const stepRef = useRef(0);
    const loadingRef = useRef(false);
    const leaving = useRef(false);
    stepRef.current = step;
    loadingRef.current = loading;
    const propertyNameRef = useRef<TextInputInstance>(null);
    const rentAmountRef = useRef<TextInputInstance>(null);
    const tenantNameRef = useRef<TextInputInstance>(null);
    const tenantPhoneRef = useRef<TextInputInstance>(null);
    const contentX = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    const [propertyName, setPropertyName] = useState('');
    const [propertyType, setPropertyType] = useState('house');

    // Step 2: Room/Rent
    const [rentAmount, setRentAmount] = useState('');

    // Step 3: Tenant
    const [tenantName, setTenantName] = useState('');
    const [tenantPhone, setTenantPhone] = useState('');

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateX: contentX.value }],
    }));

    const animateToStep = (nextStep: number) => {
        if (animating.current || loadingRef.current || nextStep === stepRef.current) return;
        if (nextStep < 0 || nextStep >= TOTAL_STEPS) return;
        direction.current = nextStep > stepRef.current ? 1 : -1;
        animating.current = true;
        hapticsLight();
        RNAnimated.timing(progressAnim, {
            toValue: (nextStep + 1) / TOTAL_STEPS,
            duration: 280,
            useNativeDriver: false,
        }).start();
        contentOpacity.value = withTiming(0, { duration: 140 });
        contentX.value = withTiming(-24 * direction.current, { duration: 140 }, (finished) => {
            if (finished) runOnJS(setStep)(nextStep);
            else runOnJS(setAnimating)(false);
        });
    };

    const goBack = () => {
        animateToStep(stepRef.current - 1);
    };

    const goBackRef = useRef(goBack);
    goBackRef.current = goBack;

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            const type = e.data.action.type;
            if (type !== 'GO_BACK' && type !== 'POP') return;
            if (stepRef.current === 0 || leaving.current) return;
            e.preventDefault();
            goBackRef.current();
        });
        const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (leaving.current || stepRef.current === 0) return false;
            goBackRef.current();
            return true;
        });
        return () => {
            unsubscribe();
            backSub.remove();
        };
    }, [navigation]);

    const setAnimating = (value: boolean) => {
        animating.current = value;
    };

    React.useEffect(() => {
        const focus = () => {
            if (step === 0) propertyNameRef.current?.focus();
            else if (step === 1) rentAmountRef.current?.focus();
            else if (step === 2) tenantNameRef.current?.focus();
            else if (step === 3) tenantPhoneRef.current?.focus();
            else Keyboard.dismiss();
        };
        if (step === 0 && direction.current === 1 && contentOpacity.value === 1) {
            const timer = setTimeout(focus, 300);
            return () => clearTimeout(timer);
        }
        contentX.value = 24 * direction.current;
        contentOpacity.value = 0;
        contentX.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
        contentOpacity.value = withTiming(1, { duration: 180 });
        const timer = setTimeout(() => {
            animating.current = false;
            focus();
        }, 180);
        return () => clearTimeout(timer);
    }, [step, contentOpacity, contentX]);

    const finishSetup = (event: string, params?: Record<string, string>) => {
        leaving.current = true;
        storage.set('@ota_version', OTA_VERSION.toString());
        dispatch(completeSetup());
        trackEvent(event, params);
    };

    const handleSkip = () => {
        finishSetup('SETUP_SKIPPED', { skipped_at_step: step.toString() });
    };

    const handleExistingAccount = () => {
        finishSetup('SETUP_EXISTING_ACCOUNT');
    };

    const handleSkipTenant = () => {
        setIncludeTenant(false);
        trackEvent('SETUP_STEP_COMPLETED', { step: '3_tenant_skipped' });
        animateToStep(4);
    };

    const handleStep1 = () => {
        if (!propertyName.trim()) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter property name' });
            return;
        }
        trackEvent('SETUP_STEP_COMPLETED', { step: '1_property', type: propertyType });
        animateToStep(1);
    };

    const handleStep2 = () => {
        if (!rentAmount || parseFloat(rentAmount) <= 0) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter a valid rent amount' });
            return;
        }
        trackEvent('SETUP_STEP_COMPLETED', { step: '2_rent' });
        animateToStep(2);
    };

    const handleTenantName = () => {
        if (!tenantName.trim()) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter tenant name' });
            return;
        }
        trackEvent('SETUP_STEP_COMPLETED', { step: '3_tenant_name' });
        animateToStep(3);
    };

    const handleTenantPhone = () => {
        const phone = tenantPhone.replace(/\D/g, '');
        if (phone.length < 10) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter a valid 10-digit phone number' });
            return;
        }
        setIncludeTenant(true);
        trackEvent('SETUP_STEP_COMPLETED', { step: '3_tenant' });
        animateToStep(4);
    };

    const onContinue = () => {
        if (animating.current || loading) return;
        if (step === 0) handleStep1();
        else if (step === 1) handleStep2();
        else if (step === 2) handleTenantName();
        else if (step === 3) handleTenantPhone();
    };

    const handleComplete = async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        let propertyId: number | null = null;
        try {
            const isMultiUnit = ['building', 'pg'].includes(propertyType);
            propertyId = await createProperty({
                name: propertyName.trim(),
                // shortcut: address is added later on the property screen
                address: '',
                type: propertyType as any,
                is_multi_unit: isMultiUnit,
                rent_payment_type: 'current_month',
            });
            const defaultUnitName = propertyType === 'flat' ? 'Flat 1'
                : propertyType === 'shop' ? 'Shop 1'
                    : isMultiUnit ? 'Room 1'
                        : 'Main Property';
            const unitId = await createUnit({
                property_id: propertyId,
                name: defaultUnitName,
                rent_amount: parseFloat(rentAmount),
                rent_cycle: 'first_of_month',
            });
            if (includeTenant) {
                await createTenant({
                    property_id: propertyId,
                    unit_id: unitId,
                    name: `Mr. ${tenantName.trim()}`,
                    phone: tenantPhone.replace(/\D/g, ''),
                    status: 'active',
                    move_in_date: new Date(),
                    rent_start_date: new Date(),
                    lease_type: 'monthly',
                    security_deposit: 0,
                });
            }
            markFreshSetupProperty();
            finishSetup('SETUP_COMPLETED');
        } catch (error: any) {
            if (propertyId) {
                try {
                    await deleteProperty(propertyId);
                } catch (cleanupError) {
                    console.error('Failed to roll back setup property', cleanupError);
                }
            }
            showToast({
                type: 'error',
                title: 'Error',
                message: error?.message || 'Failed to save property',
            });
            loadingRef.current = false;
            setLoading(false);
        }
    };

    const rentTitle = ['building', 'pg'].includes(propertyType) ? 'Room rent' : 'Monthly rent';

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const renderStepIndicator = () => (
        <View style={styles.progressContainer}>
            <View style={styles.barTrack}>
                <RNAnimated.View style={[styles.barFill, { width: progressWidth }]} />
            </View>
        </View>
    );

    const renderQuestion = (title: string, context: string | null, field: React.ReactNode) => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{title}</Text>
            {!!context && <Text style={styles.context}>{context}</Text>}
            {field}
        </View>
    );

    const renderStep1 = () => renderQuestion(
        'Name this property',
        null,
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.typeRow}
            >
                {PROPERTY_TYPES.map((type) => {
                    const active = propertyType === type.id;
                    return (
                        <Pressable
                            key={type.id}
                            style={[styles.typeChip, active && styles.typeChipActive]}
                            onPress={() => { hapticsLight(); setPropertyType(type.id); }}
                        >
                            <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                                {type.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <Input
                ref={propertyNameRef}
                placeholder="Sunshine Apartments"
                value={propertyName}
                onChangeText={setPropertyName}
                returnKeyType="go"
                onSubmitEditing={onContinue}
                autoCapitalize="words"
            />
        </>
    );

    const renderStep2 = () => renderQuestion(
        rentTitle,
        propertyName.trim(),
        <Input
            ref={rentAmountRef}
            placeholder="12000"
            value={rentAmount}
            onChangeText={setRentAmount}
            keyboardType="number-pad"
            icon={<Text style={styles.currencySymbol}>{CURRENCY}</Text>}
        />
    );

    const renderStep3 = () => renderQuestion(
        'Who is the tenant?',
        propertyName.trim(),
        <Input
            ref={tenantNameRef}
            placeholder="Rahul Sharma"
            value={tenantName}
            onChangeText={setTenantName}
            returnKeyType="go"
            onSubmitEditing={onContinue}
            autoCapitalize="words"
        />
    );

    const renderStepPhone = () => renderQuestion(
        "Tenant's phone",
        tenantName.trim(),
        <Input
            ref={tenantPhoneRef}
            placeholder="9876543210"
            value={tenantPhone}
            onChangeText={(value) => setTenantPhone(value.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
        />
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <View style={styles.completionContainer}>
                <DrawnCheck color={theme.colors.accent} track={theme.colors.accentLight} />
                <Text style={styles.completionTitle}>You're All Set!</Text>
                <Text style={styles.completionSubtitle}>
                    {isAuthenticated
                        ? 'Save this property on this phone.'
                        : 'Sign in to save this property and turn on backup.'}
                </Text>

                <View style={styles.summaryCard}>
                    <FadeRow index={0}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Property</Text>
                            <Text style={styles.summaryValue}>{propertyName}</Text>
                        </View>
                    </FadeRow>
                    <FadeRow index={1}>
                        <View style={styles.divider} />
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{rentTitle}</Text>
                            <Text style={styles.summaryValue}>{CURRENCY}{rentAmount}</Text>
                        </View>
                    </FadeRow>
                    {includeTenant && (
                        <FadeRow index={2}>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Tenant</Text>
                                <Text style={styles.summaryValue}>{tenantName}</Text>
                            </View>
                        </FadeRow>
                    )}
                </View>

                <Button
                    title={isAuthenticated ? 'Go to dashboard' : 'Sign in to save'}
                    onPress={handleComplete}
                    loading={loading}
                    style={styles.ctaButton}
                />
            </View>
        </View>
    );

    const steps = [renderStep1, renderStep2, renderStep3, renderStepPhone, renderStep4];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerSide}>
                    {step > 0 && (
                        <Pressable
                            onPress={goBack}
                            disabled={loading}
                            hitSlop={8}
                            accessibilityLabel="Back"
                        >
                            <ArrowLeft size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    )}
                </View>
                <Text style={styles.headerTitle}>Quick Setup</Text>
                <View style={styles.headerSideEnd}>
                    {step < 4 && (
                        <Pressable onPress={handleSkip} disabled={loading}>
                            <Text style={styles.skipText}>Skip</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {renderStepIndicator()}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <Animated.View style={[{ flex: 1 }, contentStyle]}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {steps[step]()}
                    </ScrollView>
                </Animated.View>
                {step < 4 && (
                    <View style={styles.footer}>
                        {(step === 2 || step === 3) && (
                            <Pressable onPress={handleSkipTenant} style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>Skip for now</Text>
                            </Pressable>
                        )}
                        {step === 0 && !isAuthenticated && (
                            <Pressable onPress={handleExistingAccount} style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>Already have an account? Sign in</Text>
                            </Pressable>
                        )}
                        <Button title="Continue" onPress={onContinue} loading={loading} />
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
    },
    headerSide: {
        width: 64,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerSideEnd: {
        width: 64,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    skipText: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    // Progress
    progressContainer: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.l,
        marginTop: theme.spacing.s,
    },
    barTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.border,
        overflow: 'hidden',
    },
    barFill: {
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.accent,
    },
    stepperWrapper: {
        height: 60,
        justifyContent: 'center',
    },
    stepperLineTrack: {
        position: 'absolute',
        top: 18, // Center of the 30px dot
        left: '12.5%',
        right: '12.5%',
        height: 2,
        backgroundColor: theme.colors.border,
        borderRadius: 1,
    },
    stepperLineFill: {
        position: 'absolute',
        top: 18,
        left: '12.5%',
        height: 2,
        backgroundColor: theme.colors.accent,
        borderRadius: 1,
    },
    stepDotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stepItem: {
        alignItems: 'center',
        width: '25%',
    },
    stepDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        zIndex: 1,
    },
    stepDotActive: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.surface,
    },
    stepDotCompleted: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    stepDotText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
    },
    stepDotTextActive: {
        color: theme.colors.accent,
    },
    stepLabel: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        fontWeight: theme.typography.medium,
    },
    stepLabelActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold,
    },
    // Content
    scrollContent: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: 40,
    },
    stepContent: {
        flex: 1,
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    stepIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 2,
        borderColor: theme.colors.accent + '20',
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    context: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.l,
    },
    footer: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
    },
    stepSubtitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    // Form Card
    formCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    fieldLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        fontWeight: theme.typography.medium,
    },
    typeRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.l,
    },
    typeChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    typeChipActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
    },
    typeChipTextActive: {
        color: '#FFFFFF',
    },
    // Rent
    rentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    rentInput: {
        fontSize: 28,
        fontWeight: theme.typography.bold,
        flex: 1
    },
    rentHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        marginTop: theme.spacing.s,
        textAlign: 'center',
    },
    // Info Note
    infoNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.s,
        backgroundColor: theme.colors.accentLight,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
    },
    infoNoteText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    // CTA
    ctaButton: {
        marginBottom: theme.spacing.m,
    },
    // Completion
    completionContainer: {
        alignItems: 'center',
        paddingTop: theme.spacing.xl,
    },
    completionTitle: {
        fontSize: 26,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    completionSubtitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.m,
    },
    // Summary Card
    summaryCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
    },
    summaryLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    summaryValue: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.bold,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
    },
    secondaryBtn: {
        paddingVertical: theme.spacing.m,
    },
    secondaryBtnText: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
        textAlign: 'center',
    },
    keyboardAccessory: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    keyboardAccessoryBtn: {
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
    },
    keyboardAccessoryText: {
        fontSize: 16,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
});
