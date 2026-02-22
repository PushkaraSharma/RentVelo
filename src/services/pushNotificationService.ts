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
            shouldShowAlert: true,
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
    trigger: Notifications.NotificationTriggerInput
) => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return null;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
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

// Specialized function for Rent Reminders
export const scheduleMonthlyRentReminder = async (dayOfMonth: number): Promise<string | null> => {
    await cancelAllScheduledNotifications(); // Assuming one primary reminder rule for now

    // In expo-notifications, MonthlyTriggerInput allows scheduling on a specific day of month
    // However, it's safer to schedule it for the next occurrence and let background fetch or app open reschedule
    // Or just use the 'monthly' trigger
    return await scheduleLocalNotification(
        'Rent Collection Due',
        'It is time to collect rent for this month. Tap to view pending collections.',
        {
            repeats: true,
            day: dayOfMonth,
            hour: 9, // 9 AM
            minute: 0,
        } as any // Cast to any because TS types for trigger can be strict, but object works
    );
};
