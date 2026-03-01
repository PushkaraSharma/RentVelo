import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { Bell, Calendar, AlertTriangle, Layers, Clock, CheckCircle } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Toggle from '../../components/common/Toggle';
import { storage } from '../../utils/storage';
import { scheduleLocalNotification, syncNotificationSchedules, requestNotificationPermissions } from '../../services/pushNotificationService';
import Slider from '@react-native-community/slider';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useToast } from '../../hooks/useToast';

export const PREFS_KEY = '@notification_prefs';

export interface NotificationPrefs {
    enableAll: boolean;
    rentDueEnabled: boolean;
    rentDueDaysBefore: number;
    overdueEnabled: boolean;
    overdueDaysAfter: number;
    notifyAllPending: boolean; // true = all pending, false = only when nothing is paid
    groupNotifications: boolean;
    notificationTime: Date;
}

const DEFAULT_PREFS: NotificationPrefs = {
    enableAll: true,
    rentDueEnabled: true,
    rentDueDaysBefore: 3,
    overdueEnabled: true,
    overdueDaysAfter: 1,
    notifyAllPending: true,
    groupNotifications: true,
    notificationTime: new Date(new Date().setHours(9, 0, 0, 0)),
};

export default function NotificationsScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        loadPrefs();
    }, []);

    const loadPrefs = () => {
        try {
            const stored = storage.getString(PREFS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Parse date string back to Date object
                if (parsed.notificationTime) {
                    parsed.notificationTime = new Date(parsed.notificationTime);
                }
                setPrefs({ ...DEFAULT_PREFS, ...parsed });
            }
        } catch (e) {
            console.error('Failed to load notification prefs:', e);
        }
    };

    const updatePref = async <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
        try {
            // If enabling notifications, request permission immediately
            if (key === 'enableAll' && value === true) {
                const granted = await requestNotificationPermissions();
                if (!granted) {
                    showToast({
                        type: 'warning',
                        title: 'Permission Required',
                        message: 'Please enable notifications in device settings.'
                    });
                    return;
                }
            }

            const newPrefs = { ...prefs, [key]: value };
            setPrefs(newPrefs);
            storage.set(PREFS_KEY, JSON.stringify(newPrefs));
            // Sync schedules immediately when settings change 
            await syncNotificationSchedules();
        } catch (e) {
            console.error('Failed to save notification pref:', e);
        }
    };

    const onTimeConfirm = (date: Date) => {
        updatePref('notificationTime', date);
        setShowTimePicker(false);
    };

    const handleTestNotification = async () => {
        try {
            const id = await scheduleLocalNotification(
                'Upcoming Rent Collection',
                'Rent collection is coming up for Apartment 101, Apartment 102.',
                {
                    type: 'timeInterval',
                    repeats: false
                } as any
            );
            if (id) {
                showToast({ type: 'success', title: 'Success', message: 'Test notification triggered.' });
            } else {
                showToast({ type: 'error', title: 'Permission Denied', message: 'Please enable notifications in settings.' });
            }
        } catch (e) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to schedule test notification.' });
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Notifications" />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Master Toggle */}
                <View style={[styles.card, { marginBottom: theme.spacing.xl }]}>
                    <View style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Bell size={24} color={theme.colors.accent} />
                            <View>
                                <Text style={[styles.itemLabel, { fontSize: 18, fontWeight: theme.typography.bold }]}>Enable Notifications</Text>
                                <Text style={styles.itemSubLabel}>Master switch for all alerts</Text>
                            </View>
                        </View>
                        <Toggle value={prefs.enableAll} onValueChange={(v) => updatePref('enableAll', v)} />
                    </View>
                </View>

                {prefs.enableAll && (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Reminders & Timing</Text>
                            <View style={styles.card}>
                                {/* Rent Due Reminder */}
                                <View style={styles.item}>
                                    <View style={styles.itemLeft}>
                                        <Calendar size={20} color={theme.colors.accent} />
                                        <View>
                                            <Text style={styles.itemLabel}>Rent Due Reminder</Text>
                                            <Text style={styles.itemSubLabel}>Before due date</Text>
                                        </View>
                                    </View>
                                    <Toggle value={prefs.rentDueEnabled} onValueChange={(v) => updatePref('rentDueEnabled', v)} />
                                </View>
                                {prefs.rentDueEnabled && (
                                    <View style={styles.sliderContainer}>
                                        <Text style={styles.sliderValText}>Notify {prefs.rentDueDaysBefore} day{prefs.rentDueDaysBefore > 1 ? 's' : ''} before</Text>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={1}
                                            maximumValue={10}
                                            step={1}
                                            value={prefs.rentDueDaysBefore}
                                            onSlidingComplete={(v) => updatePref('rentDueDaysBefore', v)}
                                            minimumTrackTintColor={theme.colors.accent}
                                            maximumTrackTintColor={Platform.OS === 'ios' ? 'lightgray' : theme.colors.primary}
                                            thumbTintColor={theme.colors.accent}
                                        />
                                    </View>
                                )}
                                <View style={styles.divider} />

                                {/* Overdue Reminder */}
                                <View style={styles.item}>
                                    <View style={styles.itemLeft}>
                                        <AlertTriangle size={20} color={theme.colors.danger} />
                                        <View>
                                            <Text style={styles.itemLabel}>Overdue Reminder</Text>
                                            <Text style={styles.itemSubLabel}>After due date</Text>
                                        </View>
                                    </View>
                                    <Toggle value={prefs.overdueEnabled} onValueChange={(v) => updatePref('overdueEnabled', v)} />
                                </View>
                                {prefs.overdueEnabled && (
                                    <View style={styles.sliderContainer}>
                                        <Text style={styles.sliderValText}>Notify daily for {prefs.overdueDaysAfter} day{prefs.overdueDaysAfter > 1 ? 's' : ''} after</Text>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={1}
                                            maximumValue={10}
                                            step={1}
                                            value={prefs.overdueDaysAfter}
                                            onSlidingComplete={(v) => updatePref('overdueDaysAfter', v)}
                                            minimumTrackTintColor={theme.colors.danger}
                                            maximumTrackTintColor={Platform.OS === 'ios' ? 'lightgray' : theme.colors.primary}
                                            thumbTintColor={theme.colors.danger}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Payment Status</Text>
                            <View style={styles.card}>
                                <Pressable style={styles.radioItem} onPress={() => updatePref('notifyAllPending', true)}>
                                    <View style={styles.radioLeft}>
                                        <Text style={styles.itemLabel}>Notify for ALL pending</Text>
                                        <Text style={styles.itemSubLabel}>Alert for both partial and full pending</Text>
                                    </View>
                                    <View style={[styles.radioDot, prefs.notifyAllPending && { borderColor: theme.colors.accent }]}>
                                        {prefs.notifyAllPending && <View style={[styles.radioFill, { backgroundColor: theme.colors.accent }]} />}
                                    </View>
                                </Pressable>
                                <View style={styles.divider} />
                                <Pressable style={styles.radioItem} onPress={() => updatePref('notifyAllPending', false)}>
                                    <View style={styles.radioLeft}>
                                        <Text style={styles.itemLabel}>Notify ONLY completely unpaid</Text>
                                        <Text style={styles.itemSubLabel}>Skip if partial payment made</Text>
                                    </View>
                                    <View style={[styles.radioDot, !prefs.notifyAllPending && { borderColor: theme.colors.accent }]}>
                                        {!prefs.notifyAllPending && <View style={[styles.radioFill, { backgroundColor: theme.colors.accent }]} />}
                                    </View>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Preferences</Text>
                            <View style={styles.card}>
                                <View style={styles.item}>
                                    <View style={styles.itemLeft}>
                                        <Layers size={20} color={theme.colors.warning} />
                                        <View>
                                            <Text style={styles.itemLabel}>Group Notifications</Text>
                                            <Text style={styles.itemSubLabel}>Group by Property</Text>
                                        </View>
                                    </View>
                                    <Toggle value={prefs.groupNotifications} onValueChange={(v) => updatePref('groupNotifications', v)} />
                                </View>
                                <View style={styles.divider} />
                                <Pressable style={styles.item} onPress={() => setShowTimePicker(true)}>
                                    <View style={styles.itemLeft}>
                                        <Clock size={20} color={theme.colors.success} />
                                        <View>
                                            <Text style={styles.itemLabel}>Notification Timing</Text>
                                            <Text style={styles.itemSubLabel}>Preferred time</Text>
                                        </View>
                                    </View>
                                    <View style={styles.timeBadge}>
                                        <Text style={styles.timeText}>{formatTime(prefs.notificationTime)}</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </View>

                        <DateTimePickerModal
                            isVisible={showTimePicker}
                            mode="time"
                            date={prefs.notificationTime}
                            onConfirm={onTimeConfirm}
                            onCancel={() => setShowTimePicker(false)}
                            isDarkModeEnabled={isDark}
                        />

                        <Pressable style={styles.testBtn} onPress={handleTestNotification}>
                            <CheckCircle size={20} color={theme.colors.primaryForeground} />
                            <Text style={styles.testBtnText}>Test Notification</Text>
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.m,
        marginLeft: theme.spacing.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
        flex: 1,
    },
    itemLabel: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    itemSubLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border + '50',
    },
    sliderContainer: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
    },
    sliderValText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center'
    },
    slider: {
        width: '100%',
        height: 40,
    },
    radioItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    radioLeft: {
        flex: 1,
        paddingRight: theme.spacing.m,
    },
    radioDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioFill: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    timeBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    timeText: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.xxl,
    },
    testBtnText: {
        color: theme.colors.primaryForeground,
        fontSize: 16,
        fontWeight: theme.typography.bold,
    },
});
