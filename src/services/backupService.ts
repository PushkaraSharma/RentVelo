import * as FileSystem from 'expo-file-system/legacy';
import { zip, unzip } from 'react-native-zip-archive';
import { getGoogleTokens, isSignedIn } from './googleAuthService';
import { closeDatabase, getDatabase } from '../db/database';
import { CHANGELOG } from '../utils/Constants';
import { recordBackupFailure, recordBackupSuccess } from './backupFlags';

const DB_NAME = 'rentvelo.db';
const BACKUP_FILE_NAME = 'rentvelo_backup.zip';
const PREV_BACKUP_FILE_NAME = 'rentvelo_backup_prev.zip';
const META_FILE_NAME = 'rentvelo_backup_meta.json';
const IMAGES_DIR_NAME = 'RentVeloImages';
const EMPTY_ZIP_GUARD_BYTES = 10_000;

const getDbPath = () => `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
const getImagesPath = () => `${FileSystem.documentDirectory}${IMAGES_DIR_NAME}`;

export type BackupMeta = {
    updatedAt: string;
    propertyCount: number;
    tenantCount: number;
    sizeBytes?: number;
    appVersion?: string;
    hasCounts: boolean;
};

export type BackupResult = {
    success: boolean;
    error?: string;
    localMeta?: BackupMeta;
    cloudMeta?: BackupMeta;
};

type DriveFileInfo = {
    id: string;
    name: string;
    modifiedTime?: string;
    size?: string;
};

export const getLocalBackupMeta = (): BackupMeta => {
    const expoDb = getDatabase();
    const count = (table: string) => {
        try {
            const rows = expoDb.getAllSync(`SELECT COUNT(*) as c FROM ${table}`) as { c: number }[];
            return rows[0]?.c ?? 0;
        } catch {
            return 0;
        }
    };

    return {
        updatedAt: new Date().toISOString(),
        propertyCount: count('properties'),
        tenantCount: count('tenants'),
        appVersion: CHANGELOG.version,
        hasCounts: true,
    };
};

export const isLocalDatabaseEmpty = (meta: BackupMeta = getLocalBackupMeta()) =>
    meta.propertyCount === 0;

export const formatBackupSummary = (meta: BackupMeta) => {
    const date = new Date(meta.updatedAt);
    const dateLabel = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
    if (!meta.hasCounts) {
        return dateLabel;
    }
    const properties = `${meta.propertyCount} ${meta.propertyCount === 1 ? 'property' : 'properties'}`;
    const tenants = `${meta.tenantCount} ${meta.tenantCount === 1 ? 'tenant' : 'tenants'}`;
    return `${dateLabel} · ${properties} · ${tenants}`;
};

export const shouldBlockUpload = (local: BackupMeta, cloud: BackupMeta | null): boolean => {
    if (!cloud) return false;
    if (local.propertyCount === 0 && cloud.hasCounts && cloud.propertyCount > 0) return true;
    if (local.propertyCount === 0 && !cloud.hasCounts && (cloud.sizeBytes ?? 0) > EMPTY_ZIP_GUARD_BYTES) return true;
    if (cloud.hasCounts && local.propertyCount < cloud.propertyCount) return true;
    if (cloud.hasCounts) {
        const localScore = local.propertyCount * 10 + local.tenantCount;
        const cloudScore = cloud.propertyCount * 10 + cloud.tenantCount;
        if (cloudScore > 0 && localScore < cloudScore * 0.5) return true;
    }
    return false;
};

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

const throwIfInsufficient = (response: Response, data?: any) => {
    if (
        response.status === 403 ||
        data?.error?.code === 403 ||
        data?.error?.message?.includes('Insufficient Permission') ||
        data?.error?.errors?.[0]?.reason === 'insufficientPermissions'
    ) {
        throw new Error('insufficient_permissions');
    }
};

const findDriveFile = async (accessToken: string, fileName: string): Promise<DriveFileInfo | null> => {
    const q = encodeURIComponent(`name='${fileName}' and 'appDataFolder' in parents and trashed=false`);
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)`,
        {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );
    const data = await response.json();
    if (!response.ok) {
        throwIfInsufficient(response, data);
        console.error('Drive API Error:', data.error);
        return null;
    }
    return data.files?.[0] ?? null;
};

const deleteDriveFile = async (accessToken: string, fileId: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok && response.status !== 404) {
        const err = await response.text();
        console.error('Drive delete failed:', err);
        throw new Error('delete_failed');
    }
};

const uploadAppDataFile = async (
    accessToken: string,
    fileName: string,
    mimeType: string,
    contentBase64: string,
    existingId?: string | null
) => {
    const boundary = 'foo_bar_baz';
    const metadata: Record<string, unknown> = { name: fileName };
    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;
        method = 'PATCH';
    } else {
        metadata.parents = ['appDataFolder'];
    }

    const multipartRequestBody =
        `--${boundary}\n` +
        `Content-Type: application/json; charset=UTF-8\n\n` +
        `${JSON.stringify(metadata)}\n` +
        `--${boundary}\n` +
        `Content-Type: ${mimeType}\n` +
        `Content-Transfer-Encoding: base64\n\n` +
        `${contentBase64}\n` +
        `--${boundary}--`;

    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': multipartRequestBody.length.toString(),
        },
        body: multipartRequestBody,
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('Drive upload failed:', err);
        throw new Error('upload_failed');
    }
};

const rotatePreviousBackup = async (accessToken: string, currentFileId: string) => {
    const prev = await findDriveFile(accessToken, PREV_BACKUP_FILE_NAME);
    if (prev) {
        await deleteDriveFile(accessToken, prev.id);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${currentFileId}/copy`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: PREV_BACKUP_FILE_NAME }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.warn('Could not rotate previous Drive backup:', err);
    }
};

const metaFromZipFile = (file: DriveFileInfo): BackupMeta => ({
    updatedAt: file.modifiedTime || new Date().toISOString(),
    propertyCount: 0,
    tenantCount: 0,
    sizeBytes: file.size ? Number(file.size) : undefined,
    hasCounts: false,
});

const downloadDriveFileText = async (accessToken: string, fileId: string): Promise<string | null> => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return response.text();
};

const parseStoredMeta = (raw: string, fallback?: DriveFileInfo): BackupMeta | null => {
    try {
        const parsed = JSON.parse(raw);
        return {
            updatedAt: parsed.updatedAt || fallback?.modifiedTime || new Date().toISOString(),
            propertyCount: Number(parsed.propertyCount) || 0,
            tenantCount: Number(parsed.tenantCount) || 0,
            sizeBytes: parsed.sizeBytes ?? (fallback?.size ? Number(fallback.size) : undefined),
            appVersion: parsed.appVersion,
            hasCounts: true,
        };
    } catch {
        return fallback ? metaFromZipFile(fallback) : null;
    }
};

export const getCloudBackupMeta = async (
    generation: 'current' | 'previous' = 'current'
): Promise<BackupMeta | null> => {
    const tokens = await getGoogleTokens();
    if (!tokens?.accessToken) return null;

    try {
        const zipName = generation === 'previous' ? PREV_BACKUP_FILE_NAME : BACKUP_FILE_NAME;
        const zipFile = await findDriveFile(tokens.accessToken, zipName);
        if (!zipFile) return null;

        if (generation === 'current') {
            const metaFile = await findDriveFile(tokens.accessToken, META_FILE_NAME);
            if (metaFile) {
                const raw = await downloadDriveFileText(tokens.accessToken, metaFile.id);
                if (raw) {
                    return parseStoredMeta(raw, zipFile);
                }
            }
        }

        return metaFromZipFile(zipFile);
    } catch (error: any) {
        if (error.message === 'insufficient_permissions') throw error;
        console.error('Error reading cloud backup meta:', error);
        return null;
    }
};

export const probeCloudBackup = async (): Promise<{
    current: BackupMeta | null;
    previous: BackupMeta | null;
    hasBackup: boolean;
}> => {
    try {
        const [current, previous] = await Promise.all([
            getCloudBackupMeta('current'),
            getCloudBackupMeta('previous'),
        ]);
        return { current, previous, hasBackup: !!current };
    } catch (error: any) {
        if (error.message === 'insufficient_permissions') {
            return { current: null, previous: null, hasBackup: false };
        }
        return { current: null, previous: null, hasBackup: false };
    }
};

export const performLocalBackup = async (): Promise<BackupResult> => {
    try {
        const zipPath = await createBackupZip();
        if (!zipPath) return { success: false, error: 'zip_failed' };

        const finalBackupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;
        await FileSystem.copyAsync({ from: zipPath, to: finalBackupPath });
        return { success: true, localMeta: getLocalBackupMeta() };
    } catch (error) {
        console.error('Local backup failed:', error);
        return { success: false, error: 'local_backup_failed' };
    }
};

export const backupToGoogleDrive = async (options?: { force?: boolean }): Promise<BackupResult> => {
    const localMeta = getLocalBackupMeta();

    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            return { success: false, error: 'not_signed_in', localMeta };
        }

        const tokens = await getGoogleTokens();
        if (!tokens?.accessToken) {
            return { success: false, error: 'no_token', localMeta };
        }

        let cloudMeta: BackupMeta | null = null;
        let existingFile: DriveFileInfo | null = null;
        try {
            existingFile = await findDriveFile(tokens.accessToken, BACKUP_FILE_NAME);
            cloudMeta = await getCloudBackupMeta('current');
        } catch (err: any) {
            if (err.message === 'insufficient_permissions') {
                return { success: false, error: 'insufficient_permissions', localMeta };
            }
            return { success: false, error: 'api_error', localMeta };
        }

        if (!options?.force && shouldBlockUpload(localMeta, cloudMeta)) {
            recordBackupFailure('blocked_empty_local');
            return { success: false, error: 'blocked_empty_local', localMeta, cloudMeta: cloudMeta ?? undefined };
        }

        const zipPath = await createBackupZip();
        if (!zipPath) {
            return { success: false, error: 'zip_failed', localMeta, cloudMeta: cloudMeta ?? undefined };
        }

        const zipInfo = await FileSystem.getInfoAsync(zipPath);
        const sizedMeta: BackupMeta = {
            ...localMeta,
            sizeBytes: zipInfo.exists && 'size' in zipInfo ? Number(zipInfo.size) : undefined,
        };

        if (existingFile) {
            await rotatePreviousBackup(tokens.accessToken, existingFile.id);
        }

        const fileContentBase64 = await FileSystem.readAsStringAsync(zipPath, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const latestZip = await findDriveFile(tokens.accessToken, BACKUP_FILE_NAME);
        await uploadAppDataFile(
            tokens.accessToken,
            BACKUP_FILE_NAME,
            'application/zip',
            fileContentBase64,
            latestZip?.id
        );

        const metaFile = await findDriveFile(tokens.accessToken, META_FILE_NAME);
        const metaBase64 = await FileSystem.readAsStringAsync(
            await writeTempMeta(sizedMeta),
            { encoding: FileSystem.EncodingType.Base64 }
        );
        await uploadAppDataFile(
            tokens.accessToken,
            META_FILE_NAME,
            'application/json',
            metaBase64,
            metaFile?.id
        );

        recordBackupSuccess();
        return { success: true, localMeta: sizedMeta, cloudMeta: sizedMeta };
    } catch (error) {
        console.error('Backup to Google Drive failed:', error);
        recordBackupFailure('unknown_error');
        return { success: false, error: 'unknown_error', localMeta };
    }
};

const writeTempMeta = async (meta: BackupMeta): Promise<string> => {
    const path = `${FileSystem.cacheDirectory}${META_FILE_NAME}`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(meta));
    return path;
};

const extractAndApplyBackup = async (zipPath: string, extractTargetPath: string): Promise<BackupResult> => {
    const stagingInfo = await FileSystem.getInfoAsync(extractTargetPath);
    if (stagingInfo.exists) {
        await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(extractTargetPath, { intermediates: true });

    await unzip(zipPath, extractTargetPath);

    const dbPath = getDbPath();
    const extractedDbPath = `${extractTargetPath}${DB_NAME}`;
    const extractedDbInfo = await FileSystem.getInfoAsync(extractedDbPath);
    if (!extractedDbInfo.exists) {
        await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
        return { success: false, error: 'invalid_backup' };
    }

    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const sqliteInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!sqliteInfo.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    closeDatabase();
    await FileSystem.copyAsync({ from: extractedDbPath, to: dbPath });

    const imagesPath = getImagesPath();
    const extractedImgPath = `${extractTargetPath}${IMAGES_DIR_NAME}`;
    const extractedImgInfo = await FileSystem.getInfoAsync(extractedImgPath);
    if (extractedImgInfo.exists) {
        const destImgInfo = await FileSystem.getInfoAsync(imagesPath);
        if (destImgInfo.exists) {
            await FileSystem.deleteAsync(imagesPath, { idempotent: true });
        }
        await FileSystem.copyAsync({ from: extractedImgPath, to: imagesPath });
    }

    await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
    return { success: true };
};

export const restoreFromGoogleDrive = async (
    generation: 'current' | 'previous' = 'current'
): Promise<BackupResult> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            return { success: false, error: 'not_signed_in' };
        }

        const tokens = await getGoogleTokens();
        if (!tokens?.accessToken) return { success: false, error: 'no_token' };

        const fileName = generation === 'previous' ? PREV_BACKUP_FILE_NAME : BACKUP_FILE_NAME;
        let file: DriveFileInfo | null;
        try {
            file = await findDriveFile(tokens.accessToken, fileName);
        } catch (err: any) {
            if (err.message === 'insufficient_permissions') {
                return { success: false, error: 'insufficient_permissions' };
            }
            return { success: false, error: 'api_error' };
        }

        if (!file) {
            return { success: false, error: generation === 'previous' ? 'no_previous_backup' : 'no_backup_found' };
        }

        const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        const targetZipPath = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}_restored.zip`;
        const extractTargetPath = `${FileSystem.cacheDirectory}RestoreStaging/`;

        const downloadResult = await FileSystem.downloadAsync(url, targetZipPath, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });

        if (downloadResult.status !== 200) {
            return { success: false, error: 'download_failed' };
        }

        const applied = await extractAndApplyBackup(targetZipPath, extractTargetPath);
        await FileSystem.deleteAsync(targetZipPath, { idempotent: true });
        return applied;
    } catch (error) {
        console.error('Restore from Google Drive failed:', error);
        return { success: false, error: 'unknown_error' };
    }
};

export const verifyDrivePermissions = async (): Promise<boolean> => {
    try {
        const tokens = await getGoogleTokens();
        if (!tokens?.accessToken) return false;
        const q = encodeURIComponent(`name='test_permissions' and 'appDataFolder' in parents`);
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${tokens.accessToken}` },
            }
        );
        const data = await response.json();
        if (!response.ok) {
            throwIfInsufficient(response, data);
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

export const restoreFromLocalBackup = async (): Promise<BackupResult> => {
    try {
        const finalBackupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;
        const info = await FileSystem.getInfoAsync(finalBackupPath);
        if (!info.exists) {
            return { success: false, error: 'no_local_backup_found' };
        }

        const extractTargetPath = `${FileSystem.cacheDirectory}RestoreStaging/`;
        return await extractAndApplyBackup(finalBackupPath, extractTargetPath);
    } catch (e) {
        console.error('Local restore failed:', e);
        return { success: false, error: 'local_restore_failed' };
    }
};

export const deleteBackupFromDrive = async (): Promise<BackupResult> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) return { success: false, error: 'not_signed_in' };

        const tokens = await getGoogleTokens();
        if (!tokens?.accessToken) return { success: false, error: 'no_token' };

        const names = [BACKUP_FILE_NAME, PREV_BACKUP_FILE_NAME, META_FILE_NAME];
        for (const name of names) {
            const file = await findDriveFile(tokens.accessToken, name);
            if (file) {
                await deleteDriveFile(tokens.accessToken, file.id);
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Delete backup from Google Drive failed:', error);
        return { success: false, error: 'unknown_error' };
    }
};
