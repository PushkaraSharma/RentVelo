import { storage } from '../utils/storage';
import { revokeGoogleAccess, isSignedIn } from './googleAuthService';
import { signOutApple } from './appleAuthService';
import { deleteBackupFromDrive } from './backupService';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { closeDatabase } from '../db/database';

const DB_NAME = 'rentvelo.db';
const IMAGES_DIR_NAME = 'RentVeloImages';

/**
 * Unified function to delete all user data and revoke authentication.
 */
export const deleteAccountData = async (
    userId: string, 
    authMethod: 'google' | 'apple', 
    deleteCloudBackup: boolean
): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Cloud backup while Drive session still exists
        if (deleteCloudBackup) {
            try {
                await deleteBackupFromDrive();
            } catch (e) {
                console.warn('Delete backup from Drive failed, continuing cleanup...', e);
            }
        }

        // 2. Revoke Google if a Drive/Google session exists (including Apple users who linked Drive)
        try {
            if (authMethod === 'google' || await isSignedIn()) {
                await revokeGoogleAccess();
            }
        } catch (e) {
            console.warn('Revoke Google Access failed, continuing cleanup...', e);
        }

        if (authMethod === 'apple') {
            try {
                await signOutApple(userId);
            } catch (e) {
                console.warn('Sign out Apple failed, continuing cleanup...', e);
            }
        }

        // 3. Wipe SQLite Database
        try {
            // Must close connection before deletion to avoid "database is open" errors
            closeDatabase();
            SQLite.deleteDatabaseSync(DB_NAME);
            console.log('✅ SQLite Database deleted');
        } catch (e) {
            console.error('Failed to delete SQLite database:', e);
        }

        // 4. Wipe Local Images Directory
        try {
            const imagesPath = `${FileSystem.documentDirectory}${IMAGES_DIR_NAME}`;
            const info = await FileSystem.getInfoAsync(imagesPath);
            if (info.exists) {
                await FileSystem.deleteAsync(imagesPath, { idempotent: true });
                console.log('✅ Local images deleted');
            }
        } catch (e) {
            console.error('Failed to delete local images:', e);
        }

        // 5. Clear MMKV Storage
        try {
            storage.clearAll();
            console.log('✅ MMKV Storage cleared');
        } catch (e) {
            console.error('Failed to clear MMKV storage:', e);
        }

        return { success: true };
    } catch (error) {
        console.error('Account deletion failed:', error);
        return { success: false, error: 'deletion_failed' };
    }
};
