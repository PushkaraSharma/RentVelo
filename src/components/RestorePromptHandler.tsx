import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import ConfirmationModal from './common/ConfirmationModal';
import {
    completeRestoreFromDrive,
    formatBackupTime,
    getDriveBackupInfo,
    markRestorePromptHandled,
    reloadAppAfterRestore,
    setRestoreDecisionPending,
    wasRestorePromptHandled,
    type DriveBackupInfo,
} from '../services/backupService';
import { AnalyticsEvents, trackEvent } from '../services/analyticsService';
import { useToast } from '../hooks/useToast';

export default function RestorePromptHandler() {
    const { isAuthenticated, isGoogleLinked, googleEmail } = useSelector((state: RootState) => state.auth);
    const { showToast } = useToast();
    const [backupInfo, setBackupInfo] = useState<DriveBackupInfo | null>(null);
    const [visible, setVisible] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const checking = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !isGoogleLinked) {
            setVisible(false);
            setBackupInfo(null);
            setRestoreDecisionPending(false);
            return;
        }

        let cancelled = false;
        setRestoreDecisionPending(true);
        checking.current = false;

        const check = async () => {
            if (checking.current) return;
            checking.current = true;
            try {
                const info = await getDriveBackupInfo();
                if (cancelled) return;
                if (!info) {
                    setRestoreDecisionPending(false);
                    return;
                }
                const email = googleEmail || 'google';
                if (wasRestorePromptHandled(email, info)) {
                    setRestoreDecisionPending(false);
                    return;
                }
                setBackupInfo(info);
                setVisible(true);
            } catch (e) {
                console.warn('Restore prompt Drive check failed', e);
                if (!cancelled) setRestoreDecisionPending(false);
            } finally {
                checking.current = false;
            }
        };

        check();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isGoogleLinked, googleEmail]);

    const handleKeep = () => {
        if (backupInfo) {
            markRestorePromptHandled(googleEmail || 'google', backupInfo);
        }
        setRestoreDecisionPending(false);
        setVisible(false);
    };

    const handleRestore = async () => {
        if (!backupInfo) return;
        setRestoring(true);
        const result = await completeRestoreFromDrive();
        setRestoring(false);
        if (result.success) {
            markRestorePromptHandled(googleEmail || 'google', backupInfo);
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: 'login_prompt' });
            setVisible(false);
            const reloaded = await reloadAppAfterRestore();
            if (!reloaded) {
                showToast({
                    type: 'success',
                    title: 'Restored',
                    message: 'Close and reopen RentVelo to load your backup.',
                });
            }
        } else {
            showToast({
                type: 'error',
                title: 'Restore Failed',
                message: result.error === 'no_backup_found'
                    ? 'No backup file was found on Google Drive.'
                    : 'Could not restore data from Google Drive.',
            });
        }
    };

    const timestamp = formatBackupTime(backupInfo?.modifiedTime);

    return (
        <ConfirmationModal
            visible={visible}
            onClose={handleKeep}
            onConfirm={handleRestore}
            title="Backup found"
            message={`A Drive backup from ${timestamp} was found. Restore replaces all rental data and photos on this phone. Keep this device leaves your phone as-is; later backups will update Drive.`}
            confirmText="Restore"
            cancelText="Cancel"
            variant="warning"
            loading={restoring}
        />
    );
}
