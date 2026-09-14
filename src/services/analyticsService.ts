import { getAnalytics, logEvent, setUserProperty, setUserId, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

const analytics = getAnalytics();

/**
 * In dev builds, we disable analytics collection entirely so that
 * test events, setUserId, and user properties never reach Google's servers.
 *
 * In production, we explicitly enable collection (overrides the
 * firebase.json `analytics_auto_collection_enabled: false` default).
 *
 * Note: automatic screen_view events are disabled via firebase.json
 * (`google_analytics_automatic_screen_reporting_enabled: false`).
 * We only send screen_view events we explicitly track via trackScreenView().
 */
if (__DEV__) {
    setAnalyticsCollectionEnabled(analytics, false);
} else {
    setAnalyticsCollectionEnabled(analytics, true);
}

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
 * In dev builds, events are only logged to console (never sent to GA).
 */
export const trackEvent = async (
    eventName: string,
    params?: Record<string, string | number | boolean>
) => {
    try {
        if (__DEV__) {
            console.log(`[Analytics:DEV] Event: ${eventName}`, params);
            return;
        }
        await logEvent(analytics, eventName, params);
    } catch (error) {
        // Silently fail — analytics should never crash the app
        console.debug('[Analytics] Failed to track event:', eventName, error);
    }
};

/**
 * Set the current screen name for screen-view tracking.
 * Note: Automatic screen_view events are disabled via firebase.json.
 * Only screens explicitly tracked here will appear in GA.
 */
export const trackScreenView = async (screenName: string) => {
    try {
        if (__DEV__) {
            console.log(`[Analytics:DEV] Screen: ${screenName}`);
            return;
        }
        await logEvent(analytics, 'screen_view', {
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
export const setPortfolioStats = async (stats: { propertyCount: number; tenantCount: number; totalUnits?: number }) => {
    try {
        if (__DEV__) {
            console.log('[Analytics:DEV] Portfolio stats:', stats);
            return;
        }
        await setUserProperty(analytics, 'total_properties', stats.propertyCount.toString());
        await setUserProperty(analytics, 'total_tenants', stats.tenantCount.toString());

        if (stats.totalUnits !== undefined) {
            await setUserProperty(analytics, 'total_units', stats.totalUnits.toString());
        }

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
        if (__DEV__) {
            console.log('[Analytics:DEV] Set user:', user);
            return;
        }
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
        if (__DEV__) {
            console.log('[Analytics:DEV] Set properties:', properties);
            return;
        }
        for (const [key, value] of Object.entries(properties)) {
            await setUserProperty(analytics, key, value);
        }
    } catch (error) {
        console.debug('[Analytics] Failed to set user properties:', error);
    }
};

/**
 * Set enriched user properties for better audience segmentation.
 * Called on login and app open to keep properties fresh.
 *
 * Supported properties:
 *   - auth_method: "google" | "apple"
 *   - platform: "ios" | "android"
 *   - app_version: e.g. "0.0.4_5"
 *   - dark_mode: "true" | "false"
 *   - has_backup: "true" | "false"
 *   - receipt_format: "pdf" | "image" | "ask"
 *   - days_since_signup: e.g. "45"
 */
export const setEnrichedUserProperties = async (props: {
    authMethod?: 'google' | 'apple';
    appVersion?: string;
    darkMode?: boolean;
    hasBackup?: boolean;
    receiptFormat?: string;
    daysSinceSignup?: number;
}) => {
    try {
        if (__DEV__) {
            console.log('[Analytics:DEV] Enriched properties:', props);
            return;
        }
        // Always set platform
        await setUserProperty(analytics, 'platform', Platform.OS);

        if (props.authMethod) {
            await setUserProperty(analytics, 'auth_method', props.authMethod);
        }
        if (props.appVersion) {
            await setUserProperty(analytics, 'app_version', props.appVersion);
        }
        if (props.darkMode !== undefined) {
            await setUserProperty(analytics, 'dark_mode', props.darkMode.toString());
        }
        if (props.hasBackup !== undefined) {
            await setUserProperty(analytics, 'has_backup', props.hasBackup.toString());
        }
        if (props.receiptFormat) {
            await setUserProperty(analytics, 'receipt_format', props.receiptFormat);
        }
        if (props.daysSinceSignup !== undefined) {
            await setUserProperty(analytics, 'days_since_signup', props.daysSinceSignup.toString());
        }
    } catch (error) {
        console.debug('[Analytics] Failed to set enriched properties:', error);
    }
};
