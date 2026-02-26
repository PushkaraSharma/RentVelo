import { getDb } from '../db/database';
import { properties, tenants, units, rentReceiptConfig } from '../db/schema';
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

        // 3. Migrate Units (images array stringified)
        const allUnits = await db.select().from(units);
        for (const unit of allUnits) {
            if (unit.images) {
                try {
                    const parsedImages: string[] = JSON.parse(unit.images);
                    let needsUpdate = false;
                    const finalImages = await Promise.all(
                        parsedImages.map(async (uri) => {
                            if (uri && uri.startsWith('file://')) {
                                const info = await FileSystem.getInfoAsync(uri);
                                if (info.exists) {
                                    console.log(`Migrating unit image: ${unit.name}`);
                                    const newFilename = await saveImageToPermanentStorage(uri);
                                    if (newFilename) {
                                        needsUpdate = true;
                                        return newFilename;
                                    }
                                }
                            }
                            return uri;
                        })
                    );

                    if (needsUpdate) {
                        await db.update(units)
                            .set({ images: JSON.stringify(finalImages) })
                            .where(eq(units.id, unit.id));
                    }
                } catch (e) {
                    console.error('Error parsing unit images for migration', e);
                }
            }
        }

        // 4. Migrate Receipt Configs
        const allConfigs = await db.select().from(rentReceiptConfig);
        for (const config of allConfigs) {
            let updates: any = {};
            let needsUpdate = false;

            const fieldsToCheck = [
                { key: 'logo_uri', val: config.logo_uri },
                { key: 'payment_qr_uri', val: config.payment_qr_uri },
                { key: 'signature_uri', val: config.signature_uri }
            ];

            for (const field of fieldsToCheck) {
                if (field.val && field.val.startsWith('file://')) {
                    const info = await FileSystem.getInfoAsync(field.val);
                    if (info.exists) {
                        console.log(`Migrating receipt config ${field.key} for property ${config.property_id}`);
                        const newFilename = await saveImageToPermanentStorage(field.val);
                        if (newFilename) {
                            updates[field.key] = newFilename;
                            needsUpdate = true;
                        }
                    }
                }
            }

            if (needsUpdate) {
                await db.update(rentReceiptConfig)
                    .set(updates)
                    .where(eq(rentReceiptConfig.id, config.id));
            }
        }

        console.log('Image migration check complete.');

    } catch (error) {
        console.error('Error during image migration:', error);
    }
};
