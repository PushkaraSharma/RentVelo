import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, PanResponder, Dimensions, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { User, UserPlus, Zap, Droplets, Plus, ChevronRight, FileText, Send, Lock } from 'lucide-react-native';
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
import { hapticsLight, hapticsMedium, hapticsHeavy } from '../../utils/haptics';
import { trackEvent, AnalyticsEvents } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';
import RNShare from 'react-native-share';
import { getReceiptDefaultFormat, getReceiptDefaultAction } from '../../utils/storage';

// Import modals
import PickerBottomSheet from '../common/PickerBottomSheet';
import RoomInfoModal from './RoomInfoModal';
import ReceivePaymentModal from './ReceivePaymentModal';
import PaidAmountModal from './PaidAmountModal';
import TransactionInfoModal from './TransactionInfoModal';
import ExpenseActionsModal from './ExpenseActionsModal';
import ExpenseListModal from './ExpenseListModal';
import EditUtilityModal from './EditUtilityModal';
import ConfirmationModal from '../common/ConfirmationModal';

interface RentBillCardProps {
    item: {
        unit: any;
        tenant: any;
        bill: any;
        isVacant: boolean;
        isNotMovedIn?: boolean;
        isLeaseExpired?: boolean;
        hasFuturePersistedBills?: boolean;
        isStrictlyFuture?: boolean;
    };
    period: { start: string; end: string; days: number };
    onRefresh: (isSilent?: boolean) => void;
    navigation: any;
    propertyId: number;
    viewingMonth: number;
    viewingYear: number;
}

const RentBillCard = React.memo(({ item, period, onRefresh, navigation, propertyId, viewingMonth, viewingYear }: RentBillCardProps) => {
    const { unit, tenant, bill, isVacant, isNotMovedIn, isLeaseExpired, hasFuturePersistedBills } = item;
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    // B18: ALL HOOKS MUST BE AT THE TOP
    const [showRoomInfo, setShowRoomInfo] = useState(false);
    const [showReceivePayment, setShowReceivePayment] = useState(false);
    const [showPaidAmount, setShowPaidAmount] = useState(false);
    const [showTransactionInfo, setShowTransactionInfo] = useState(false);
    const [showExpenseActions, setShowExpenseActions] = useState(false);
    const [showExpenseList, setShowExpenseList] = useState(false);
    const [showEditUtility, setShowEditUtility] = useState<{ visible: boolean; type: 'electricity' | 'water' }>({ visible: false, type: 'electricity' });
    const savingReading = useRef(false);
    const [meterReading, setMeterReading] = useState(bill?.curr_reading?.toString() || '');
    const [meterFocused, setMeterFocused] = useState(false);
    const [waterReading, setWaterReading] = useState(bill?.water_curr_reading?.toString() || '');
    const [waterFocused, setWaterFocused] = useState(false);
    const [generatingReceipt, setGeneratingReceipt] = useState(false);
    const [sendingReminder, setSendingReminder] = useState(false);
    const [shareFormatPickerVisible, setShareFormatPickerVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<'receipt' | 'reminder' | null>(null);
    const [shareHtml, setShareHtml] = useState<{ html: string; action: 'receipt' | 'reminder' } | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [isReseting, setIsReseting] = useState(false);
    const [meterReadingError, setMeterReadingError] = useState('');
    const [waterReadingError, setWaterReadingError] = useState('');
    const [showVirtualBillWarning, setShowVirtualBillWarning] = useState(false);
    const [pendingVirtualAction, setPendingVirtualAction] = useState<(() => void) | null>(null);
    const [isPersistingVirtual, setIsPersistingVirtual] = useState(false);

    const swipeAnim = useRef(new Animated.Value(0)).current;
    const viewShotRef = useRef<any>(null);

    // Memoize constants
    const SWIPE_THRESHOLD = useMemo(() => Dimensions.get('window').width * 0.35, []);
    const TRACK_WIDTH = useMemo(() => Dimensions.get('window').width - 72, []);

    // Effect for reading continuity
    useEffect(() => {
        // Sync electricity
        if (!meterFocused) {
            const propReading = bill?.curr_reading?.toString() || '';
            // Only sync from props if the bill is ALREADY persisted or if the value changed externally
            // If it's a virtual bill and we have local text, don't wipe it!
            if (bill?.id !== null || propReading !== '') {
                if (propReading !== meterReading) {
                    setMeterReading(propReading);
                }
            }
        }

        // Sync water
        if (!waterFocused) {
            const propWaterReading = bill?.water_curr_reading?.toString() || '';
            if (bill?.id !== null || propWaterReading !== '') {
                if (propWaterReading !== waterReading) {
                    setWaterReading(propWaterReading);
                }
            }
        }
    }, [bill?.id, bill?.curr_reading, bill?.water_curr_reading, meterFocused, waterFocused]);

    // B17.1: Listen for keyboard hide to catch Android swipe-back (which doesn't fire onBlur reliably)
    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (meterFocused) {
                setMeterFocused(false);
                handleMeterReadingSave('electricity');
            }
            if (waterFocused) {
                setWaterFocused(false);
                handleMeterReadingSave('water');
            }
        });
        return () => hideSubscription.remove();
    }, [meterFocused, waterFocused, meterReading, waterReading, bill]);

    // Derived locking state
    const isLocked = useMemo(() => {
        if (!bill) return false;
        return hasFuturePersistedBills === true;
    }, [hasFuturePersistedBills, bill]);

    const liveElectricityAmount = useMemo(() => {
        if (unit.electricity_rate === null || !bill) return bill?.electricity_amount ?? 0;
        const val = parseFloat(meterReading);
        if (isNaN(val)) return bill.electricity_amount ?? 0;
        const prev = (bill.prev_reading !== null && bill.prev_reading !== 0) ? bill.prev_reading : (unit?.initial_electricity_reading ?? 0);
        if (val < prev) return 0;
        let unitsUsed = Math.max(0, val - prev);
        const defaultUnits = unit.electricity_default_units;
        if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
            unitsUsed = defaultUnits;
        }
        let amt = unitsUsed * (unit.electricity_rate ?? 0);
        // PG split: divide metered cost across occupied beds in same room
        if (unit.room_group && bill) {
            // Note: For live UI calculation, we'd need occupiedCount. 
            // For now, let's keep it simple or use a cached count if we had one.
            // Since we don't have occupiedCount here, it might show full room cost in live UI.
            // But recalculated bill will show correct split.
        }
        return amt;
    }, [meterReading, bill, unit]);

    const liveWaterAmount = useMemo(() => {
        if (unit.water_rate === null || !bill) return bill?.water_amount ?? 0;
        const val = parseFloat(waterReading);
        if (isNaN(val)) return bill.water_amount ?? 0;
        const prev = (bill.water_prev_reading !== null && bill.water_prev_reading !== 0) ? bill.water_prev_reading : (unit?.initial_water_reading ?? 0);
        if (val < prev) return 0;
        let unitsUsed = Math.max(0, val - prev);
        const defaultUnits = unit.water_default_units;
        if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
            unitsUsed = defaultUnits;
        }
        return unitsUsed * (unit.water_rate ?? 0);
    }, [waterReading, bill, unit]);

    // B12: Fix image loading in WebView by converting local files to base64
    const getBase64Image = async (uri: string) => {
        if (!uri) return '';
        if (uri.startsWith('data:') || uri.startsWith('http')) return uri;

        try {
            // Ensure we are working with an absolute path by using imageService
            const { getFullImageUri } = require('../../services/imageService');
            // Sometimes stored URIs have a leading slash, trim it so getFullImageUri doesn't break
            const cleanUri = uri.startsWith('/') ? uri.slice(1) : uri;
            const fullUri = getFullImageUri(cleanUri) || cleanUri;

            const base64 = await FileSystem.readAsStringAsync(fullUri, { encoding: 'base64' });
            const extension = fullUri.split('.').pop() || 'png';
            return `data:image/${extension};base64,${base64}`;
        } catch (e) {
            console.error('Error converting image to base64 for', uri, ':', e);
            return uri;
        }
    };

    const executeShareHelper = async (uri: string, mimeType: string, dialogTitle: string) => {
        const defaultAction = getReceiptDefaultAction();
        let skippedFallback = false;
        let finalUri = uri;

        try {
            // Give the temporary file a human-readable name so WhatsApp/Files shows a pretty filename instead of a temporary hash UUID.
            const safeFilename = dialogTitle.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/ /g, '_').replace(/_+/g, '_');
            const extension = mimeType === 'application/pdf' ? '.pdf' : '.png';
            // cacheDirectory is guaranteed to have a trailing slash in Expo
            const newUri = `${FileSystem.cacheDirectory}${safeFilename}${extension}`;
            await FileSystem.copyAsync({ from: uri, to: newUri });
            finalUri = newUri;
        } catch (e) {
            console.warn('Failed to rename file, using original uri', e);
        }

        if (Platform.OS === 'android' && defaultAction === 'whatsapp' && tenant?.phone) {
            try {
                let formattedNumber = tenant.phone.replace(/\D/g, '');
                if (formattedNumber.length === 10) formattedNumber = '91' + formattedNumber;
                const shareOptions: any = {
                    social: RNShare.Social.WHATSAPP,
                    url: finalUri,
                    type: mimeType,
                    whatsAppNumber: formattedNumber,
                }
                await RNShare.shareSingle(shareOptions);
                return;
            } catch (err: any) {
                console.warn('WhatsApp share error:', err);
                if (err?.message && err.message.includes('User did not share')) {
                    skippedFallback = true;
                    return; // user cancelled deliberately
                }
                showToast({ type: 'warning', title: 'WhatsApp fallback', message: 'Could not open WhatsApp directly. Using default share.' });
            }
        }
        if (skippedFallback) return;

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(finalUri, {
                mimeType,
                dialogTitle,
                UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
            });
        } else {
            showToast({ type: 'info', title: 'Sharing not available', message: 'File generated but sharing is not available on this device.' });
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

            // B12: Convert images to base64 for WebView/ViewShot capture and PDF
            if (receiptConfig) {
                if (receiptConfig.logo_uri) {
                    receiptConfig.logo_uri = await getBase64Image(receiptConfig.logo_uri);
                }
                if (receiptConfig.payment_qr_uri) {
                    receiptConfig.payment_qr_uri = await getBase64Image(receiptConfig.payment_qr_uri);
                }
                if (receiptConfig.signature_uri) {
                    receiptConfig.signature_uri = await getBase64Image(receiptConfig.signature_uri);
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
                trackEvent(AnalyticsEvents.RENT_RECEIPT_GENERATED, { format: 'PDF', unit: unit.name });
                const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 }); // A4

                await executeShareHelper(uri, 'application/pdf', `Rent Receipt - ${tenant?.name || unit?.name} - ${period.end.split(' ').slice(1, 3).join('-') || `${bill.month}-${bill.year}`}`);

                setGeneratingReceipt(false);
            } else {
                setShareHtml({ html, action: 'receipt' });
            }
        } catch (error) {
            console.error('Receipt generation error:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to generate receipt. Please try again.' });
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

            // B12: Convert images to base64 for WebView/ViewShot capture and PDF
            if (receiptConfig) {
                if (receiptConfig.logo_uri) {
                    receiptConfig.logo_uri = await getBase64Image(receiptConfig.logo_uri);
                }
                if (receiptConfig.payment_qr_uri) {
                    receiptConfig.payment_qr_uri = await getBase64Image(receiptConfig.payment_qr_uri);
                }
                if (receiptConfig.signature_uri) {
                    receiptConfig.signature_uri = await getBase64Image(receiptConfig.signature_uri);
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
                trackEvent(AnalyticsEvents.RENT_REMINDER_SENT, { format: 'PDF', unit: unit.name });
                const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

                await executeShareHelper(uri, 'application/pdf', `Payment Reminder - ${tenant?.name || unit?.name} - ${period.end.split(' ').slice(1, 3).join('-') || `${bill.month}-${bill.year}`}`);

                setSendingReminder(false);
            } else {
                setShareHtml({ html, action: 'reminder' });
            }
        } catch (error) {
            console.error('Reminder generation error:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to generate reminder. Please try again.' });
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
                        trackEvent(shareHtml?.action === 'receipt' ? AnalyticsEvents.RENT_RECEIPT_GENERATED : AnalyticsEvents.RENT_REMINDER_SENT, { format: 'Image', unit: unit.name });

                        await executeShareHelper(
                            uri,
                            'image/png',
                            `${shareHtml?.action === 'receipt' ? 'Rent Receipt' : 'Payment Reminder'} - ${tenant?.name || unit?.name}`
                        );
                    } catch (e) {
                        console.error('Image capture error:', e);
                        showToast({ type: 'error', title: 'Error', message: 'Failed to capture image.' });
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
    // Simplified logic: if either the unit setting is enabled OR the bill already has an amount, show it.
    const hasElectricity = unit.electricity_rate !== null || (unit.electricity_fixed_amount !== null && unit.electricity_fixed_amount > 0) || (bill.electricity_amount > 0);
    const hasWater = unit.water_rate !== null || (unit.water_fixed_amount !== null && unit.water_fixed_amount > 0) || (bill.water_amount > 0);
    const isMetered = unit.electricity_rate !== null;
    const isWaterMetered = unit.water_rate !== null;

    const formatAmount = (amt: number) => {
        if (amt === undefined || amt === null) return `${CURRENCY}0`;
        return `${CURRENCY}${amt.toLocaleString('en-IN')}`;
    };

    const handleResetBill = () => {
        if (!hasFuturePersistedBills) return;
        setShowResetModal(true);
    };

    const confirmResetBill = async () => {
        try {
            setIsReseting(true);
            const { resetFutureBills } = require('../../db');
            await resetFutureBills(unit.id, viewingMonth, viewingYear);
            onRefresh();
        } catch (e) {
            console.error('Error resetting bill:', e);
            showToast({ type: 'error', title: 'Error', message: 'Failed to reset bill' });
        } finally {
            setIsReseting(false);
            setShowResetModal(false);
        }
    };

    const executeVirtualAction = (action: () => void) => {
        if (bill?.id === null) {
            if (item.isStrictlyFuture) {
                Keyboard.dismiss();
                setPendingVirtualAction(() => action);
                setTimeout(() => {
                    setShowVirtualBillWarning(true);
                }, 100);
            } else {
                handleConfirmVirtualAction(action);
            }
        } else {
            action();
        }
    };

    const handleConfirmVirtualAction = async (silentAction?: () => void) => {
        const actionToRun = silentAction || pendingVirtualAction;
        if (!bill || bill.id !== null || !actionToRun) {
            return;
        }

        setIsPersistingVirtual(true);
        try {
            const { persistVirtualBill } = require('../../db');
            const newBillId = await persistVirtualBill(bill);

            // Update local object bridge so that 'actionToRun' (like runSave) 
            // has the ID it needs immediately before the refresh unmounts us.
            bill.id = newBillId;

            // Wait for the action (e.g., save reading) to complete BEFORE refreshing UI
            await Promise.resolve(actionToRun());
            onRefresh(true);
        } catch (e) {
            console.error('[RentBillCard] Error persisting virtual bill:', e);
            showToast({ type: 'error', title: 'Error', message: 'Failed to persist bill' });
        } finally {
            setIsPersistingVirtual(false);
            setShowVirtualBillWarning(false);
            setPendingVirtualAction(null);
        }
    };

    const handleMeterReadingSave = async (type: 'electricity' | 'water') => {
        if (!bill || savingReading.current) return;

        const isElec = type === 'electricity';
        const currentVal = isElec ? meterReading : waterReading;
        const newReading = parseFloat(currentVal);
        if (isNaN(newReading)) return;

        // Stale check
        const existingVal = isElec ? bill.curr_reading : bill.water_curr_reading;
        if (newReading === existingVal) return;

        const prevReading = isElec
            ? (bill.prev_reading ?? unit.initial_electricity_reading ?? 0)
            : (bill.water_prev_reading ?? unit.initial_water_reading ?? 0);

        if (newReading < prevReading) {
            if (isElec) setMeterReadingError(`Cannot be less than old reading (${prevReading})`);
            else setWaterReadingError(`Cannot be less than old reading (${prevReading})`);
            return;
        } else {
            if (isElec) setMeterReadingError('');
            else setWaterReadingError('');
        }

        const runSave = async () => {
            savingReading.current = true;
            try {
                const { hapticsLight } = require('../../utils/haptics');
                hapticsLight();

                if (unit.room_group) {
                    // PG Room Group: Apply reading to all beds in the room and split cost
                    const { savePGUtilityReading } = require('../../db');
                    await savePGUtilityReading(
                        bill.property_id,
                        unit.room_group,
                        bill.month,
                        bill.year,
                        type,
                        newReading
                    );
                } else {
                    // Standard Room: Calculate cost directly for this single bill
                    let unitsUsed = Math.max(0, newReading - prevReading);
                    const defaultUnits = isElec ? unit.electricity_default_units : unit.water_default_units;
                    if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
                        unitsUsed = defaultUnits;
                    }
                    const rate = isElec ? (unit.electricity_rate ?? 0) : (unit.water_rate ?? 0);
                    const amt = unitsUsed * rate;

                    const { updateBill, recalculateBill } = require('../../db');
                    if (isElec) {
                        await updateBill(bill.id, {
                            curr_reading: newReading,
                            prev_reading: prevReading,
                            electricity_amount: amt,
                        });
                    } else {
                        await updateBill(bill.id, {
                            water_curr_reading: newReading,
                            water_prev_reading: prevReading,
                            water_amount: amt,
                        });
                    }
                    await recalculateBill(bill.id);
                }

                trackEvent(AnalyticsEvents.METER_READING_SAVED, { type, mode: 'metered' });
                onRefresh(true);
            } catch (error) {
                console.error('Error saving meter reading:', error);
            } finally {
                savingReading.current = false;
            }
        };

        if (bill.id === null) {
            executeVirtualAction(runSave);
        } else {
            runSave();
        }
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
            <Pressable
                style={styles.topRow}
                onPress={() => setShowRoomInfo(true)}
                onLongPress={isLocked ? handleResetBill : undefined}
                delayLongPress={500}
            >
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
                    {isLocked && (
                        <Text style={styles.lockMessage}>
                            Locked. To edit, long-press here to reset next months.
                        </Text>
                    )}
                </View>
                <Pressable
                    style={[styles.paidAmtBadge, isPaid && styles.paidAmtBadgePaid, !isPaid && (bill.paid_amount ?? 0) > 0 && styles.paidAmtBadgePartial, isLocked && { opacity: 0.8 }]}
                    onPress={() => {
                        if (isLocked) {
                            handleResetBill();
                            return;
                        }
                        if ((bill.paid_amount ?? 0) > 0) {
                            setShowPaidAmount(true);
                        } else if (!isLocked) {
                            executeVirtualAction(() => setShowReceivePayment(true));
                        } else {
                            showToast({ type: 'warning', title: 'Locked', message: 'Historical records cannot be edited.' });
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
                                    Old: {(bill.prev_reading !== null && bill.prev_reading !== 0) ? bill.prev_reading : (unit?.initial_electricity_reading ?? 0)}
                                </Text>
                                <Text style={styles.meterArrow}>→</Text>
                                <TextInput
                                    style={[styles.meterInput, isLocked && { opacity: 0.6 }]}
                                    value={meterReading}
                                    onChangeText={setMeterReading}
                                    onFocus={() => setMeterFocused(true)}
                                    onBlur={() => { setMeterFocused(false); handleMeterReadingSave('electricity'); }}
                                    onSubmitEditing={() => { setMeterFocused(false); handleMeterReadingSave('electricity'); }}
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
                                onPress={() => isLocked ? showToast({ type: 'warning', title: 'Locked', message: 'Historical records cannot be edited.' }) : executeVirtualAction(() => setShowEditUtility({ visible: true, type: 'electricity' }))}
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
                    {isMetered && !meterReadingError && !!unit.room_group && (
                        <Text style={styles.meterHintText}>Reading applied to entire room and split equally</Text>
                    )}
                </View>
            )}

            {/* === WATER SECTION (if applicable) === */}
            {hasWater && (
                <View style={styles.electricityRowMetered}>
                    <View style={styles.electricityRow}>
                        <Droplets size={16} color={theme.colors.primary} />
                        {isWaterMetered ? (
                            <View style={styles.meterRow}>
                                <Text style={styles.meterLabel}>
                                    Old: {(bill.water_prev_reading !== null && bill.water_prev_reading !== 0) ? bill.water_prev_reading : (unit?.initial_water_reading ?? 0)}
                                </Text>
                                <Text style={styles.meterArrow}>→</Text>
                                <TextInput
                                    style={[styles.meterInput, isLocked && { opacity: 0.6 }]}
                                    value={waterReading}
                                    onChangeText={setWaterReading}
                                    onFocus={() => setWaterFocused(true)}
                                    onBlur={() => { setWaterFocused(false); handleMeterReadingSave('water'); }}
                                    onSubmitEditing={() => { setWaterFocused(false); handleMeterReadingSave('water'); }}
                                    keyboardType="numeric"
                                    placeholder="New"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    editable={!isLocked}
                                    returnKeyType="done"
                                />
                                <Text style={[styles.electricityAmt, { marginLeft: theme.spacing.s }]}>{formatAmount(liveWaterAmount)}</Text>
                            </View>
                        ) : (
                            <Pressable
                                style={styles.fixedElecRow}
                                onPress={() => isLocked ? showToast({ type: 'warning', title: 'Locked', message: 'Historical records cannot be edited.' }) : executeVirtualAction(() => setShowEditUtility({ visible: true, type: 'water' }))}
                            >
                                <Text style={styles.fixedElecLabel}>Fixed Water Cost</Text>
                                <Text style={styles.electricityAmt}>{formatAmount(bill.water_amount ?? 0)}</Text>
                                {!isLocked && <ChevronRight size={16} color={theme.colors.textTertiary} />}
                            </Pressable>
                        )}
                    </View>
                    {isWaterMetered && !!waterReadingError && (
                        <Text style={styles.meterErrorText}>{waterReadingError}</Text>
                    )}
                    {isWaterMetered && !waterReadingError && !!unit.room_group && (
                        <Text style={styles.meterHintText}>Reading applied to entire room and split equally</Text>
                    )}
                </View>
            )}

            {/* === RENT + PREVIOUS BALANCE (tappable) === */}
            <Pressable
                style={styles.rentSection}
                onPress={() => isLocked ? showToast({ type: 'warning', title: 'Locked', message: 'Historical records cannot be edited.' }) : executeVirtualAction(() => setShowTransactionInfo(true))}
            >
                <View style={styles.rentRow}>
                    <View>
                        <Text style={styles.rentLabel}>Rent</Text>
                        <Text style={styles.rentPeriod}>
                            {(() => {
                                // Same postpaid logic derivation as TransactionInfoModal
                                const monthAbbrMap: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
                                const endParts = period.end.split(' ');
                                const pMonth = endParts.length >= 2 ? (monthAbbrMap[endParts[1]] ?? (bill.month - 1)) : (bill.month - 1);
                                const pYear = endParts.length >= 3 ? parseInt(endParts[2]) : bill.year;
                                const startObj = bill.period_start ? new Date(bill.period_start) : new Date(pYear, pMonth, 1);
                                const endObj = bill.period_end ? new Date(bill.period_end) : new Date(pYear, pMonth + 1, 0);
                                return `${startObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
                            })()}
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
                    onPress={() => isLocked ? showToast({ type: 'warning', title: 'Locked', message: 'Historical records cannot be edited.' }) : executeVirtualAction(() => setShowExpenseActions(true))}
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
                        onPanResponderTerminationRequest: (_, gestureState) => {
                            // Allow scroll view to steal the touch ONLY if the user is scrolling vertically
                            return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
                        },
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
                                    const defaultFmt = getReceiptDefaultFormat();

                                    if (defaultFmt === 'ask') {
                                        if (hasPaid) {
                                            setPendingAction('receipt');
                                        } else {
                                            setPendingAction('reminder');
                                        }
                                        setShareFormatPickerVisible(true);
                                    } else {
                                        const autoFormat = defaultFmt === 'pdf' ? 'PDF' : 'Image';
                                        if (hasPaid) {
                                            generateAndShareReceipt(autoFormat);
                                        } else {
                                            generateAndShareReminder(autoFormat);
                                        }
                                    }
                                });
                            } else {
                                Animated.spring(swipeAnim, {
                                    toValue: 0,
                                    useNativeDriver: false,
                                }).start();
                            }
                        },
                        onPanResponderTerminate: () => {
                            // If the scroll view successfully steals the touch, snap the thumb back so it doesn't get stuck
                            Animated.spring(swipeAnim, {
                                toValue: 0,
                                useNativeDriver: false,
                            }).start();
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
            {
                shareHtml && (
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 794,
                        height: 1123,
                        overflow: 'hidden',
                        opacity: 0,
                        zIndex: -1,
                    }} pointerEvents="none" collapsable={false}>
                        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ width: 794, height: 1123 }}>
                            <WebView
                                source={{ html: shareHtml.html }}
                                style={{ width: 794, height: 1123, backgroundColor: '#ffffff' }}
                                onLoadEnd={handleCaptureImage}
                                originWhitelist={['*']}
                                allowFileAccess={true}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                scalesPageToFit={false}
                                automaticallyAdjustContentInsets={false}
                                bounces={false}
                                showsVerticalScrollIndicator={false}
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
                onClose={() => { setShowReceivePayment(false); onRefresh(true); }}
                bill={bill}
                unit={unit}
            />
            <PaidAmountModal
                visible={showPaidAmount}
                onClose={() => { setShowPaidAmount(false); onRefresh(true); }}
                bill={bill}
                unit={unit}
                onAddPayment={() => {
                    setShowPaidAmount(false);
                    setShowReceivePayment(true);
                }}
            />
            <TransactionInfoModal
                visible={showTransactionInfo}
                onClose={() => { setShowTransactionInfo(false); onRefresh(true); }}
                bill={bill}
                unit={unit}
                period={period}
            />
            <ExpenseActionsModal
                visible={showExpenseActions}
                onClose={() => { setShowExpenseActions(false); onRefresh(true); }}
                bill={bill}
                unit={unit}
            />
            <ExpenseListModal
                visible={showExpenseList}
                onClose={() => { setShowExpenseList(false); onRefresh(true); }}
                bill={bill}
                unit={unit}
            />
            <EditUtilityModal
                visible={showEditUtility.visible}
                onClose={() => { setShowEditUtility({ ...showEditUtility, visible: false }); onRefresh(true); }}
                bill={bill}
                unit={unit}
                type={showEditUtility.type}
            />
            <ConfirmationModal
                visible={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={confirmResetBill}
                title="Reset Future Bills?"
                message="This will delete all future bill data (payments, expenses, readings) from this month onwards. This cannot be undone."
                confirmText="Delete"
                variant="danger"
                loading={isReseting}
            />
            <ConfirmationModal
                visible={showVirtualBillWarning}
                onClose={() => {
                    setShowVirtualBillWarning(false);
                    setPendingVirtualAction(null);
                }}
                onConfirm={handleConfirmVirtualAction}
                title="Modify Future Month?"
                message="You're editing a future month. This will save your changes and lock all previous months."
                confirmText="Proceed"
                variant="danger"
                loading={isPersistingVirtual}
            />
        </View >
    );
}, (prevProps: RentBillCardProps, nextProps: RentBillCardProps) => {
    // Custom comparison to prevent re-renders when parent states change
    const prevBill = prevProps.item.bill;
    const nextBill = nextProps.item.bill;
    return (
        prevBill?.id === nextBill?.id &&
        prevBill?.updated_at?.getTime() === nextBill?.updated_at?.getTime() &&
        prevProps.item.hasFuturePersistedBills === nextProps.item.hasFuturePersistedBills &&
        prevProps.period.start === nextProps.period.start &&
        prevProps.viewingMonth === nextProps.viewingMonth &&
        prevProps.viewingYear === nextProps.viewingYear
    );
});

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
    lockMessage: {
        fontSize: 10,
        color: theme.colors.danger,
        marginTop: 4,
        fontWeight: '600',
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
    meterHintText: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 4,
        fontStyle: 'italic',
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

export default RentBillCard;
