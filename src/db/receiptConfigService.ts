import { getDb } from './database';
import { rentReceiptConfig, RentReceiptConfig, NewRentReceiptConfig } from './schema';
import { eq } from 'drizzle-orm';

// Re-export types
export { RentReceiptConfig };

// Get Receipt Config by Property ID
export const getReceiptConfigByPropertyId = async (propertyId: number): Promise<RentReceiptConfig | null> => {
    const db = getDb();
    const result = await db.select()
        .from(rentReceiptConfig)
        .where(eq(rentReceiptConfig.property_id, propertyId))
        .limit(1);
    return result[0] || null;
};

// Upsert Receipt Config (Create or Update)
export const upsertReceiptConfig = async (propertyId: number, data: Partial<NewRentReceiptConfig>): Promise<void> => {
    const db = getDb();
    const existing = await getReceiptConfigByPropertyId(propertyId);

    if (existing) {
        await db.update(rentReceiptConfig)
            .set({ ...data, updated_at: new Date() })
            .where(eq(rentReceiptConfig.property_id, propertyId));
    } else {
        await db.insert(rentReceiptConfig)
            .values({ ...data, property_id: propertyId } as NewRentReceiptConfig);
    }
};
