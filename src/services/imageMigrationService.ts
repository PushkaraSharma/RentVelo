import { getDb } from '../db/database';
import { properties, tenants } from '../db/schema';
import { eq } from 'drizzle-orm';
import { saveImageToPermanentStorage } from './imageService';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Checks all properties and tenants in the database.
 * If any image URI is an absolute file path (e.g., from the ImagePicker cache),
 * it compresses it, saves it to the permanent RentVeloImages folder,
 * and updates the database record with the new relative filename.
 * 
 * This ensures that older images are safely migrated to the new backup-friendly structure.
 */
export const migrateOldImagesToPermanentStorage = async () => {
    try {
        const db = getDb();

        // 1. Migrate Properties
        const allProperties = await db.select().from(properties);
        for (const prop of allProperties) {
            if (prop.image_uri && prop.image_uri.startsWith('file://')) {
                // Check if file still exists in cache
                const info = await FileSystem.getInfoAsync(prop.image_uri);
                if (info.exists) {
                    console.log(`Migrating property image: ${prop.name}`);
                    const newFilename = await saveImageToPermanentStorage(prop.image_uri);
                    if (newFilename) {
                        await db.update(properties)
                            .set({ image_uri: newFilename })
                            .where(eq(properties.id, prop.id));
                    }
                }
            }
        }

        // 2. Migrate Tenants (4 image fields)
        const allTenants = await db.select().from(tenants);
        for (const tenant of allTenants) {
            let updates: any = {};
            let needsUpdate = false;

            const fieldsToCheck = [
                { key: 'photo_uri', val: tenant.photo_uri },
                { key: 'aadhaar_front_uri', val: tenant.aadhaar_front_uri },
                { key: 'aadhaar_back_uri', val: tenant.aadhaar_back_uri },
                { key: 'pan_uri', val: tenant.pan_uri }
            ];

            for (const field of fieldsToCheck) {
                if (field.val && field.val.startsWith('file://')) {
                    const info = await FileSystem.getInfoAsync(field.val);
                    if (info.exists) {
                        console.log(`Migrating tenant ${field.key}: ${tenant.name}`);
                        const newFilename = await saveImageToPermanentStorage(field.val);
                        if (newFilename) {
                            updates[field.key] = newFilename;
                            needsUpdate = true;
                        }
                    }
                }
            }

            if (needsUpdate) {
                await db.update(tenants)
                    .set(updates)
                    .where(eq(tenants.id, tenant.id));
            }
        }

        console.log('Image migration check complete.');

    } catch (error) {
        console.error('Error during image migration:', error);
    }
};
