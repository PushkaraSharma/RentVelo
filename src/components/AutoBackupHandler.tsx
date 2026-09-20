import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDispatch } from 'react-redux';
import { unlinkGoogleAccount } from '../redux/authSlice';
import {
    backupToGoogleDrive,
    BACKUP_KEYS,
    clearAutoBackupError,
    incrementPermissionFailures,
    isAutoBackupEnabled,
    isBackupDirty,
    isRestoreDecisionPending,
    recordAutoBackupAttempt,
    recordAutoBackupError,
    setAutoBackupEnabled,
} from '../services/backupService';
import { isSignedIn } from '../services/googleAuthService';
import { storage } from '../utils/storage';
import { AnalyticsEvents, setEnrichedUserProperties, trackEvent } from '../services/analyticsService';

const MIN_INTERVAL_MS = 15 * 60 * 1000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const PERM_FAIL_LIMIT = 3;

export default function AutoBackupHandler() {
    const appState = useRef(AppState.currentState);
    const inFlight = useRef(false);
    const dispatch = useDispatch();

    useEffect(() => {
        checkAndPerformBackup();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                checkAndPerformBackup();
            } else if (
                appState.current === 'active' &&
                nextAppState.match(/inactive|background/)
            ) {
                checkAndPerformBackup();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkAndPerformBackup = async () => {
        if (inFlight.current) return;

        try {
            if (!isAutoBackupEnabled()) return;
            if (isRestoreDecisionPending()) return;

            const isUserSignedIn = await isSignedIn();
            if (!isUserSignedIn) return;

            const lastAttemptStr = storage.getString(BACKUP_KEYS.LAST_ATTEMPT);
            if (lastAttemptStr) {
                const sinceAttempt = Date.now() - new Date(lastAttemptStr).getTime();
                if (sinceAttempt >= 0 && sinceAttempt < MIN_INTERVAL_MS) {
                    return;
                }
            }

            const lastSuccessStr = storage.getString(BACKUP_KEYS.AUTO_LAST_SUCCESS);
            const lastSuccessAge = lastSuccessStr
                ? Date.now() - new Date(lastSuccessStr).getTime()
                : Number.POSITIVE_INFINITY;
            const lastError = storage.getString(BACKUP_KEYS.LAST_ERROR);
            const dirty = isBackupDirty();
            const needsBackup = dirty || !lastSuccessStr || lastSuccessAge >= MAX_AGE_MS || !!lastError;

            if (!needsBackup) return;

            inFlight.current = true;
            recordAutoBackupAttempt();
            console.log('Performing auto-backup...');
            const result = await backupToGoogleDrive();

            if (result.success) {
                clearAutoBackupError();
                trackEvent(AnalyticsEvents.BACKUP_CREATED, { method: 'google_drive_auto' });
                setEnrichedUserProperties({ hasBackup: true });
                console.log('Auto-backup completed successfully.');
            } else if (result.error === 'insufficient_permissions') {
                recordAutoBackupError(result.error);
                trackEvent(AnalyticsEvents.AUTO_BACKUP_FAILED, { error: result.error });
                const fails = incrementPermissionFailures();
                if (fails >= PERM_FAIL_LIMIT) {
                    setAutoBackupEnabled(false);
                    dispatch(unlinkGoogleAccount());
                }
            } else {
                recordAutoBackupError(result.error || 'unknown_error');
                trackEvent(AnalyticsEvents.AUTO_BACKUP_FAILED, { error: result.error || 'unknown_error' });
                console.log('Auto-backup failed:', result.error);
            }
        } catch (error) {
            console.error('Error in AutoBackupHandler:', error);
            recordAutoBackupError('unknown_error');
        } finally {
            inFlight.current = false;
        }
    };

    return null;
}
