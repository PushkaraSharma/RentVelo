import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Header from '../../../components/common/Header';
import Input from '../../../components/common/Input';
import Toggle from '../../../components/common/Toggle';
import Button from '../../../components/common/Button';
import { getPropertyById, updateProperty } from '../../../db';
import { useToast } from '../../../hooks/useToast';
import { RENT_PAYMENT_TYPES } from '../../../utils/Constants';
import { AlertTriangle, TrendingUp, Clock, ArrowLeft } from 'lucide-react-native';

const AUTO_INCREMENT_FREQUENCIES = [
    { id: 'yearly', label: 'Yearly', description: 'Once every 12 months' },
    { id: 'half_yearly', label: 'Half-Yearly', description: 'Once every 6 months' },
];

export default function PropertySettingsScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;

    // Rent Payment Type
    const [rentPaymentType, setRentPaymentType] = useState('previous_month');

    // Penalty fields
    const [penaltyGracePeriodDays, setPenaltyGracePeriodDays] = useState('');
    const [penaltyAmountPerDay, setPenaltyAmountPerDay] = useState('');
    const [waivePenaltyOnPartialPayment, setWaivePenaltyOnPartialPayment] = useState(false);

    // Auto Increment
    const [autoIncrementEnabled, setAutoIncrementEnabled] = useState(false);
    const [autoIncrementPercent, setAutoIncrementPercent] = useState('');
    const [autoIncrementFrequency, setAutoIncrementFrequency] = useState('yearly');

    const [loading, setLoading] = useState(false);
    const [propertyName, setPropertyName] = useState('');

    useEffect(() => {
        loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            const data = await getPropertyById(propertyId);
            if (data) {
                setPropertyName(data.name);
                setRentPaymentType(data.rent_payment_type || 'previous_month');
                setPenaltyGracePeriodDays(data.penalty_grace_period_days?.toString() || '');
                setPenaltyAmountPerDay(data.penalty_amount_per_day?.toString() || '');
                setWaivePenaltyOnPartialPayment(data.waive_penalty_on_partial_payment ?? false);
                setAutoIncrementEnabled(data.auto_increment_rent_enabled ?? false);
                const pct = data.auto_increment_percent;
                setAutoIncrementPercent(pct != null && !isNaN(Number(pct)) ? String(pct) : '');
                setAutoIncrementFrequency(data.auto_increment_frequency || 'yearly');
            }
        } catch (error) {
            console.error('Error loading property settings:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProperty(propertyId, {
                rent_payment_type: rentPaymentType as any,
                penalty_grace_period_days: penaltyGracePeriodDays ? parseInt(penaltyGracePeriodDays) : null,
                penalty_amount_per_day: penaltyAmountPerDay ? parseFloat(penaltyAmountPerDay) : null,
                waive_penalty_on_partial_payment: waivePenaltyOnPartialPayment,
                auto_increment_rent_enabled: autoIncrementEnabled,
                auto_increment_percent: autoIncrementEnabled && autoIncrementPercent ? parseFloat(autoIncrementPercent) : null,
                auto_increment_frequency: autoIncrementEnabled ? autoIncrementFrequency as any : null,
            });
            showToast({ type: 'success', title: 'Saved', message: 'Property settings updated successfully' });
            navigation.goBack();
        } catch (error) {
            console.error('Error saving property settings:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Property Settings" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Property name label */}
                    <Text style={styles.propertyLabel}>{propertyName}</Text>

                    {/* ── Rent Penalties ── */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBg, { backgroundColor: isDark ? '#EF444420' : '#FEF2F2' }]}>
                                <AlertTriangle size={20} color={theme.colors.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Rent Penalties</Text>
                                <Text style={styles.sectionSubtitle}>Charge late fees after grace period</Text>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                <Input
                                    label="PENALTY AFTER DAYS"
                                    placeholder="e.g. 5 days"
                                    value={penaltyGracePeriodDays}
                                    onChangeText={setPenaltyGracePeriodDays}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="PENALTY AMOUNT"
                                    placeholder="e.g. ₹50 per day"
                                    value={penaltyAmountPerDay}
                                    onChangeText={setPenaltyAmountPerDay}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>No penalty if partial payment done</Text>
                            <Toggle value={waivePenaltyOnPartialPayment} onValueChange={setWaivePenaltyOnPartialPayment} />
                        </View>
                    </View>

                    {/* ── Auto Increment Rent ── */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBg, { backgroundColor: isDark ? '#10B98120' : '#ECFDF5' }]}>
                                <TrendingUp size={20} color={theme.colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Auto Increment Rent</Text>
                                <Text style={styles.sectionSubtitle}>Automatically increase rent periodically</Text>
                            </View>
                            <Toggle value={autoIncrementEnabled} onValueChange={setAutoIncrementEnabled} />
                        </View>

                        {autoIncrementEnabled && (
                            <>
                                <Input
                                    label="INCREMENT PERCENTAGE"
                                    placeholder="e.g. 5"
                                    value={autoIncrementPercent}
                                    onChangeText={setAutoIncrementPercent}
                                    keyboardType="numeric"
                                />

                                <Text style={styles.fieldLabel}>FREQUENCY</Text>
                                <View style={styles.optionsContainer}>
                                    {AUTO_INCREMENT_FREQUENCIES.map((freq) => (
                                        <Pressable
                                            key={freq.id}
                                            style={[
                                                styles.optionBtn,
                                                autoIncrementFrequency === freq.id && styles.optionBtnActive
                                            ]}
                                            onPress={() => setAutoIncrementFrequency(freq.id)}
                                        >
                                            <View style={[styles.radio, autoIncrementFrequency === freq.id && styles.radioActive]}>
                                                {autoIncrementFrequency === freq.id && <View style={styles.radioInner} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[
                                                    styles.optionText,
                                                    autoIncrementFrequency === freq.id && styles.optionTextActive
                                                ]}>
                                                    {freq.label}
                                                </Text>
                                                <Text style={styles.optionDescription}>{freq.description}</Text>
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>

                    {/* Save Button */}
                    <Button
                        title="Save Settings"
                        onPress={handleSave}
                        loading={loading}
                        style={styles.saveBtn}
                        icon={<ArrowLeft size={20} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />}
                    />
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
    content: {
        padding: theme.spacing.m,
        paddingBottom: 40,
    },
    propertyLabel: {
        fontSize: theme.typography.s,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.l,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    sectionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    sectionSubtitle: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.s,
    },
    toggleLabel: {
        flex: 1,
        fontSize: theme.typography.s,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
    },
    optionsContainer: {
        borderRadius: theme.borderRadius.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    optionBtnActive: {
        backgroundColor: isDark ? theme.colors.accentLight : '#EEF2FF',
    },
    optionText: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    optionTextActive: {
        color: theme.colors.accent,
    },
    optionDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    radioActive: {
        borderColor: theme.colors.accent,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.accent,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: theme.spacing.m,
        letterSpacing: 0.5,
    },
    saveBtn: {
        marginTop: theme.spacing.m,
    },
});
