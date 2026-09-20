import * as FileSystem from 'expo-file-system/legacy';
import { DevSettings } from 'react-native';
import { zip, unzip } from 'react-native-zip-archive';
import * as Updates from 'expo-updates';
import { getGoogleTokens, isSignedIn, requestDriveScopes } from './googleAuthService';
import { closeDatabase, syncDatabaseSchema } from '../db/database';
import { storage } from '../utils/storage';

/**
 * Note: Our sqlite database is named `rentvelo.db` and is located in the document directory.
 */
const DB_NAME = 'rentvelo.db';
const BACKUP_FILE_NAME = 'rentvelo_backup.zip';
const IMAGES_DIR_NAME = 'RentVeloImages';

export const BACKUP_KEYS = {
    AUTO_ENABLED: '@auto_backup_enabled',
    AUTO_LAST_SUCCESS: '@auto_last_backup_time',
    LAST_BACKUP: '@last_backup_time',
    DRIVE_MODIFIED: '@drive_last_backup_time',
    DIRTY: '@backup_dirty',
    LAST_ERROR: '@auto_last_backup_error',
    LAST_ATTEMPT: '@auto_last_backup_attempt',
    PERM_FAILS: '@auto_backup_perm_fails',
    RESTORE_PROMPT: '@restore_prompt_shown',
    NUDGE_DISMISSED: '@backup_nudge_dismissed',
} as const;

export type BackupResult = { success: boolean; error?: string };

export type DriveBackupInfo = {
    id: string;
    modifiedTime?: string;
    size?: string;
};

const getDbPath = () => {
    return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
};

const getImagesPath = () => {
    return `${FileSystem.documentDirectory}${IMAGES_DIR_NAME}`;
};

let restoreDecisionPending = false;

export const setRestoreDecisionPending = (pending: boolean) => {
    restoreDecisionPending = pending;
};

export const isRestoreDecisionPending = () => restoreDecisionPending;

export const markBackupDirty = () => {
    try {
        storage.set(BACKUP_KEYS.DIRTY, 'true');
    } catch (e) {
        console.warn('Failed to mark backup dirty', e);
    }
};

export const clearBackupDirty = () => {
    try {
        storage.remove(BACKUP_KEYS.DIRTY);
    } catch {
        // ignore
    }
};

export const isBackupDirty = (): boolean => {
    return storage.getString(BACKUP_KEYS.DIRTY) === 'true';
};

export const isAutoBackupEnabled = (): boolean => {
    return storage.getString(BACKUP_KEYS.AUTO_ENABLED) === 'true';
};

export const setAutoBackupEnabled = (enabled: boolean) => {
    storage.set(BACKUP_KEYS.AUTO_ENABLED, String(enabled));
};

export const persistLocalBackupTime = (iso: string) => {
    storage.set(BACKUP_KEYS.LAST_BACKUP, iso);
    storage.set(BACKUP_KEYS.AUTO_LAST_SUCCESS, iso);
};

export const persistDriveBackupMeta = (info: DriveBackupInfo | null) => {
    if (info?.modifiedTime) {
        storage.set(BACKUP_KEYS.DRIVE_MODIFIED, info.modifiedTime);
        storage.set(BACKUP_KEYS.LAST_BACKUP, info.modifiedTime);
    }
};

export const getCachedDriveBackupTime = (): string | undefined => {
    return storage.getString(BACKUP_KEYS.DRIVE_MODIFIED) || storage.getString(BACKUP_KEYS.LAST_BACKUP);
};

export const formatBackupTime = (iso?: string | null): string => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString();
};

export const restorePromptKey = (email: string, info: DriveBackupInfo) => {
    return `${email}|${info.id}|${info.modifiedTime || ''}`;
};

export const wasRestorePromptHandled = (email: string, info: DriveBackupInfo): boolean => {
    return storage.getString(BACKUP_KEYS.RESTORE_PROMPT) === restorePromptKey(email, info);
};

export const markRestorePromptHandled = (email: string, info: DriveBackupInfo) => {
    storage.set(BACKUP_KEYS.RESTORE_PROMPT, restorePromptKey(email, info));
};

export const clearBackupSessionFlags = () => {
    storage.remove(BACKUP_KEYS.AUTO_ENABLED);
    storage.remove(BACKUP_KEYS.AUTO_LAST_SUCCESS);
    storage.remove(BACKUP_KEYS.LAST_BACKUP);
    storage.remove(BACKUP_KEYS.DRIVE_MODIFIED);
    storage.remove(BACKUP_KEYS.DIRTY);
    storage.remove(BACKUP_KEYS.LAST_ERROR);
    storage.remove(BACKUP_KEYS.LAST_ATTEMPT);
    storage.remove(BACKUP_KEYS.PERM_FAILS);
};

export const onDriveDisconnected = () => {
    setAutoBackupEnabled(false);
    storage.remove(BACKUP_KEYS.LAST_ERROR);
    storage.remove(BACKUP_KEYS.PERM_FAILS);
    storage.remove(BACKUP_KEYS.DRIVE_MODIFIED);
};

export const applyDriveAccessGranted = () => {
    setAutoBackupEnabled(true);
    storage.set(BACKUP_KEYS.PERM_FAILS, '0');
    storage.remove(BACKUP_KEYS.LAST_ERROR);
};

export const recordAutoBackupAttempt = () => {
    storage.set(BACKUP_KEYS.LAST_ATTEMPT, new Date().toISOString());
};

export const recordAutoBackupError = (error: string) => {
    storage.set(BACKUP_KEYS.LAST_ERROR, error);
};

export const clearAutoBackupError = () => {
    storage.remove(BACKUP_KEYS.LAST_ERROR);
};

export const incrementPermissionFailures = (): number => {
    const next = Number(storage.getString(BACKUP_KEYS.PERM_FAILS) || '0') + 1;
    storage.set(BACKUP_KEYS.PERM_FAILS, String(next));
    return next;
};

/**
 * Request Drive appData if needed and verify with a real list call.
 */
export const ensureDriveAccess = async (): Promise<boolean> => {
    if (await verifyDrivePermissions()) return true;
    const requested = await requestDriveScopes();
    if (!requested) return false;
    return verifyDrivePermissions();
};

/**
 * Prepare a temporary directory containing the DB and images, then zip it.
 * Returns the path to the newly created .zip file.
 */
const createBackupZip = async (): Promise<string | null> => {
    try {
        const dbPath = getDbPath();
        const imagesPath = getImagesPath();
        const tempBackupDir = `${FileSystem.cacheDirectory}BackupStaging/`;
        const zipPath = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}`;

        const stagingInfo = await FileSystem.getInfoAsync(tempBackupDir);
        if (stagingInfo.exists) {
            await FileSystem.deleteAsync(tempBackupDir, { idempotent: true });
        }
        await FileSystem.makeDirectoryAsync(tempBackupDir, { intermediates: true });

        const dbExists = await FileSystem.getInfoAsync(dbPath);
        if (dbExists.exists) {
            await FileSystem.copyAsync({ from: dbPath, to: `${tempBackupDir}${DB_NAME}` });
        } else {
            console.error('Database file not found for backup');
            return null;
        }

        const imgExists = await FileSystem.getInfoAsync(imagesPath);
        if (imgExists.exists) {
            await FileSystem.copyAsync({ from: imagesPath, to: `${tempBackupDir}${IMAGES_DIR_NAME}` });
        }

        await zip(tempBackupDir, zipPath);
        await FileSystem.deleteAsync(tempBackupDir, { idempotent: true });

        return zipPath;
    } catch (error) {
        console.error('Error creating backup zip:', error);
        return null;
    }
};

/**
 * Perform a local backup by zipping the DB and images to the document directory.
 */
export const performLocalBackup = async (): Promise<BackupResult> => {
    try {
        const zipPath = await createBackupZip();
        if (!zipPath) return { success: false, error: 'zip_failed' };

        const finalBackupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;

        await FileSystem.copyAsync({
            from: zipPath,
            to: finalBackupPath,
        });

        const now = new Date().toISOString();
        persistLocalBackupTime(now);
        clearBackupDirty();
        return { success: true };
    } catch (error) {
        console.error('Local backup failed:', error);
        return { success: false, error: 'local_backup_failed' };
    }
};

const throwIfInsufficientPermissions = (response: Response, data: any) => {
    if (
        response.status === 403 ||
        data?.error?.code === 403 ||
        data?.error?.message?.includes('Insufficient Permission') ||
        data?.error?.errors?.[0]?.reason === 'insufficientPermissions'
    ) {
        throw new Error('insufficient_permissions');
    }
};

/**
 * Searches for an existing backup file in the user's Google Drive appDataFolder.
 */
export const findExistingBackup = async (accessToken: string): Promise<DriveBackupInfo | null> => {
    try {
        const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime,size)&orderBy=${encodeURIComponent('modifiedTime desc')}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        const data = await response.json();

        if (!response.ok) {
            throwIfInsufficientPermissions(response, data);
            console.error('Drive API Error:', data.error);
            return null;
        }

        const files = data.files || [];
        if (files.length > 0) {
            const info: DriveBackupInfo = {
                id: files[0].id,
                modifiedTime: files[0].modifiedTime,
                size: files[0].size,
            };
            persistDriveBackupMeta(info);
            return info;
        }
        return null;
    } catch (error: any) {
        console.error('Error finding backup file:', error);
        if (error.message === 'insufficient_permissions') throw error;
        return null;
    }
};

const findExistingBackupFileId = async (accessToken: string): Promise<string | null> => {
    const info = await findExistingBackup(accessToken);
    return info?.id ?? null;
};

const fetchBackupFileMeta = async (accessToken: string, fileId: string): Promise<DriveBackupInfo | null> => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,modifiedTime,size`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        const data = await response.json();
        if (!response.ok) return { id: fileId };
        const info: DriveBackupInfo = {
            id: data.id || fileId,
            modifiedTime: data.modifiedTime,
            size: data.size,
        };
        persistDriveBackupMeta(info);
        return info;
    } catch {
        return { id: fileId };
    }
};

export const getDriveBackupInfo = async (): Promise<DriveBackupInfo | null> => {
    const isUserSignedIn = await isSignedIn();
    if (!isUserSignedIn) return null;
    const tokens = await getGoogleTokens();
    if (!tokens?.accessToken) return null;
    try {
        return await findExistingBackup(tokens.accessToken);
    } catch (err: any) {
        if (err.message === 'insufficient_permissions') throw err;
        return null;
    }
};

const uploadZipToDrive = async (accessToken: string, zipPath: string, existingFileId?: string | null): Promise<string | null> => {
    let fileId = existingFileId || null;

    if (!fileId) {
        const metaResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: BACKUP_FILE_NAME,
                parents: ['appDataFolder'],
            }),
        });
        const metaData = await metaResponse.json();
        if (!metaResponse.ok) {
            throwIfInsufficientPermissions(metaResponse, metaData);
            console.error('Drive file create failed:', metaData);
            return null;
        }
        fileId = metaData.id;
    }

    if (!fileId) return null;

    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, zipPath, {
        httpMethod: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/zip',
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
        if (uploadResult.status === 403) {
            throw new Error('insufficient_permissions');
        }
        console.error('Drive upload failed:', uploadResult.status, uploadResult.body);
        return null;
    }

    return fileId;
};

/**
 * Uploads the database to Google Drive (appDataFolder).
 */
export const backupToGoogleDrive = async (): Promise<BackupResult> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            console.log('User must be signed in to backup to Drive.');
            return { success: false, error: 'not_signed_in' };
        }

        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) {
            console.log('No access token available');
            return { success: false, error: 'no_token' };
        }

        const zipPath = await createBackupZip();
        if (!zipPath) {
            console.error('Finished creating backup zip but got null');
            return { success: false, error: 'zip_failed' };
        }

        let existingFileId: string | null = null;
        try {
            existingFileId = await findExistingBackupFileId(tokens.accessToken);
        } catch (err: any) {
            if (err.message === 'insufficient_permissions') {
                return { success: false, error: 'insufficient_permissions' };
            }
            return { success: false, error: 'api_error' };
        }

        let fileId: string | null;
        try {
            fileId = await uploadZipToDrive(tokens.accessToken, zipPath, existingFileId);
        } catch (err: any) {
            if (err.message === 'insufficient_permissions') {
                return { success: false, error: 'insufficient_permissions' };
            }
            return { success: false, error: 'upload_failed' };
        }

        if (!fileId) {
            return { success: false, error: 'upload_failed' };
        }

        const now = new Date().toISOString();
        persistLocalBackupTime(now);
        await fetchBackupFileMeta(tokens.accessToken, fileId);
        clearBackupDirty();
        clearAutoBackupError();
        return { success: true };
    } catch (error) {
        console.error('Backup to Google Drive failed:', error);
        return { success: false, error: 'unknown_error' };
    }
};

/**
 * Shared helper to extract and apply generic zip structure back to DB & Images
 */
const extractAndApplyBackup = async (zipPath: string, extractTargetPath: string) => {
    const stagingInfo = await FileSystem.getInfoAsync(extractTargetPath);
    if (stagingInfo.exists) {
        await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(extractTargetPath, { intermediates: true });

    await unzip(zipPath, extractTargetPath);

    closeDatabase();

    const dbPath = getDbPath();
    const extractedDbPath = `${extractTargetPath}${DB_NAME}`;

    const extractedDbInfo = await FileSystem.getInfoAsync(extractedDbPath);
    if (extractedDbInfo.exists) {
        const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
        const sqliteInfo = await FileSystem.getInfoAsync(sqliteDir);
        if (!sqliteInfo.exists) {
            await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
        }

        await FileSystem.copyAsync({
            from: extractedDbPath,
            to: dbPath,
        });
    }

    const imagesPath = getImagesPath();
    const extractedImgPath = `${extractTargetPath}${IMAGES_DIR_NAME}`;
    const extractedImgInfo = await FileSystem.getInfoAsync(extractedImgPath);

    const destImgInfo = await FileSystem.getInfoAsync(imagesPath);
    if (destImgInfo.exists) {
        await FileSystem.deleteAsync(imagesPath, { idempotent: true });
    }
    if (extractedImgInfo.exists) {
        await FileSystem.copyAsync({
            from: extractedImgPath,
            to: imagesPath,
        });
    }

    await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
};

/**
 * Restores the DB from Google Drive.
 */
export const restoreFromGoogleDrive = async (): Promise<BackupResult> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            return { success: false, error: 'not_signed_in' };
        }

        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) return { success: false, error: 'no_token' };

        let fileId: string | null;
        try {
            fileId = await findExistingBackupFileId(tokens.accessToken);
        } catch (err: any) {
            if (err.message === 'insufficient_permissions') {
                return { success: false, error: 'insufficient_permissions' };
            }
            return { success: false, error: 'api_error' };
        }

        if (!fileId) {
            console.log('No backup file found on Drive');
            return { success: false, error: 'no_backup_found' };
        }

        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const targetZipPath = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}_restored.zip`;
        const extractTargetPath = `${FileSystem.cacheDirectory}RestoreStaging/`;

        const downloadResult = await FileSystem.downloadAsync(
            url,
            targetZipPath,
            { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );

        if (downloadResult.status !== 200) {
            console.error('Drive download failed:', downloadResult.status);
            return { success: false, error: 'download_failed' };
        }

        await extractAndApplyBackup(targetZipPath, extractTargetPath);
        await FileSystem.deleteAsync(targetZipPath, { idempotent: true });

        return { success: true };
    } catch (error) {
        console.error('Restore from Google Drive failed:', error);
        try {
            syncDatabaseSchema(true);
        } catch {
            // reopen best-effort
        }
        return { success: false, error: 'unknown_error' };
    }
};

/**
 * Returns false when the app could not restart itself, so the caller must ask
 * the user to reopen the app for the restored data to load.
 */
export const reloadAppAfterRestore = async (): Promise<boolean> => {
    if (__DEV__) {
        // expo-updates refuses to reload in dev; the dev client reloads the bundle instead.
        DevSettings.reload();
        return true;
    }
    try {
        await Updates.reloadAsync();
        return true;
    } catch (e) {
        console.error('Failed to reload app after restore', e);
        return false;
    }
};

export const completeRestoreFromDrive = async (): Promise<BackupResult> => {
    const result = await restoreFromGoogleDrive();
    if (result.success) {
        syncDatabaseSchema(true);
        clearBackupDirty();
    }
    return result;
};

/**
 * Verifies if Google Drive permissions are granted.
 */
export const verifyDrivePermissions = async (): Promise<boolean> => {
    try {
        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) return false;
        const q = encodeURIComponent(`name='test_permissions' and 'appDataFolder' in parents`);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        const data = await response.json();
        if (
            !response.ok &&
            (response.status === 403 ||
                data.error?.code === 403 ||
                data.error?.message?.includes('Insufficient Permission') ||
                data.error?.errors?.[0]?.reason === 'insufficientPermissions')
        ) {
            return false;
        }
        return response.ok;
    } catch (e) {
        return false;
    }
};

/**
 * Restores the DB from local backup.
 */
export const restoreFromLocalBackup = async (): Promise<BackupResult> => {
    try {
        const finalBackupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;
        const info = await FileSystem.getInfoAsync(finalBackupPath);
        if (!info.exists) {
            console.log('No local backup found');
            return { success: false, error: 'no_local_backup_found' };
        }

        const extractTargetPath = `${FileSystem.cacheDirectory}RestoreStaging/`;
        await extractAndApplyBackup(finalBackupPath, extractTargetPath);
        syncDatabaseSchema(true);
        return { success: true };
    } catch (e) {
        console.error('Local restore failed:', e);
        try {
            syncDatabaseSchema(true);
        } catch {
            // reopen best-effort
        }
        return { success: false, error: 'local_restore_failed' };
    }
};

/**
 * Deletes the backup file from Google Drive (appDataFolder).
 */
export const deleteBackupFromDrive = async (): Promise<BackupResult> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) return { success: false, error: 'not_signed_in' };

        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) return { success: false, error: 'no_token' };

        const fileId = await findExistingBackupFileId(tokens.accessToken);
        if (!fileId) return { success: true };

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        });

        if (!response.ok && response.status !== 404) {
            const err = await response.text();
            console.error('Drive delete failed:', err);
            return { success: false, error: 'delete_failed' };
        }

        storage.remove(BACKUP_KEYS.DRIVE_MODIFIED);
        return { success: true };
    } catch (error) {
        console.error('Delete backup from Google Drive failed:', error);
        return { success: false, error: 'unknown_error' };
    }
};
