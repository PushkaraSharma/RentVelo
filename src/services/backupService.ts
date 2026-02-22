import * as FileSystem from 'expo-file-system/legacy';
import { getGoogleTokens, isSignedIn } from './googleAuthService';/**
 * Note: Our sqlite database is named `rentvelo.db` and is located in the document directory.
 */
const DB_NAME = 'rentvelo.db';
const BACKUP_FILE_NAME = 'rentvelo_backup.db';

const getDbPath = () => {
    return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
};

/**
 * Perform a local backup by copying the DB to another file in the document directory.
 */
export const performLocalBackup = async (): Promise<string | null> => {
    try {
        const dbPath = getDbPath();
        const backupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;

        const dbExists = await FileSystem.getInfoAsync(dbPath);
        if (!dbExists.exists) {
            console.error('Database file not found');
            return null;
        }

        await FileSystem.copyAsync({
            from: dbPath,
            to: backupPath,
        });

        console.log(`Local backup successful at ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('Local backup failed:', error);
        return null;
    }
};

/**
 * Searches for an existing backup file in the user's Google Drive appDataFolder.
 */
const findExistingBackupFileId = async (accessToken: string): Promise<string | null> => {
    try {
        const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const data = await response.json();
        const files = data.files || [];
        if (files.length > 0) {
            return files[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error finding backup file:', error);
        return null;
    }
};

/**
 * Uploads the database to Google Drive (appDataFolder).
 */
export const backupToGoogleDrive = async (): Promise<boolean> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            console.log('User must be signed in to backup to Drive.');
            return false;
        }

        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) {
            console.log('No access token available');
            return false;
        }

        const dbPath = getDbPath();
        const dbExists = await FileSystem.getInfoAsync(dbPath);
        if (!dbExists.exists) {
            console.error('No database file found to backup');
            return false;
        }

        const fileContentBase64 = await FileSystem.readAsStringAsync(dbPath, { encoding: FileSystem.EncodingType.Base64 });
        const existingFileId = await findExistingBackupFileId(tokens.accessToken);

        // We use a multipart upload to set metadata (name, parent folder) and content
        const boundary = 'foo_bar_baz';
        const metadata = {
            name: BACKUP_FILE_NAME,
            parents: ['appDataFolder'],
        };

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        // If file exists, update it instead of creating a new one
        if (existingFileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
            method = 'PATCH';
            // Metadata is only needed if changing name/parents, but patching content is fine
        }

        const multipartRequestBody =
            `--${boundary}\n` +
            `Content-Type: application/json; charset=UTF-8\n\n` +
            `${JSON.stringify(metadata)}\n` +
            `--${boundary}\n` +
            `Content-Type: application/octet-stream\n` +
            `Content-Transfer-Encoding: base64\n\n` +
            `${fileContentBase64}\n` +
            `--${boundary}--`;

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
                'Content-Length': multipartRequestBody.length.toString(),
            },
            body: multipartRequestBody,
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Drive upload failed:', err);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Backup to Google Drive failed:', error);
        return false;
    }
};

/**
 * Restores the DB from Google Drive.
 */
export const restoreFromGoogleDrive = async (): Promise<boolean> => {
    try {
        const isUserSignedIn = await isSignedIn();
        if (!isUserSignedIn) {
            return false;
        }

        const tokens = await getGoogleTokens();
        if (!tokens || !tokens.accessToken) return false;

        const fileId = await findExistingBackupFileId(tokens.accessToken);
        if (!fileId) {
            console.log('No backup file found on Drive');
            return false;
        }

        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to download backup');
            return false;
        }

        // We need an array buffer to write back as base64
        const blob = await response.blob();

        const targetPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}_restored.db`;

        const downloadResult = await FileSystem.downloadAsync(
            url,
            targetPath,
            { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );

        if (downloadResult.status !== 200) {
            console.error('Drive download failed:', downloadResult.status);
            return false;
        }

        // Now replace the active DB with the restored one
        const dbPath = getDbPath();
        await FileSystem.copyAsync({
            from: targetPath,
            to: dbPath,
        });

        await FileSystem.deleteAsync(targetPath);

        return true;
    } catch (error) {
        console.error('Restore from Google Drive failed:', error);
        return false;
    }
};
