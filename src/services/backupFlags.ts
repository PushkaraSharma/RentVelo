import { storage } from '../utils/storage';

export const BACKUP_KEYS = {
    CONSENT_RESOLVED: '@cloud_backup_consent_resolved',
    OPTED_IN: '@cloud_backup_opted_in',
    RESTORE_PENDING: '@restore_offer_pending',
    AUTO_ENABLED: '@auto_backup_enabled',
    AUTO_LAST: '@auto_last_backup_time',
    LAST: '@last_backup_time',
    DIRTY: '@backup_dirty',
    BANNER_DISMISSED_AT: '@sync_banner_dismissed_at',
    LAST_ERROR: '@backup_last_error',
} as const;

const BANNER_REDISMISS_MS = 3 * 24 * 60 * 60 * 1000;

export const markBackupDirty = () => {
    storage.set(BACKUP_KEYS.DIRTY, 'true');
};

export const clearBackupDirty = () => {
    storage.set(BACKUP_KEYS.DIRTY, 'false');
};

export const isBackupDirty = () => storage.getString(BACKUP_KEYS.DIRTY) === 'true';

export const isAutoBackupEnabled = () => storage.getString(BACKUP_KEYS.AUTO_ENABLED) === 'true';

export const setAutoBackupEnabled = (enabled: boolean) => {
    storage.set(BACKUP_KEYS.AUTO_ENABLED, String(enabled));
};

export const isCloudBackupOptedIn = () => storage.getString(BACKUP_KEYS.OPTED_IN) === 'true';

export const setCloudBackupOptedIn = (optedIn: boolean) => {
    storage.set(BACKUP_KEYS.OPTED_IN, String(optedIn));
};

export const recordBackupSuccess = () => {
    const now = new Date().toISOString();
    storage.set(BACKUP_KEYS.LAST, now);
    storage.set(BACKUP_KEYS.AUTO_LAST, now);
    storage.remove(BACKUP_KEYS.LAST_ERROR);
    clearBackupDirty();
};

export const recordBackupFailure = (error: string) => {
    storage.set(BACKUP_KEYS.LAST_ERROR, error);
};

export const getLastBackupTime = () => storage.getString(BACKUP_KEYS.LAST) ?? null;

export const getLastBackupError = () => storage.getString(BACKUP_KEYS.LAST_ERROR) ?? null;

export const dismissSyncBanner = () => {
    storage.set(BACKUP_KEYS.BANNER_DISMISSED_AT, new Date().toISOString());
};

export const isSyncBannerDismissed = () => {
    const at = storage.getString(BACKUP_KEYS.BANNER_DISMISSED_AT);
    if (!at) return false;
    const elapsed = Date.now() - new Date(at).getTime();
    return Number.isFinite(elapsed) && elapsed < BANNER_REDISMISS_MS;
};
