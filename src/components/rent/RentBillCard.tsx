import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Animated, PanResponder, Dimensions } from 'react-native';
import { theme } from '../../theme';
import { CURRENCY } from '../../utils/Constants';
import { User, UserPlus, Zap, Plus, ChevronRight, FileText, Send } from 'lucide-react-native';
import {
    updateBill, recalculateBill,
    getBillExpenses, getBillPayments
} from '../../db';

// Import modals
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
    };
    period: { start: string; end: string; days: number };
    onRefresh: () => void;
    navigation: any;
    propertyId: number;
}

export default function RentBillCard({ item, period, onRefresh, navigation, propertyId }: RentBillCardProps) {
    const { unit, tenant, bill, isVacant } = item;

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

    // Swipe-to-save animation
    const swipeAnim = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = Dimensions.get('window').width * 0.35;
    const TRACK_WIDTH = Dimensions.get('window').width - 72; // card padding approx

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
    const statusColor = isPaid ? theme.colors.success : isPartial ? theme.colors.warning : theme.colors.danger;
    const hasElectricity = unit.is_metered || (unit.electricity_fixed_amount && unit.electricity_fixed_amount > 0);
    const isMetered = unit.is_metered;

    // Handle meter reading change
    const handleMeterReadingSave = async () => {
        const newReading = parseFloat(meterReading);
        if (isNaN(newReading)) return;

        const prevReading = bill.prev_reading ?? unit.initial_electricity_reading ?? 0;
        const unitsUsed = Math.max(0, newReading - prevReading);
        const rate = unit.electricity_rate ?? 0;
        const electricityAmount = unitsUsed * rate;

        await updateBill(bill.id, {
            curr_reading: newReading,
            prev_reading: prevReading,
            electricity_amount: electricityAmount,
        });
        await recalculateBill(bill.id);
        onRefresh();
    };

    // Handle save (for meter reading auto-save on blur)
    const handleMeterSave = async () => {
        if (isMetered && meterReading) {
            await handleMeterReadingSave();
        }
        await recalculateBill(bill.id);
        onRefresh();
    };

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
        <View style={[styles.card, isPaid && styles.paidCard]}>
            {/* === ROW 1: Room Name + Tenant + Paid Amount Header === */}
            <Pressable style={styles.topRow} onPress={() => setShowRoomInfo(true)}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{unit.name}</Text>
                    <Text style={styles.tenantName}>{tenant?.name || '—'}</Text>
                </View>
                <Pressable
                    style={[styles.paidAmtBadge, isPaid && styles.paidAmtBadgePaid, !isPaid && (bill.paid_amount ?? 0) > 0 && styles.paidAmtBadgePartial]}
                    onPress={() => {
                        if ((bill.paid_amount ?? 0) > 0) {
                            setShowPaidAmount(true);
                        } else {
                            setShowReceivePayment(true);
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
                <View style={styles.electricityRow}>
                    <Zap size={16} color="#F59E0B" />
                    {isMetered ? (
                        <View style={styles.meterRow}>
                            <Text style={styles.meterLabel}>Old: {bill.prev_reading ?? unit.initial_electricity_reading ?? 0}</Text>
                            <Text style={styles.meterArrow}>→</Text>
                            <TextInput
                                style={styles.meterInput}
                                value={meterReading}
                                onChangeText={setMeterReading}
                                onBlur={handleMeterReadingSave}
                                keyboardType="numeric"
                                placeholder="New"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                            <Text style={styles.electricityAmt}>{formatAmount(bill.electricity_amount ?? 0)}</Text>
                        </View>
                    ) : (
                        <Pressable style={styles.fixedElecRow} onPress={() => setShowEditElectricity(true)}>
                            <Text style={styles.fixedElecLabel}>Fixed Electricity Cost</Text>
                            <Text style={styles.electricityAmt}>{formatAmount(bill.electricity_amount ?? 0)}</Text>
                            <ChevronRight size={16} color={theme.colors.textTertiary} />
                        </Pressable>
                    )}
                </View>
            )}

            {/* === RENT + PREVIOUS BALANCE (tappable) === */}
            <Pressable style={styles.rentSection} onPress={() => setShowTransactionInfo(true)}>
                <View style={styles.rentRow}>
                    <View>
                        <Text style={styles.rentLabel}>Rent</Text>
                        <Text style={styles.rentPeriod}>{period.start} - {period.end}</Text>
                    </View>
                    <Text style={styles.rentAmount}>{formatAmount(bill.rent_amount)}</Text>
                </View>
                <View style={styles.rentRow}>
                    <Text style={[styles.rentLabel, { color: theme.colors.warning }]}>Previous Balance</Text>
                    <Text style={styles.prevBalAmount}>{formatAmount(bill.previous_balance ?? 0)}</Text>
                </View>
            </Pressable>

            {/* === ADD/REMOVE + EXPENSES + TOTAL (compact row) === */}
            <View style={styles.actionsRow}>
                <Pressable style={styles.addRemoveBtn} onPress={() => setShowExpenseActions(true)}>
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
            {(() => {
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
                            Animated.timing(swipeAnim, {
                                toValue: TRACK_WIDTH - 48,
                                duration: 150,
                                useNativeDriver: false,
                            }).start(() => {
                                swipeAnim.setValue(0);
                                if (hasPaid) {
                                    Alert.alert('Receipt', 'Receipt generation coming soon!');
                                } else {
                                    Alert.alert('Reminder', 'Reminder sent!');
                                }
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
                        <Animated.View style={[styles.swipeFill, { backgroundColor: bgColor + '50', width: fillWidth, borderRadius: 25 }]} />
                        <Text style={[styles.swipeLabel, { color: bgColor }]}>{label}</Text>
                        <Animated.View
                            style={[styles.swipeThumb, { backgroundColor: bgColor, transform: [{ translateX: swipeAnim }] }]}
                            {...panResponder.panHandlers}
                        >
                            {hasPaid ? (
                                <FileText size={18} color="#FFF" />
                            ) : (
                                <Send size={18} color="#FFF" />
                            )}
                        </Animated.View>
                    </View>
                );
            })()}

            {/* Bill Info */}
            {bill.bill_number && (
                <Text style={styles.billInfo}>
                    {bill.bill_number} | {formattedDate()}
                </Text>
            )}

            {/* ===== MODALS ===== */}
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
        </View>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.m,
        gap: theme.spacing.s,
    },
    meterRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    meterLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    meterArrow: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    meterInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        minWidth: 60,
        borderWidth: 1,
        borderColor: theme.colors.border,
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
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 10,
        marginBottom: theme.spacing.s,
    },
    balanceRowPaid: {
        backgroundColor: '#ECFDF5',
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
        position: 'absolute',
    },
    swipeThumb: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        left: 3,
        ...theme.shadows.small,
    },
    billInfo: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 2,
    },
});
