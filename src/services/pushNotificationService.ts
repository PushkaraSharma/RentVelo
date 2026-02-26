import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Lazily configure notification handler to avoid accessing native modules
// before the JSI runtime is ready (which causes "Cannot read property 'prototype' of undefined")
let isHandlerConfigured = false;
const ensureNotificationHandler = () => {
    if (isHandlerConfigured) return;
    isHandlerConfigured = true;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
    ensureNotificationHandler();
    if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return true;
};

// Schedule a local notification
export const scheduleLocalNotification = async (
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
) => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return null;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                data: data || {},
            },
            trigger,
        });

        return id;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
};

// Cancel a scheduled notification
export const cancelScheduledNotification = async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
};

// Cancel all scheduled notifications
export const cancelAllScheduledNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

import { getDb } from '../db';
import { rentBills, properties } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { storage } from '../utils/storage';

const PREFS_KEY = '@notification_prefs';

export const syncNotificationSchedules = async () => {
    try {
        console.log('[PushNotifications] Starting schedule sync...');
        // 1. Clear any existing scheduled notifications
        await cancelAllScheduledNotifications();

        // 2. Read Preferences
        const stored = storage.getString(PREFS_KEY);
        if (!stored) {
            console.log('[PushNotifications] No preferences found, aborting sync.');
            return;
        }

        const prefs = JSON.parse(stored);
        if (!prefs.enableAll) {
            console.log('[PushNotifications] Notifications globally disabled by user.');
            return;
        }

        const prefTime = new Date(prefs.notificationTime || new Date().setHours(9, 0, 0, 0));
        const targetHour = prefTime.getHours();
        const targetMinute = prefTime.getMinutes();

        // 3. Fetch Actionable Bills
        const db = getDb();
        const allPendingBills = await db.select({
            id: rentBills.id,
            property_id: rentBills.property_id,
            propertyName: properties.name,
            month: rentBills.month,
            year: rentBills.year,
            paid_amount: rentBills.paid_amount,
            status: rentBills.status,
        })
            .from(rentBills)
            .innerJoin(properties, eq(rentBills.property_id, properties.id))
            .where(or(eq(rentBills.status, 'pending'), eq(rentBills.status, 'partial')));

        const actionableBills = allPendingBills.filter(b => {
            if (!prefs.notifyAllPending && (b.paid_amount || 0) > 0) return false;
            return true;
        });

        console.log(`[PushNotifications] Found ${actionableBills.length} actionable bills pending/partial.`);
        if (actionableBills.length === 0) return;

        // 4. Determine Future Triggers
        const now = new Date();
        const schedules = new Map<string, { date: Date; propertyName: string; propertyId: number; due: boolean; overdue: boolean }>();

        actionableBills.forEach(bill => {
            // Rent is due on the 1st of the bill's month/year
            const dueDate = new Date(bill.year, bill.month - 1, 1);
            const pName = bill.propertyName || 'Property';

            // Pre-notifications (Rent Due soon)
            if (prefs.rentDueEnabled && prefs.rentDueDaysBefore > 0) {
                for (let i = prefs.rentDueDaysBefore; i >= 1; i--) {
                    const notifyDate = new Date(dueDate);
                    notifyDate.setDate(dueDate.getDate() - i);
                    notifyDate.setHours(targetHour, targetMinute, 0, 0);

                    if (notifyDate > now) {
                        const key = `${notifyDate.toISOString()}_${bill.property_id}`;
                        if (!schedules.has(key)) schedules.set(key, { date: notifyDate, propertyName: pName, propertyId: bill.property_id, due: false, overdue: false });
                        schedules.get(key)!.due = true;
                    }
                }
            }

            // Overdue notifications (After 1st)
            if (prefs.overdueEnabled && prefs.overdueDaysAfter > 0) {
                for (let i = 1; i <= prefs.overdueDaysAfter; i++) {
                    const notifyDate = new Date(dueDate);
                    notifyDate.setDate(dueDate.getDate() + i);
                    notifyDate.setHours(targetHour, targetMinute, 0, 0);

                    if (notifyDate > now) {
                        const key = `${notifyDate.toISOString()}_${bill.property_id}`;
                        if (!schedules.has(key)) schedules.set(key, { date: notifyDate, propertyName: pName, propertyId: bill.property_id, due: false, overdue: false });
                        schedules.get(key)!.overdue = true;
                    }
                }
            }
        });

        // 5. Schedule OS Notifications
        let scheduledCount = 0;
        // iOS limits to 64 local notifications, keep a buffer
        for (const info of schedules.values()) {
            if (scheduledCount >= 60) break;

            if (info.due) {
                await scheduleLocalNotification(
                    'Upcoming Rent Collection',
                    `Rent collection is coming up for ${info.propertyName}.`,
                    { type: 'date', date: info.date } as any,
                    { route: 'TakeRent', propertyId: info.propertyId }
                );
                scheduledCount++;
            }

            if (info.overdue && scheduledCount < 60) {
                await scheduleLocalNotification(
                    'Overdue Rent',
                    `You have pending rent collections for ${info.propertyName}. Tap to collect.`,
                    { type: 'date', date: info.date } as any,
                    { route: 'TakeRent', propertyId: info.propertyId }
                );
                scheduledCount++;
            }
        }

        console.log(`[PushNotifications] Successfully queued ${scheduledCount} local notifications.`);

        // Debug: Print what the OS actually holds
        // const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        // console.log(`[PushNotifications] OS currently holds ${scheduled.length} scheduled notifications.`);
        // if (scheduled.length > 0) {
        //     console.log('[PushNotifications] Next few scheduled times:');
        //     scheduled.slice(0, 3).forEach((n, i) => {
        //         const trigger = n.trigger as any;
        //         if (trigger?.date || trigger?.value) {
        //             console.log(`  ${i + 1}: ${new Date(trigger.date || trigger.value).toLocaleString()}`);
        //         } else {
        //             console.log(`  ${i + 1}: ${JSON.stringify(trigger)}`);
        //         }
        //     });
        // }

    } catch (error) {
        console.error('[PushNotifications] Failed to sync notification schedules', error);
    }
};
