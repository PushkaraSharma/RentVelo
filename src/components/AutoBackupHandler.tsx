import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { backupToGoogleDrive, isLocalDatabaseEmpty } from '../services/backupService';
import { isSignedIn } from '../services/googleAuthService';
import {
    getLastBackupTime,
    isAutoBackupEnabled,
    isBackupDirty,
    recordBackupFailure,
} from '../services/backupFlags';
import { AnalyticsEvents, trackEvent } from '../services/analyticsService';

const MIN_INTERVAL_MS = 5 * 60 * 1000;
const FOREGROUND_INTERVAL_MS = 15 * 60 * 1000;
const PERIODIC_INTERVAL_MS = 30 * 60 * 1000;

let inFlight = false;

const minutesSince = (iso: string | null) => {
    if (!iso) return Number.POSITIVE_INFINITY;
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
    return Date.now() - then;
};

export const performAutoBackupIfNeeded = async (reason: 'launch' | 'background' | 'foreground' | 'periodic') => {
    if (inFlight) return;
    if (!isAutoBackupEnabled()) return;
    if (!isBackupDirty() && reason !== 'launch') return;

    const elapsed = minutesSince(getLastBackupTime());
    if (elapsed < MIN_INTERVAL_MS) return;
    if (reason === 'foreground' && elapsed < FOREGROUND_INTERVAL_MS) return;
    if (reason === 'launch' && !isBackupDirty() && elapsed < 6 * 60 * 60 * 1000) return;

    if (isLocalDatabaseEmpty()) return;

    const signedIn = await isSignedIn();
    if (!signedIn) return;

    inFlight = true;
    try {
        const result = await backupToGoogleDrive();
        if (!result.success) {
            if (result.error === 'blocked_empty_local') {
                recordBackupFailure('blocked_empty_local');
                return;
            }
            recordBackupFailure(result.error || 'unknown_error');
            trackEvent(AnalyticsEvents.AUTO_BACKUP_FAILED, { error: result.error || 'unknown_error', reason });
        }
    } catch (error) {
        console.error('Error in AutoBackupHandler:', error);
        recordBackupFailure('unknown_error');
        trackEvent(AnalyticsEvents.AUTO_BACKUP_FAILED, { error: 'unknown_error', reason });
    } finally {
        inFlight = false;
    }
};

export default function AutoBackupHandler() {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        performAutoBackupIfNeeded('launch');

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            const leaving = appState.current === 'active' && nextAppState.match(/inactive|background/);
            const returning = appState.current.match(/inactive|background/) && nextAppState === 'active';
            appState.current = nextAppState;

            if (leaving) {
                performAutoBackupIfNeeded('background');
            } else if (returning) {
                performAutoBackupIfNeeded('foreground');
            }
        });

        const interval = setInterval(() => {
            performAutoBackupIfNeeded('periodic');
        }, PERIODIC_INTERVAL_MS);

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, []);

    return null;
}
