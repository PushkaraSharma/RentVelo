import { getAnalytics, logEvent, logScreenView, setUserProperty, setUserId } from '@react-native-firebase/analytics';

const analytics = getAnalytics();

/**
 * Analytics event names for RentVelo pilot.
 * These events help us track feature adoption and user engagement
 * without any user data leaving the device — Firebase Analytics
 * handles aggregation on Google's infra.
 */
export const AnalyticsEvents = {
    // Auth
    SIGN_IN: 'sign_in',
    SIGN_OUT: 'sign_out',

    // Properties
    PROPERTY_ADDED: 'property_added',
    PROPERTY_DELETED: 'property_deleted',

    // Units/Rooms
    UNIT_ADDED: 'unit_added',

    // Tenants
    TENANT_ADDED: 'tenant_added',
    TENANT_REMOVED: 'tenant_removed',

    // Rent & Payments
    RENT_COLLECTED: 'rent_collected',
    RENT_REMINDER_SENT: 'rent_reminder_sent',
    RENT_RECEIPT_GENERATED: 'rent_receipt_generated',

    // Backup
    BACKUP_CREATED: 'backup_created',
    BACKUP_RESTORED: 'backup_restored',
    AUTO_BACKUP_TOGGLED: 'auto_backup_toggled',

    // Utilities
    METER_READING_SAVED: 'meter_reading_saved',

    // Calculator
    RENT_CALCULATOR_USED: 'rent_calculator_used',

    // Settings
    DARK_MODE_TOGGLED: 'dark_mode_toggled',
    NOTIFICATION_TOGGLED: 'notification_toggled',

    // App
    APP_OPENED: 'app_opened',
    SCREEN_VIEWED: 'screen_view',
} as const;

/**
 * Track a custom analytics event.
 * All events are batched and sent by Firebase SDK automatically.
 */
export const trackEvent = async (
    eventName: string,
    params?: Record<string, string | number | boolean>
) => {
    try {
        console.log("logging event", eventName, params);
        await logEvent(analytics, eventName, params);
    } catch (error) {
        // Silently fail — analytics should never crash the app
        console.debug('[Analytics] Failed to track event:', eventName, error);
    }
};

/**
 * Set the current screen name for screen-view tracking.
 */
export const trackScreenView = async (screenName: string) => {
    try {
        await logScreenView(analytics, {
            screen_name: screenName,
            screen_class: screenName,
        });
    } catch (error) {
        console.debug('[Analytics] Failed to track screen:', screenName, error);
    }
};

/**
 * Set user properties for portfolio size.
 * Helps segment "Professional" vs "Casual" landlords.
 */
export const setPortfolioStats = async (stats: { propertyCount: number; tenantCount: number }) => {
    try {
        await setUserProperty(analytics, 'total_properties', stats.propertyCount.toString());
        await setUserProperty(analytics, 'total_tenants', stats.tenantCount.toString());

        // Also bucket them for easier filtering in Google Analytics
        const segment = stats.propertyCount > 5 ? 'professional' : 'casual';
        await setUserProperty(analytics, 'landlord_segment', segment);
    } catch (error) {
        console.debug('[Analytics] Failed to set portfolio stats:', error);
    }
};

/**
 * Identify the user in Firebase Analytics.
 * This links all future events to this specific user ID (email).
 * Call with null on logout to stop tracking that specific ID.
 */
export const setAnalyticsUser = async (user: { email: string; name: string } | null) => {
    try {
        if (user) {
            await setUserId(analytics, user.email);
            await setUserProperty(analytics, 'email', user.email);
            await setUserProperty(analytics, 'name', user.name);
        } else {
            await setUserId(analytics, null);
        }
    } catch (error) {
        console.debug('[Analytics] Failed to set user identity:', error);
    }
};


/**
 * Set user properties for segmentation in Firebase console.
 */
export const setAnalyticsProperties = async (properties: Record<string, string | null>) => {
    try {
        for (const [key, value] of Object.entries(properties)) {
            await setUserProperty(analytics, key, value);
        }
    } catch (error) {
        console.debug('[Analytics] Failed to set user properties:', error);
    }
};

