import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Pressable, Animated as RNAnimated, Dimensions,
    KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { completeSetup } from '../../redux/authSlice';
import { RootState } from '../../redux/store';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createProperty, createUnit, createTenant } from '../../db';
import { PROPERTY_TYPES, CURRENCY, OTA_VERSION } from '../../utils/Constants';
import {
    Home, Building, Building2, Store, Layers, ArrowRight,
    MapPin, IndianRupee, User, Phone, ChevronRight, PartyPopper,
    Sparkles, Check, Star, Circle as CircleIcon
} from 'lucide-react-native';
import { trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';
import { hapticsLight, hapticsHeavy } from '../../utils/haptics';
import { storage } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

export default function SetupWizardScreen({ navigation }: any) {
    const dispatch = useDispatch();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const user = useSelector((state: RootState) => state.auth.user);
    const styles = getStyles(theme, isDark);

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const slideAnim = useRef(new RNAnimated.Value(0)).current;
    const progressAnim = useRef(new RNAnimated.Value(0)).current;

    // Step 1: Property
    const [propertyName, setPropertyName] = useState('');
    const [address, setAddress] = useState('');
    const [propertyType, setPropertyType] = useState('house');

    // Step 2: Room/Rent
    const [rentAmount, setRentAmount] = useState('');

    // Step 3: Tenant
    const [tenantName, setTenantName] = useState('');
    const [tenantPhone, setTenantPhone] = useState('');

    // Created IDs
    const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);
    const [createdUnitId, setCreatedUnitId] = useState<number | null>(null);

    const animateToStep = (nextStep: number) => {
        hapticsLight();
        RNAnimated.parallel([
            RNAnimated.spring(slideAnim, {
                toValue: nextStep,
                useNativeDriver: true,
                tension: 60,
                friction: 12,
            }),
            RNAnimated.timing(progressAnim, {
                toValue: nextStep / (TOTAL_STEPS - 1),
                duration: 400,
                useNativeDriver: false,
            }),
        ]).start();
        setStep(nextStep);
    };

    const handleSkip = () => {
        storage.set('@ota_version', OTA_VERSION.toString());
        dispatch(completeSetup());
        trackEvent('SETUP_SKIPPED', { skipped_at_step: step.toString() });
    };

    const handleStep1 = async () => {
        if (!propertyName.trim()) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter property name' });
            return;
        }
        if (!address.trim()) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter address' });
            return;
        }
        setLoading(true);
        try {
            const isMultiUnit = ['building', 'pg'].includes(propertyType);
            const id = await createProperty({
                name: propertyName,
                address,
                type: propertyType as any,
                is_multi_unit: isMultiUnit,
                rent_payment_type: 'current_month',
            });
            setCreatedPropertyId(id);

            // Determine default unit name
            let defaultUnitName = 'Main Property';
            if (propertyType === 'flat') defaultUnitName = 'Flat 1';
            else if (['building', 'pg'].includes(propertyType)) defaultUnitName = 'Room 1';
            else if (propertyType === 'shop') defaultUnitName = 'Shop 1';

            // For single-unit: create default unit immediately (rent set in step 2)
            if (!isMultiUnit) {
                const unitId = await createUnit({
                    property_id: id,
                    name: defaultUnitName,
                    rent_amount: 0,
                    rent_cycle: 'first_of_month',
                });
                setCreatedUnitId(unitId);
            } else {
                // For multi-unit: create 1 default room
                const unitId = await createUnit({
                    property_id: id,
                    name: defaultUnitName,
                    rent_amount: 0,
                    rent_cycle: 'first_of_month',
                });
                setCreatedUnitId(unitId);
            }

            trackEvent('SETUP_STEP_COMPLETED', { step: '1_property', type: propertyType });
            animateToStep(1);
        } catch (error: any) {
            showToast({ type: 'error', title: 'Error', message: error?.message || 'Failed to create property' });
        } finally {
            setLoading(false);
        }
    };

    const handleStep2 = async () => {
        if (!rentAmount || parseFloat(rentAmount) <= 0) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter a valid rent amount' });
            return;
        }
        if (!createdUnitId) return;
        setLoading(true);
        try {
            const { updateUnit } = await import('../../db');
            await updateUnit(createdUnitId, { rent_amount: parseFloat(rentAmount) });
            trackEvent('SETUP_STEP_COMPLETED', { step: '2_rent' });
            animateToStep(2);
        } catch (error: any) {
            showToast({ type: 'error', title: 'Error', message: error?.message || 'Failed to set rent' });
        } finally {
            setLoading(false);
        }
    };

    const handleStep3 = async () => {
        if (!tenantName.trim()) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter tenant name' });
            return;
        }
        if (!tenantPhone.trim() || tenantPhone.length < 10) {
            showToast({ type: 'error', title: 'Required', message: 'Please enter a valid 10-digit phone number' });
            return;
        }
        if (!createdPropertyId || !createdUnitId) return;
        setLoading(true);
        try {
            await createTenant({
                property_id: createdPropertyId,
                unit_id: createdUnitId,
                name: `Mr. ${tenantName}`,
                phone: tenantPhone,
                status: 'active',
                move_in_date: new Date(),
                rent_start_date: new Date(),
                lease_type: 'monthly',
                security_deposit: 0,
            });
            trackEvent('SETUP_STEP_COMPLETED', { step: '3_tenant' });
            hapticsHeavy();
            animateToStep(3);
        } catch (error: any) {
            showToast({ type: 'error', title: 'Error', message: error?.message || 'Failed to add tenant' });
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        storage.set('@ota_version', OTA_VERSION.toString());
        dispatch(completeSetup());
        trackEvent('SETUP_COMPLETED');
    };

    const handleGoToCollectRent = () => {
        storage.set('@ota_version', OTA_VERSION.toString());
        dispatch(completeSetup());
        trackEvent('SETUP_COMPLETED', { action: 'go_to_collect_rent' });
        // Small delay so Redux state propagates before navigation
        setTimeout(() => {
            navigation.reset({
                index: 1,
                routes: [
                    { name: 'Main' },
                    { name: 'TakeRent', params: { propertyId: createdPropertyId } },
                ],
            });
        }, 100);
    };

    const getTypeIcon = (type: string, isActive: boolean) => {
        const color = isActive ? '#FFFFFF' : theme.colors.textSecondary;
        const size = 20;
        switch (type) {
            case 'house': return <Home size={size} color={color} />;
            case 'building': return <Building size={size} color={color} />;
            case 'pg': return <Building2 size={size} color={color} />;
            case 'shop': return <Store size={size} color={color} />;
            case 'flat': return <Layers size={size} color={color} />;
            default: return <Home size={size} color={color} />;
        }
    };

    // Progress Bar
    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '75%'],
    });

    const renderStepIndicator = () => (
        <View style={styles.progressContainer}>
            <View style={styles.stepperWrapper}>
                {/* Background Track */}
                <View style={styles.stepperLineTrack} />

                {/* Progress Line */}
                <RNAnimated.View
                    style={[
                        styles.stepperLineFill,
                        { width: progressWidth }
                    ]}
                />

                <View style={styles.stepDotsRow}>
                    {['Property', 'Rent', 'Tenant', 'Done'].map((label, i) => {
                        const isActive = i === step;
                        const isCompleted = i < step;

                        return (
                            <View key={i} style={styles.stepItem}>
                                <View style={[
                                    styles.stepDot,
                                    isActive && styles.stepDotActive,
                                    isCompleted && styles.stepDotCompleted
                                ]}>
                                    {isCompleted ? (
                                        <Check size={14} color="#FFF" strokeWidth={3} />
                                    ) : (
                                        <Text style={[
                                            styles.stepDotText,
                                            isActive && styles.stepDotTextActive
                                        ]}>
                                            {i + 1}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[
                                    styles.stepLabel,
                                    (isActive || isCompleted) && styles.stepLabelActive
                                ]}>
                                    {label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );

    const [showConfetti, setShowConfetti] = useState(false);

    React.useEffect(() => {
        if (step === 3) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const renderStepIcon = (Icon: any) => (
        <View style={styles.stepIconContainer}>
            <Icon size={32} color={theme.colors.accent} strokeWidth={2.5} />
        </View>
    );

    const ConfettiPiece = ({ index }: { index: number }) => {
        const progress = useSharedValue(0);

        const angle = (Math.PI * 2 * index) / 50 + (Math.random() - 0.5) * 0.4;
        const distance = 140 + Math.random() * 220;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance - 80;

        const size = 10 + Math.random() * 12;
        const icons = [Sparkles, Star, CircleIcon];
        const Icon = icons[index % icons.length];
        const colors = [theme.colors.accent, '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#A29BFE'];
        const color = colors[index % colors.length];

        React.useEffect(() => {
            progress.value = withDelay(
                Math.random() * 200,
                withTiming(1, {
                    duration: 2000 + Math.random() * 400,
                    easing: Easing.out(Easing.exp),
                })
            );
        }, []);

        const animatedStyle = useAnimatedStyle(() => {
            return {
                opacity: interpolate(progress.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0]),
                transform: [
                    { translateX: interpolate(progress.value, [0, 1], [0, targetX]) },
                    { translateY: interpolate(progress.value, [0, 1], [0, targetY]) },
                    { scale: interpolate(progress.value, [0, 0.2, 1], [0, 1.5, 0.5]) },
                    { rotate: interpolate(progress.value, [0, 1], [0, 360]) + 'deg' },
                ],
            };
        });

        return (
            <Animated.View style={[styles.confettiPiece, animatedStyle]}>
                <Icon
                    size={size}
                    color={color}
                    fill={index % 3 === 0 ? color : 'transparent'}
                    strokeWidth={2}
                />
            </Animated.View>
        );
    };

    const ConfettiBurst = () => {
        return (
            <View style={styles.confettiContainer}>
                {Array.from({ length: 50 }).map((_, i) => (
                    <ConfettiPiece key={i} index={i} />
                ))}
            </View>
        );
    };

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                {renderStepIcon(Building)}
                <Text style={styles.stepTitle}>Add Your First Property</Text>
                <Text style={styles.stepSubtitle}>
                    Tell us about the property you want to manage
                </Text>
            </View>

            <View style={styles.formCard}>
                <Input
                    label="PROPERTY NAME"
                    placeholder="e.g. Sunshine Apartments"
                    value={propertyName}
                    onChangeText={setPropertyName}
                    icon={<Building size={20} color={theme.colors.textTertiary} />}
                />
                <Input
                    label="ADDRESS"
                    placeholder="e.g. MG Road, Delhi"
                    value={address}
                    onChangeText={setAddress}
                    icon={<MapPin size={20} color={theme.colors.textTertiary} />}
                />

                <Text style={styles.fieldLabel}>PROPERTY TYPE</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.typeRow}
                >
                    {PROPERTY_TYPES.map((type) => (
                        <Pressable
                            key={type.id}
                            style={[styles.typeChip, propertyType === type.id && styles.typeChipActive]}
                            onPress={() => { hapticsLight(); setPropertyType(type.id); }}
                        >
                            {getTypeIcon(type.id, propertyType === type.id)}
                            <Text style={[
                                styles.typeChipText,
                                propertyType === type.id && styles.typeChipTextActive
                            ]}>
                                {type.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <Button
                title="Continue"
                onPress={handleStep1}
                loading={loading}
                icon={<ArrowRight size={20} color="#FFF" />}
                style={styles.ctaButton}
            />
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                {renderStepIcon(IndianRupee)}
                <Text style={styles.stepTitle}>
                    {['building', 'pg'].includes(propertyType) ? 'Set Room Rent' : 'Set Monthly Rent'}
                </Text>
                <Text style={styles.stepSubtitle}>
                    {['building', 'pg'].includes(propertyType)
                        ? 'How much rent do you typically collect per room?'
                        : 'How much rent do you collect for this property?'}
                </Text>
            </View>

            <View style={styles.formCard}>
                <View style={styles.rentInputContainer}>
                    <Text style={styles.currencySymbol}>{CURRENCY}</Text>
                    <Input
                        placeholder="e.g. 12000"
                        value={rentAmount}
                        onChangeText={setRentAmount}
                        placeholderTextColor={'lightgray'}
                        keyboardType="numeric"
                        style={styles.rentInput}
                        containerStyle={{ flex: 1, marginBottom: 0 }}
                    />
                </View>
                <Text style={styles.rentHint}>
                    This will be the base rent for your property
                </Text>

                <View style={[styles.infoNote, { marginTop: theme.spacing.m }]}>
                    <Sparkles size={16} color={theme.colors.accent} />
                    <Text style={styles.infoNoteText}>
                        {"Rent bills will be automatically generated on the 1st of every month.\nYou can customize this and rent of each room/unit later."}
                    </Text>
                </View>
            </View>

            <Button
                title="Continue"
                onPress={handleStep2}
                loading={loading}
                icon={<ArrowRight size={20} color="#FFF" />}
                style={styles.ctaButton}
            />
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                {renderStepIcon(User)}
                <Text style={styles.stepTitle}>Add Your First Tenant</Text>
                <Text style={styles.stepSubtitle}>
                    Add tenant details so we can generate rent bills
                </Text>
            </View>

            <View style={styles.formCard}>
                <Input
                    label="TENANT NAME"
                    placeholder="e.g. Rahul Sharma"
                    value={tenantName}
                    onChangeText={setTenantName}
                    icon={<User size={20} color={theme.colors.textTertiary} />}
                />
                <Input
                    label="PHONE NUMBER"
                    placeholder="e.g. 9876543210"
                    value={tenantPhone}
                    onChangeText={setTenantPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    icon={<Phone size={20} color={theme.colors.textTertiary} />}
                />
                <View style={styles.infoNote}>
                    <Sparkles size={16} color={theme.colors.accent} />
                    <Text style={styles.infoNoteText}>
                        Move-in & rent start date will be set to today. You can edit these later from the tenant details page.
                    </Text>
                </View>
            </View>

            <Button
                title="Continue"
                onPress={handleStep3}
                loading={loading}
                icon={<ArrowRight size={20} color="#FFF" />}
                style={styles.ctaButton}
            />
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <View style={styles.completionContainer}>
                <View style={styles.completionIconBg}>
                    <PartyPopper size={48} color={theme.colors.accent} strokeWidth={1.5} />
                </View>
                <Text style={styles.completionTitle}>You're All Set!</Text>
                <Text style={styles.completionSubtitle}>
                    Your property, room, and tenant are ready. You can now start collecting rent!
                </Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Property</Text>
                        <Text style={styles.summaryValue}>{propertyName}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                            {['building', 'pg'].includes(propertyType) ? 'Room Rent' : 'Monthly Rent'}
                        </Text>
                        <Text style={styles.summaryValue}>{CURRENCY}{rentAmount}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tenant</Text>
                        <Text style={styles.summaryValue}>{tenantName}</Text>
                    </View>
                </View>

                <Button
                    title="Collect Rent Now"
                    onPress={handleGoToCollectRent}
                    icon={<ChevronRight size={20} color="#FFF" />}
                    style={styles.ctaButton}
                />
                <Pressable onPress={handleComplete} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Go to Dashboard</Text>
                </Pressable>
            </View>
        </View>
    );

    const steps = [renderStep1, renderStep2, renderStep3, renderStep4];

    return (
        <SafeAreaView style={styles.container}>
            {showConfetti && <ConfettiBurst />}
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Quick Setup</Text>
                {step < 3 && (
                    <Pressable onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </Pressable>
                )}
            </View>

            {renderStepIndicator()}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {steps[step]()}
                </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
    },
    headerTitle: {
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
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.m,
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
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
        textAlign: 'center',
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
        paddingBottom: 4,
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.l,
        backgroundColor: theme.colors.background,
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
        fontSize: 28,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginRight: theme.spacing.s,
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
    completionIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
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
    },
    confettiContainer: {
        position: 'absolute',
        top: 300, // Near the center of the completion screen
        left: SCREEN_WIDTH / 2,
        width: 1,
        height: 1,
        zIndex: 9999, // Ensure it's above everything including progress bar
    },
    confettiPiece: {
        position: 'absolute',
    },
});
