import * as Updates from 'expo-updates';
import { Dispatch } from '@reduxjs/toolkit';
import { completeSetup, setRestorePending } from '../redux/authSlice';
import { syncDatabaseSchema } from '../db/database';
import { clearBackupDirty } from './backupFlags';

export const finalizeSuccessfulRestore = async (dispatch: Dispatch) => {
    syncDatabaseSchema(true);
    dispatch(completeSetup());
    dispatch(setRestorePending(false));
    clearBackupDirty();

    try {
        await Updates.reloadAsync();
    } catch (error) {
        console.warn('App reload after restore failed; schema was refreshed in place.', error);
    }
};
