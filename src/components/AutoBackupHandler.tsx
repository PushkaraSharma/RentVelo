import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { storage } from '../utils/storage';
import { backupToGoogleDrive } from '../services/backupService';
import { isSignedIn } from '../services/googleAuthService';

export default function AutoBackupHandler() {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // Run check on initial load
        checkAndPerformBackup();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App has come to the foreground
                checkAndPerformBackup();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkAndPerformBackup = async () => {
        try {
            const isAutoBackupEnabled = storage.getString('@auto_backup_enabled') === 'true';
            if (!isAutoBackupEnabled) return;

            const isUserSignedIn = await isSignedIn();
            if (!isUserSignedIn) return;

            const lastSyncStr = storage.getString('@auto_last_backup_time');
            const now = new Date();

            if (lastSyncStr) {
                const lastSyncDate = new Date(lastSyncStr);
                const diffTime = Math.abs(now.getTime() - lastSyncDate.getTime());
                const diffHours = diffTime / (1000 * 60 * 60);

                if (diffHours < 24) {
                    return; // Less than 24 hours have passed
                }
            }

            // Perform backup silently
            console.log('Performing silent auto-backup...');
            const result = await backupToGoogleDrive();

            if (result.success) {
                storage.set('@auto_last_backup_time', now.toISOString());
                // Also update the manual sync display time
                storage.set('@last_backup_time', now.toISOString());
                console.log('Auto-backup completed successfully.');
            } else {
                if (result.error === 'insufficient_permissions') {
                    console.warn('Auto-backup skipped: Drive permissions are missing.');
                    // Consider turning off auto backup if permissions are definitely revoked
                    // storage.set('@auto_backup_enabled', 'false');
                } else {
                    console.log('Auto-backup failed quietly:', result.error);
                }
            }
        } catch (error) {
            console.error('Error in AutoBackupHandler:', error);
        }
    };

    return null;
}
