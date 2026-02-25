import * as FileSystem from 'expo-file-system/legacy';
import { zip, unzip } from 'react-native-zip-archive';
import { getGoogleTokens, isSignedIn } from './googleAuthService';

/**
 * Note: Our sqlite database is named `rentvelo.db` and is located in the document directory.
 */
const DB_NAME = 'rentvelo.db';
const BACKUP_FILE_NAME = 'rentvelo_backup.zip';
const IMAGES_DIR_NAME = 'RentVeloImages';

const getDbPath = () => {
    return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
};

const getImagesPath = () => {
    return `${FileSystem.documentDirectory}${IMAGES_DIR_NAME}`;
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

        // Ensure staging dir is empty
        const stagingInfo = await FileSystem.getInfoAsync(tempBackupDir);
        if (stagingInfo.exists) {
            await FileSystem.deleteAsync(tempBackupDir, { idempotent: true });
        }
        await FileSystem.makeDirectoryAsync(tempBackupDir, { intermediates: true });

        // Copy DB
        const dbExists = await FileSystem.getInfoAsync(dbPath);
        if (dbExists.exists) {
            await FileSystem.copyAsync({ from: dbPath, to: `${tempBackupDir}${DB_NAME}` });
        } else {
            console.error('Database file not found for backup');
            return null;
        }

        // Copy Images if they exist
        const imgExists = await FileSystem.getInfoAsync(imagesPath);
        if (imgExists.exists) {
            await FileSystem.copyAsync({ from: imagesPath, to: `${tempBackupDir}${IMAGES_DIR_NAME}` });
        }

        // Create the zip
        const createdZipPath = await zip(tempBackupDir, zipPath);

        // Clean up staging dir
        await FileSystem.deleteAsync(tempBackupDir, { idempotent: true });

        return createdZipPath;
    } catch (error) {
        console.error('Error creating backup zip:', error);
        return null;
    }
};

/**
 * Perform a local backup by copying the DB to another file in the document directory.
 */
export const performLocalBackup = async (): Promise<string | null> => {
    try {
        const zipPath = await createBackupZip();
        if (!zipPath) return null;

        const finalBackupPath = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;

        await FileSystem.copyAsync({
            from: zipPath,
            to: finalBackupPath,
        });

        console.log(`Local backup successful at ${finalBackupPath}`);
        return finalBackupPath;
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

        const zipPath = await createBackupZip();
        if (!zipPath) {
            console.error('Finished creating backup zip but got null');
            return false;
        }

        const fileContentBase64 = await FileSystem.readAsStringAsync(zipPath, { encoding: FileSystem.EncodingType.Base64 });
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
            `Content-Type: application/zip\n` +
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

        const targetZipPath = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}_restored.zip`;
        const extractTargetPath = `${FileSystem.cacheDirectory}RestoreStaging/`;

        const downloadResult = await FileSystem.downloadAsync(
            url,
            targetZipPath,
            { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );

        if (downloadResult.status !== 200) {
            console.error('Drive download failed:', downloadResult.status);
            return false;
        }

        // Clean staging area
        const stagingInfo = await FileSystem.getInfoAsync(extractTargetPath);
        if (stagingInfo.exists) {
            await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });
        }
        await FileSystem.makeDirectoryAsync(extractTargetPath, { intermediates: true });

        // Unzip the downloaded file
        await unzip(targetZipPath, extractTargetPath);

        // Move the Database back into `SQLite/`
        const dbPath = getDbPath();
        const extractedDbPath = `${extractTargetPath}${DB_NAME}`;

        const extractedDbInfo = await FileSystem.getInfoAsync(extractedDbPath);
        if (extractedDbInfo.exists) {
            const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
            const sqliteInfo = await FileSystem.getInfoAsync(sqliteDir);
            if (!sqliteInfo.exists) {
                await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
            }

            // Cannot overwrite the db directly while connection is open in advanced cases,
            // but expo-sqlite handles simple overwrite correctly if connection isn't locked.
            await FileSystem.copyAsync({
                from: extractedDbPath,
                to: dbPath,
            });
        }

        // Move the Images back over the `RentVeloImages/` folder
        const imagesPath = getImagesPath();
        const extractedImgPath = `${extractTargetPath}${IMAGES_DIR_NAME}`;
        const extractedImgInfo = await FileSystem.getInfoAsync(extractedImgPath);

        if (extractedImgInfo.exists) {
            const destImgInfo = await FileSystem.getInfoAsync(imagesPath);
            if (destImgInfo.exists) {
                await FileSystem.deleteAsync(imagesPath, { idempotent: true });
            }
            await FileSystem.copyAsync({
                from: extractedImgPath,
                to: imagesPath,
            });
        }

        // Cleanup
        await FileSystem.deleteAsync(targetZipPath, { idempotent: true });
        await FileSystem.deleteAsync(extractTargetPath, { idempotent: true });

        return true;
    } catch (error) {
        console.error('Restore from Google Drive failed:', error);
        return false;
    }
};
