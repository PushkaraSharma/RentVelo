import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Crashlytics service for RentVelo.
 *
 * - In dev builds, errors are only logged to console.
 * - In production, errors are sent to Firebase Crashlytics dashboard.
 * - User identity is automatically linked via the email set in setAnalyticsUser().
 */

/**
 * Set the user identifier for crash reports.
 * Call on login so crashes are linked to specific users.
 */
export const setCrashlyticsUser = async (user: { email: string; name: string } | null) => {
    if (__DEV__) return;
    try {
        if (user) {
            await crashlytics().setUserId(user.email);
            await crashlytics().setAttributes({
                email: user.email,
                name: user.name,
            });
        } else {
            await crashlytics().setUserId('');
        }
    } catch (error) {
        console.debug('[Crashlytics] Failed to set user:', error);
    }
};

/**
 * Log a non-fatal error to Crashlytics.
 * Use this in catch blocks for important operations
 * (backup, payment, import, etc.) where you want visibility
 * but don't want to crash the app.
 */
export const logCrashlyticsError = (error: Error, context?: string) => {
    if (__DEV__) {
        console.error(`[Crashlytics:DEV] ${context || 'Error'}:`, error);
        return;
    }
    try {
        if (context) {
            crashlytics().log(context);
        }
        crashlytics().recordError(error);
    } catch (e) {
        console.debug('[Crashlytics] Failed to record error:', e);
    }
};

/**
 * Log a breadcrumb message for debugging.
 * These appear in the Crashlytics timeline before a crash.
 */
export const logCrashlyticsBreadcrumb = (message: string) => {
    if (__DEV__) return;
    try {
        crashlytics().log(message);
    } catch (error) {
        // Silently ignore
    }
};

/**
 * Enable/disable Crashlytics collection.
 * Respects the same dev guard as analytics.
 */
export const initCrashlytics = async () => {
    try {
        if (__DEV__) {
            await crashlytics().setCrashlyticsCollectionEnabled(false);
            console.log('[Crashlytics:DEV] Collection disabled in dev');
        } else {
            await crashlytics().setCrashlyticsCollectionEnabled(true);
        }
    } catch (error) {
        console.debug('[Crashlytics] Init failed:', error);
    }
};
