import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { User, UserPlus, Zap, Plus, ChevronRight, FileText, Send, Lock } from 'lucide-react-native';
import {
    updateBill, recalculateBill,
    getBillExpenses, getBillPayments,
    getReceiptConfigByPropertyId, getPropertyById, getTenantById, getUnitById
} from '../../db';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateRentReceiptHTML } from '../../utils/rentReceiptTemplate';
import { generateRentReminderHTML } from '../../utils/rentReminderTemplate';
import { WebView } from 'react-native-webview';
import ViewShot from 'react-native-view-shot';
import { hapticsLight, hapticsMedium } from '../../utils/haptics';

// Import modals
import PickerBottomSheet from '../common/PickerBottomSheet';
import RoomInfoModal from './RoomInfoModal';
import ReceivePaymentModal from './ReceivePaymentModal';
import PaidAmountModal from './PaidAmountModal';
import TransactionInfoModal from './TransactionInfoModal';
import ExpenseActionsModal from './ExpenseActionsModal';
import ExpenseListModal from './ExpenseListModal';
import EditElectricityModal from './EditElectricityModal';

interface RentBillCardProps {
    item: {
        unit: any;
        tenant: any;
        bill: any;
        isVacant: boolean;
        isNotMovedIn?: boolean;
        isLeaseExpired?: boolean;
    };
    period: { start: string; end: string; days: number };
    onRefresh: () => void;
    navigation: any;
    propertyId: number;
}

export default function RentBillCard({ item, period, onRefresh, navigation, propertyId }: RentBillCardProps) {
    const { unit, tenant, bill, isVacant, isNotMovedIn, isLeaseExpired } = item;
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);

    // Modal states
    const [showRoomInfo, setShowRoomInfo] = useState(false);
    const [showReceivePayment, setShowReceivePayment] = useState(false);
    const [showPaidAmount, setShowPaidAmount] = useState(false);
    const [showTransactionInfo, setShowTransactionInfo] = useState(false);
    const [showExpenseActions, setShowExpenseActions] = useState(false);
    const [showExpenseList, setShowExpenseList] = useState(false);
    const [showEditElectricity, setShowEditElectricity] = useState(false);

    // Local state for metered reading
    const [meterReading, setMeterReading] = useState(bill?.curr_reading?.toString() || '');
    const [meterFocused, setMeterFocused] = useState(false);
    const [generatingReceipt, setGeneratingReceipt] = useState(false);
    const [sendingReminder, setSendingReminder] = useState(false);

    // Swipe-to-save animation
    const swipeAnim = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = Dimensions.get('window').width * 0.35;
    const TRACK_WIDTH = Dimensions.get('window').width - 72; // card padding approx

    const [shareFormatPickerVisible, setShareFormatPickerVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<'receipt' | 'reminder' | null>(null);

    const [shareHtml, setShareHtml] = useState<{ html: string; action: 'receipt' | 'reminder' } | null>(null);
    const viewShotRef = useRef<any>(null);

    // B12: Fix image loading in WebView by converting local files to base64
    const getBase64Image = async (uri: string) => {
        if (!uri) return '';
        if (uri.startsWith('data:') || uri.startsWith('http')) return uri;
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const extension = uri.split('.').pop() || 'png';
            return `data:image/${extension};base64,${base64}`;
        } catch (e) {
            console.error('Error converting image to base64:', e);
            return uri;
        }
    };

    const generateAndShareReceipt = async (format: 'PDF' | 'Image') => {
        setGeneratingReceipt(true);
        try {
            const [payments, freshExpenses, receiptConfig, property] = await Promise.all([
                getBillPayments(bill.id),
                getBillExpenses(bill.id),
                getReceiptConfigByPropertyId(propertyId),
                getPropertyById(propertyId),
            ]);

            // B12: Convert images to base64 for WebView/ViewShot capture
            if (format === 'Image' && receiptConfig) {
                if (receiptConfig.logo_uri) {
                    receiptConfig.logo_uri = await getBase64Image(receiptConfig.logo_uri);
                }
                if (receiptConfig.payment_qr_uri) {
                    receiptConfig.payment_qr_uri = await getBase64Image(receiptConfig.payment_qr_uri);
                }
            }

            const html = generateRentReceiptHTML({
                property,
                unit,
                tenant,
                bill,
                payments,
                expenses: freshExpenses,
                receiptConfig,
                period,
            });

            if (format === 'PDF') {
                const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 }); // A4

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Rent Receipt - ${tenant?.name || unit?.name} - ${bill.month}/${bill.year}`,
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('Sharing not available', 'PDF saved but sharing is not available on this device.');
                }
                setGeneratingReceipt(false);
            } else {
                setShareHtml({ html, action: 'receipt' });
            }
        } catch (error) {
            console.error('Receipt generation error:', error);
            Alert.alert('Error', 'Failed to generate receipt. Please try again.');
            setGeneratingReceipt(false);
        }
    };

    const generateAndShareReminder = async (format: 'PDF' | 'Image') => {
        setSendingReminder(true);
        try {
            const [freshExpenses, receiptConfig, property] = await Promise.all([
                getBillExpenses(bill.id),
                getReceiptConfigByPropertyId(propertyId),
                getPropertyById(propertyId),
            ]);

            // B12: Convert images to base64 for WebView/ViewShot capture
            if (format === 'Image' && receiptConfig) {
                if (receiptConfig.logo_uri) {
                    receiptConfig.logo_uri = await getBase64Image(receiptConfig.logo_uri);
                }
                if (receiptConfig.payment_qr_uri) {
                    receiptConfig.payment_qr_uri = await getBase64Image(receiptConfig.payment_qr_uri);
                }
            }

            const html = generateRentReminderHTML({
                property,
                unit,
                tenant,
                bill,
                expenses: freshExpenses,
                receiptConfig,
                period,
            });

            if (format === 'PDF') {
                const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Payment Reminder - ${tenant?.name || unit?.name} - ${bill.month}/${bill.year}`,
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('Sharing not available', 'PDF saved but sharing is not available on this device.');
                }
                setSendingReminder(false);
            } else {
                setShareHtml({ html, action: 'reminder' });
            }
        } catch (error) {
            console.error('Reminder generation error:', error);
            Alert.alert('Error', 'Failed to generate reminder. Please try again.');
            setSendingReminder(false);
        }
    };

    const handleShareActionSelect = (format: string) => {
        if (pendingAction === 'receipt') {
            generateAndShareReceipt(format as 'PDF' | 'Image');
        } else if (pendingAction === 'reminder') {
            generateAndShareReminder(format as 'PDF' | 'Image');
        }
        setPendingAction(null);
    };

    const handleCaptureImage = async () => {
        try {
            if (viewShotRef.current) {
                // Wait briefly for full webview paint
                setTimeout(async () => {
                    try {
                        const uri = await viewShotRef.current.capture();
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(uri, {
                                mimeType: 'image/png',
                                dialogTitle: `${shareHtml?.action === 'receipt' ? 'Rent Receipt' : 'Payment Reminder'} - ${tenant?.name || unit?.name}`,
                            });
                        }
                    } catch (e) {
                        console.error('Image capture error:', e);
                        Alert.alert('Error', 'Failed to capture image.');
                    } finally {
                        setShareHtml(null);
                        setGeneratingReceipt(false);
                        setSendingReminder(false);
                    }
                }, 800);
            }
        } catch (err) {
            console.error('handleCaptureImage err', err);
            setShareHtml(null);
            setGeneratingReceipt(false);
            setSendingReminder(false);
        }
    };

    // ===== NOT MOVED IN CARD =====
    if (isNotMovedIn && tenant) {
        const moveDate = tenant.rent_start_date
            ? new Date(tenant.rent_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : tenant.move_in_date
                ? new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
        return (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: theme.colors.accent }]}>
                <View style={styles.vacantContent}>
                    <View style={[styles.vacantIcon, { backgroundColor: theme.colors.accentLight }]}>
                        <User size={24} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{unit.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{tenant.name}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.accent, marginTop: 2 }}>Moves in on {moveDate}</Text>
                        {tenant.lease_type && (
                            <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>
                                Lease: {tenant.lease_type === 'monthly' ? 'Monthly' : 'Fixed'}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    }

    // ===== LEASE EXPIRED CARD =====
    if (isLeaseExpired && tenant) {
        const endDate = tenant.lease_end_date
            ? new Date(tenant.lease_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        return (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: theme.colors.warning }]}>
                <View style={styles.vacantContent}>
                    <View style={[styles.vacantIcon, { backgroundColor: theme.colors.warningLight }]}>
                        <User size={24} color={theme.colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{unit.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{tenant.name}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.warning, marginTop: 2 }}>Lease expired on {endDate}</Text>
                    </View>
                </View>
            </View>
        );
    }

    // ===== VACANT CARD =====
    if (isVacant) {
        return (
            <View style={[styles.card, styles.vacantCard]}>
                <View style={styles.vacantContent}>
                    <View style={styles.vacantIcon}>
                        <User size={24} color={theme.colors.textTertiary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{unit.name}</Text>
                        <Text style={styles.vacantText}>No Tenant in this Room</Text>
                    </View>
                    <Pressable
                        style={styles.addTenantBtn}
                        onPress={() => navigation.navigate('AddTenant', { propertyId, unitId: unit.id })}
                    >
                        <UserPlus size={16} color={theme.colors.accent} />
                        <Text style={styles.addTenantText}>Add</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!bill) return null;

    // Status-based styling
    const isPaid = bill.status === 'paid' || bill.status === 'overpaid';
    const isPartial = bill.status === 'partial';
    const statusColor = isPaid ? theme.colors.success : theme.colors.danger;
    const hasElectricity = unit.is_metered || (unit.electricity_fixed_amount && unit.electricity_fixed_amount > 0);
    const isMetered = unit.is_metered;

    // B16: Lock historical bills (older than last month) to prevent invalidating balances
    const isLocked = (() => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const diff = (currentYear * 12 + currentMonth) - (bill.year * 12 + bill.month);
        return diff > 1;
    })();

    const [meterReadingError, setMeterReadingError] = useState('');

    // Handle meter reading change
    const handleMeterReadingSave = async () => {
        const newReading = parseFloat(meterReading);
        if (isNaN(newReading)) return;

        const prevReading = bill.prev_reading ?? unit.initial_electricity_reading ?? 0;

        if (newReading < prevReading) {
            setMeterReadingError(`Cannot be less than old reading (${prevReading})`);
            return;
        } else {
            setMeterReadingError('');
        }

        let unitsUsed = Math.max(0, newReading - prevReading);
        const defaultUnits = unit.electricity_default_units;
        if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
            unitsUsed = defaultUnits;
        }

        const rate = unit.electricity_rate ?? 0;
        const electricityAmount = unitsUsed * rate;

        hapticsLight();
        await updateBill(bill.id, {
            curr_reading: newReading,
            prev_reading: prevReading,
            electricity_amount: electricityAmount,
        });
        await recalculateBill(bill.id);
        onRefresh();
    };

    // Live calculation for electricity amount based on current input text
    const liveElectricityAmount = React.useMemo(() => {
        const val = parseFloat(meterReading);
        if (isNaN(val)) return bill.electricity_amount ?? 0;
        const prev = bill.prev_reading ?? unit.initial_electricity_reading ?? 0;

        if (val < prev) return 0;

        let unitsUsed = Math.max(0, val - prev);
        const defaultUnits = unit.electricity_default_units;
        if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
            unitsUsed = defaultUnits;
        }

        return unitsUsed * (unit.electricity_rate ?? 0);
    }, [meterReading, bill.prev_reading, bill.electricity_amount, unit.initial_electricity_reading, unit.electricity_rate, unit.electricity_default_units]);

    // B12: Sync meter reading from prop changes ONLY when user is not typing
    React.useEffect(() => {
        if (!meterFocused && bill?.curr_reading !== undefined && bill?.curr_reading !== null) {
            setMeterReading(bill.curr_reading.toString());
        }
    }, [bill?.curr_reading]);

    const formatAmount = (amt: number) => {
        if (amt === undefined || amt === null) return `${CURRENCY}0`;
        return `${CURRENCY}${amt.toLocaleString('en-IN')}`;
    };

    const formattedDate = () => {
        const d = bill.updated_at ? new Date(bill.updated_at) : new Date(bill.created_at);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} (${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'})`;
    };

    return (
        <View style={[styles.card, isPaid && styles.paidCard, isLocked && styles.lockedCard]}>
            {isLocked && (
                <View style={styles.lockedBanner}>
                    <Lock size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.lockedText}>Historical Record - Locked</Text>
                </View>
            )}
            {/* === ROW 1: Room Name + Tenant + Paid Amount Header === */}
            <Pressable style={styles.topRow} onPress={() => setShowRoomInfo(true)}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.roomName}>{unit.name}</Text>
                        {tenant?.lease_type && (
                            <View style={[styles.leaseBadge, tenant.lease_type === 'fixed' ? styles.leaseBadgeFixed : styles.leaseBadgeMonthly]}>
                                <Text style={styles.leaseBadgeText}>
                                    {tenant.lease_type === 'fixed' ? 'Fixed' : 'Monthly'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.tenantName}>{tenant?.name || '—'}</Text>
                </View>
                <Pressable
                    style={[styles.paidAmtBadge, isPaid && styles.paidAmtBadgePaid, !isPaid && (bill.paid_amount ?? 0) > 0 && styles.paidAmtBadgePartial, isLocked && { opacity: 0.8 }]}
                    onPress={() => {
                        if ((bill.paid_amount ?? 0) > 0) {
                            setShowPaidAmount(true);
                        } else if (!isLocked) {
                            setShowReceivePayment(true);
                        } else {
                            Alert.alert('Locked', 'Historical records cannot be edited.');
                        }
                    }}
                >
                    <Text style={styles.paidAmtLabel}>PAID AMT</Text>
                    <Text style={[styles.paidAmtValue, isPaid && styles.paidAmtValueGreen, !isPaid && (bill.paid_amount ?? 0) > 0 && styles.paidAmtValueOrange]}>
                        {(bill.paid_amount ?? 0) > 0 ? formatAmount(bill.paid_amount) : 'Tap to Pay'}
                    </Text>
                </Pressable>
            </Pressable>

            {/* === ELECTRICITY SECTION (if applicable) === */}
            {hasElectricity && (
                <View style={styles.electricityRowMetered}>
                    <View style={styles.electricityRow}>
                        <Zap size={16} color={theme.colors.warning} />
                        {isMetered ? (
                            <View style={styles.meterRow}>
                                <Text style={styles.meterLabel}>
                                    Old: {bill.prev_reading ?? unit.initial_electricity_reading ?? 0}
                                </Text>
                                <Text style={styles.meterArrow}>→</Text>
                                <TextInput
                                    style={[styles.meterInput, isLocked && { opacity: 0.6 }]}
                                    value={meterReading}
                                    onChangeText={setMeterReading}
                                    onFocus={() => setMeterFocused(true)}
                                    onBlur={() => { setMeterFocused(false); handleMeterReadingSave(); }}
                                    onSubmitEditing={() => { setMeterFocused(false); handleMeterReadingSave(); }}
                                    keyboardType="numeric"
                                    placeholder="New"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    editable={!isLocked}
                                    returnKeyType="done"
                                />
                                <Text style={[styles.electricityAmt, { marginLeft: theme.spacing.s }]}>{formatAmount(liveElectricityAmount)}</Text>
                            </View>
                        ) : (
                            <Pressable
                                style={styles.fixedElecRow}
                                onPress={() => isLocked ? Alert.alert('Locked', 'Historical records cannot be edited.') : setShowEditElectricity(true)}
                            >
                                <Text style={styles.fixedElecLabel}>Fixed Electricity Cost</Text>
                                <Text style={styles.electricityAmt}>{formatAmount(bill.electricity_amount ?? 0)}</Text>
                                {!isLocked && <ChevronRight size={16} color={theme.colors.textTertiary} />}
                            </Pressable>
                        )}
                    </View>
                    {isMetered && !!meterReadingError && (
                        <Text style={styles.meterErrorText}>{meterReadingError}</Text>
                    )}
                </View>
            )}

            {/* === RENT + PREVIOUS BALANCE (tappable) === */}
            <Pressable
                style={styles.rentSection}
                onPress={() => isLocked ? Alert.alert('Locked', 'Historical records cannot be edited.') : setShowTransactionInfo(true)}
            >
                <View style={styles.rentRow}>
                    <View>
                        <Text style={styles.rentLabel}>Rent</Text>
                        <Text style={styles.rentPeriod}>
                            {bill.period_start ? new Date(bill.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : period.start}
                            {' - '}
                            {bill.period_end ? new Date(bill.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : period.end}
                        </Text>
                    </View>
                    <Text style={styles.rentAmount}>{formatAmount(bill.rent_amount)}</Text>
                </View>
                <View style={styles.rentRow}>
                    <Text style={[styles.rentLabel, { color: (bill.previous_balance ?? 0) < 0 ? theme.colors.success : theme.colors.warning }]}>
                        {(bill.previous_balance ?? 0) < 0 ? 'Previous Advance' : 'Previous Due'}
                    </Text>
                    <Text style={[styles.prevBalAmount, { color: (bill.previous_balance ?? 0) < 0 ? theme.colors.success : theme.colors.warning }]}>
                        {(bill.previous_balance ?? 0) < 0 ? '−' : '+'}{formatAmount(Math.abs(bill.previous_balance ?? 0))}
                    </Text>
                </View>
            </Pressable>

            {/* === ADD/REMOVE + EXPENSES + TOTAL (compact row) === */}
            <View style={styles.actionsRow}>
                <Pressable
                    style={[styles.addRemoveBtn, isLocked && { opacity: 0.5 }]}
                    onPress={() => isLocked ? Alert.alert('Locked', 'Historical records cannot be edited.') : setShowExpenseActions(true)}
                >
                    <Plus size={14} color={theme.colors.accent} />
                    <Text style={styles.addRemoveText}>Add/Remove</Text>
                </Pressable>
                {(bill.total_expenses ?? 0) > 0 && (
                    <Pressable style={styles.expenseChip} onPress={() => setShowExpenseList(true)}>
                        <Text style={styles.expenseChipText}>{formatAmount(bill.total_expenses)}</Text>
                    </Pressable>
                )}
                <View style={{ flex: 1 }} />
                <View style={styles.totalCol}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>{formatAmount(bill.total_amount)}</Text>
                </View>
            </View>

            {/* === BALANCE === */}
            <View style={[styles.balanceRow, isPaid && styles.balanceRowPaid]}>
                <Text style={[styles.balanceLabel, { color: statusColor }]}>
                    {isPaid ? 'Fully Paid' : 'Current Balance'}
                </Text>
                <Text style={[styles.balanceAmount, { color: statusColor }]}>
                    {formatAmount(Math.abs(bill.balance ?? 0))}
                </Text>
            </View>

            {/* === SWIPE ACTION === */}
            {
                (() => {
                    const hasPaid = (bill.paid_amount ?? 0) > 0;
                    const label = hasPaid ? 'Swipe → Receipt' : 'Swipe → Reminder';
                    const bgColor = hasPaid ? theme.colors.primary : theme.colors.warning;

                    const panResponder = PanResponder.create({
                        onStartShouldSetPanResponder: () => true,
                        onPanResponderMove: (_, gestureState) => {
                            if (gestureState.dx > 0) {
                                swipeAnim.setValue(Math.min(gestureState.dx, TRACK_WIDTH - 48));
                            }
                        },
                        onPanResponderRelease: (_, gestureState) => {
                            if (gestureState.dx > SWIPE_THRESHOLD) {
                                hapticsMedium();
                                Animated.timing(swipeAnim, {
                                    toValue: TRACK_WIDTH - 48,
                                    duration: 150,
                                    useNativeDriver: false,
                                }).start(() => {
                                    swipeAnim.setValue(0);
                                    if (hasPaid) {
                                        setPendingAction('receipt');
                                    } else {
                                        setPendingAction('reminder');
                                    }
                                    setShareFormatPickerVisible(true);
                                });
                            } else {
                                Animated.spring(swipeAnim, {
                                    toValue: 0,
                                    useNativeDriver: false,
                                }).start();
                            }
                        },
                    });

                    const fillWidth = Animated.add(swipeAnim, 48);

                    return (
                        <View style={[styles.swipeTrack, { backgroundColor: bgColor + '12' }]}>
                            {(generatingReceipt || sendingReminder) ? (
                                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                    <ActivityIndicator size="small" color={bgColor} />
                                    <Text style={[styles.swipeLabel, { color: bgColor }]}>
                                        {generatingReceipt ? 'Generating Receipt...' : 'Sending Reminder...'}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Animated.View style={[styles.swipeFill, { backgroundColor: bgColor + '50', width: fillWidth, borderRadius: 25 }]} />
                                    <Text style={[styles.swipeLabel, { color: bgColor, position: 'absolute' }]}>{label}</Text>
                                    <Animated.View
                                        style={[styles.swipeThumb, { backgroundColor: isDark ? '#111827' : bgColor, transform: [{ translateX: swipeAnim }] }]}
                                        {...panResponder.panHandlers}
                                    >
                                        {hasPaid ? (
                                            <FileText size={18} color="#FFF" />
                                        ) : (
                                            <Send size={18} color="#FFF" />
                                        )}
                                    </Animated.View>
                                </>
                            )}
                        </View>
                    );
                })()
            }

            {/* Bill Info */}
            {
                bill.bill_number && (
                    <Text style={styles.billInfo}>
                        {bill.bill_number} | {formattedDate()}
                    </Text>
                )
            }

            {/* Hidden WebView for capturing as Image */}
            {/* WebView matches the CSS .page exactly (794×1123px).
                ViewShot captures at PixelRatio.get() scale automatically —
                on a 3× iPhone this gives 2382×3369 native pixels, crisp with no white borders. */}
            {
                shareHtml && (
                    <View style={styles.hiddenViewShotContainer} pointerEvents="none">
                        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                            <WebView
                                source={{ html: shareHtml.html }}
                                style={{ width: 794, height: 1123 }}
                                onLoadEnd={handleCaptureImage}
                                originWhitelist={['*']}
                                allowFileAccess={true}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                scalesPageToFit={false}
                            />
                        </ViewShot>
                    </View>
                )
            }

            {/* ===== MODALS ===== */}
            <PickerBottomSheet
                visible={shareFormatPickerVisible}
                onClose={() => setShareFormatPickerVisible(false)}
                title={pendingAction === 'receipt' ? "Share Receipt As" : "Share Reminder As"}
                options={['Image', 'PDF']}
                onSelect={handleShareActionSelect}
            />
            <RoomInfoModal
                visible={showRoomInfo}
                onClose={() => setShowRoomInfo(false)}
                tenant={tenant}
                unit={unit}
                navigation={navigation}
                propertyId={propertyId}
            />
            <ReceivePaymentModal
                visible={showReceivePayment}
                onClose={() => { setShowReceivePayment(false); onRefresh(); }}
                bill={bill}
                unit={unit}
            />
            <PaidAmountModal
                visible={showPaidAmount}
                onClose={() => { setShowPaidAmount(false); onRefresh(); }}
                bill={bill}
                unit={unit}
                onAddPayment={() => {
                    setShowPaidAmount(false);
                    setShowReceivePayment(true);
                }}
            />
            <TransactionInfoModal
                visible={showTransactionInfo}
                onClose={() => { setShowTransactionInfo(false); onRefresh(); }}
                bill={bill}
                unit={unit}
                period={period}
            />
            <ExpenseActionsModal
                visible={showExpenseActions}
                onClose={() => { setShowExpenseActions(false); onRefresh(); }}
                bill={bill}
                unit={unit}
            />
            <ExpenseListModal
                visible={showExpenseList}
                onClose={() => { setShowExpenseList(false); onRefresh(); }}
                bill={bill}
                unit={unit}
            />
            <EditElectricityModal
                visible={showEditElectricity}
                onClose={() => { setShowEditElectricity(false); onRefresh(); }}
                bill={bill}
                unit={unit}
            />
        </View >
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    paidCard: {
        borderColor: theme.colors.success,
    },
    vacantCard: {
        borderStyle: 'dashed' as any,
    },
    vacantContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
    },
    vacantIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vacantText: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    addTenantBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
    },
    addTenantText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },

    // Top Row
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
    },
    roomName: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    tenantName: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    paidAmtBadge: {
        alignItems: 'flex-end',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: theme.colors.accentLight,
        borderWidth: 1.5,
        borderColor: theme.colors.accent + '30',
    },
    paidAmtBadgePaid: {
        backgroundColor: theme.colors.successLight,
        borderColor: theme.colors.success + '40',
    },
    paidAmtBadgePartial: {
        backgroundColor: theme.colors.warningLight,
        borderColor: theme.colors.warning + '40',
    },
    paidAmtLabel: {
        fontSize: 9,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        letterSpacing: 1,
    },
    paidAmtValue: {
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        marginTop: 2,
    },
    paidAmtValueGreen: {
        color: theme.colors.success,
    },
    paidAmtValueOrange: {
        color: theme.colors.warning,
    },

    // Electricity
    electricityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
    },
    electricityRowMetered: {
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.warningLight,
        borderRadius: 12,
        padding: theme.spacing.s,
    },
    meterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    meterLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    meterArrow: {
        fontSize: 14,
        color: theme.colors.textTertiary,
        marginHorizontal: theme.spacing.s,
    },
    meterInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        minWidth: 68,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    meterErrorText: {
        fontSize: 11,
        color: theme.colors.danger,
        marginTop: 2,
    },
    fixedElecRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fixedElecLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    electricityAmt: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },

    // Rent Section
    rentSection: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    rentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    rentLabel: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    rentPeriod: {
        fontSize: 11,
        color: theme.colors.accent,
        marginTop: 1,
    },
    rentAmount: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    prevBalAmount: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.s,
    },
    addRemoveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: theme.colors.accentLight,
    },
    addRemoveText: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    expenseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: theme.colors.successLight,
    },
    expenseChipText: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.success,
    },
    totalCol: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },

    // Balance
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.dangerLight,
        borderRadius: 12,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 10,
        marginBottom: theme.spacing.s,
    },
    balanceRowPaid: {
        backgroundColor: theme.colors.successLight,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
    },
    balanceAmount: {
        fontSize: 20,
        fontWeight: theme.typography.bold,
    },

    // Swipe Button
    swipeTrack: {
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 6,
    },
    swipeFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    swipeLabel: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
    },
    swipeThumb: {
        width: 48,
        height: 48,
        borderRadius: 24,
        position: 'absolute',
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.medium,
    },
    billInfo: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 6,
    },
    hiddenViewShotContainer: {
        position: 'absolute',
        top: -10000,
        left: -10000,
        opacity: 0,
    },
    // Locked Card Styles
    lockedCard: {
        backgroundColor: isDark ? theme.colors.background : '#F9FAFB',
        borderColor: theme.colors.border,
    },
    lockedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: isDark ? theme.colors.surface : '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    lockedText: {
        fontSize: 11,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
    },
    leaseBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    leaseBadgeMonthly: {
        backgroundColor: isDark ? theme.colors.accentLight : '#E0F2FE', // Blue tint
    },
    leaseBadgeFixed: {
        backgroundColor: isDark ? theme.colors.warningLight : '#F3E8FF', // Purple-ish / Amber tint
    },
    leaseBadgeText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        textTransform: 'uppercase',
    },
});
