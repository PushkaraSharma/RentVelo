import * as XLSX from 'xlsx';
import { getDb } from '../db/database';
import { properties, units, tenants, NewProperty, NewUnit, NewTenant } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system/legacy';

export interface ImportResult {
    success: boolean;
    message: string;
    details?: {
        propertiesCreated: number;
        unitsCreated: number;
        tenantsCreated: number;
    };
}

export const importFromExcel = async (fileUri: string): Promise<ImportResult> => {
    try {
        const db = getDb();

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(fileContent, { type: 'base64' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return { success: false, message: 'Excel file is empty or invalid.' };
        }
        const sheetName = workbook.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let propertiesCreated = 0;
        let unitsCreated = 0;
        let tenantsCreated = 0;

        // Use a manual loop or transaction if drizzle support is there for expo transaction
        // SQLite transactions are safer
        for (const row of data) {
            const roomNo = row['ROOM NO'];
            const roomType = row['ROOM TYPE'];
            const roomRent = parseFloat(row['ROOM RENT [ ₹ ] ']) || 0;
            const placeName = row['PLACE_NAME'];
            const elecReading = parseFloat(row['ELECTRICITY READING (UNITS)']) || null;
            const waterCostStr = row['WATER COST [ ₹ ] '];
            const meterName = row['ELECTRICITY METER NAME/NUMBER'];
            const floor = row['ROOM_FLOOR'];
            const remarksRaw = row['ROOM REMARKS '];
            const facilities = row['ROOM_FACILITIES'];
            const size = parseFloat(row['ROOM_SIZE']) || null;
            const furnishing = row['ROOM_FURNISHING_TYPE'];
            const tenantInfo = row['TENANT DETAILS (CURRENT) '];

            if (!placeName || !roomNo) continue;

            const combinedRemarks = [remarksRaw, facilities].filter(Boolean).join(' | ');

            // 1. Property
            let propertyId: number;
            const existingProps = await db.select().from(properties).where(eq(properties.name, placeName));

            if (existingProps.length === 0) {
                let type: 'house' | 'pg' | 'flat' | 'building' | 'shop' = 'building';
                if (roomType && roomType.toLowerCase().includes('shop')) {
                    type = 'shop';
                }

                const res = await db.insert(properties).values({
                    name: placeName,
                    address: 'Imported from Excel',
                    type: type,
                    is_multi_unit: true,
                }).returning({ id: properties.id });
                propertyId = res[0].id;
                propertiesCreated++;
            } else {
                propertyId = existingProps[0].id;
            }

            // 2. Unit
            let unitId: number;
            const existingUnits = await db.select().from(units).where(
                and(eq(units.name, roomNo), eq(units.property_id, propertyId))
            );

            if (existingUnits.length === 0) {
                const isMetered = !!meterName;
                const waterFixedAmount = parseFloat(waterCostStr) || null;

                let furnish: 'full' | 'semi' | 'none' = 'none';
                const fLower = furnishing?.toLowerCase() || '';
                if (fLower.includes('semi')) furnish = 'semi';
                else if (fLower.includes('full')) furnish = 'full';

                const res = await db.insert(units).values({
                    property_id: propertyId,
                    name: roomNo,
                    type: roomType,
                    rent_amount: roomRent,
                    floor: floor,
                    size: size,
                    remarks: combinedRemarks,
                    is_metered: isMetered,
                    initial_electricity_reading: elecReading,
                    water_fixed_amount: waterFixedAmount,
                    furnishing_type: furnish,
                    rent_cycle: 'first_of_month',
                }).returning({ id: units.id });
                unitId = res[0].id;
                unitsCreated++;
            } else {
                unitId = existingUnits[0].id;
            }

            // 3. Tenant
            if (tenantInfo && tenantInfo.trim()) {
                const parts = tenantInfo.split('|').map((p: string) => p.trim());
                const info: any = {};
                parts.forEach((p: string) => {
                    const parts2 = p.split(':');
                    if (parts2.length >= 2) {
                        const key = parts2[0].trim().toLowerCase();
                        const val = parts2.slice(1).join(':').trim();
                        info[key] = val;
                    }
                });

                const tName = info['name'];
                const tPhone = info['mobile no'] || '0000000000';
                const tSecurity = parseFloat(info['security amt']) || 0;
                const tBalance = parseFloat(info['balance']) || 0;
                const tAddress = info['address'] || '';
                const tRemarks = info['remarks'] || '';

                if (tName) {
                    const existingTenants = await db.select().from(tenants).where(
                        and(eq(tenants.unit_id, unitId), eq(tenants.status, 'active'))
                    );

                    if (existingTenants.length === 0) {
                        const finalAddress = [tAddress, tRemarks ? `Remarks: ${tRemarks}` : ''].filter(Boolean).join(' | ');
                        await db.insert(tenants).values({
                            property_id: propertyId,
                            unit_id: unitId,
                            name: tName,
                            phone: tPhone,
                            security_deposit: tSecurity,
                            balance_amount: tBalance,
                            work_address: finalAddress,
                            status: 'active',
                            lease_type: 'monthly',
                        });
                        tenantsCreated++;
                    }
                }
            }
        }

        return {
            success: true,
            message: 'Import completed successfully!',
            details: { propertiesCreated, unitsCreated, tenantsCreated }
        };
    } catch (error: any) {
        console.error('Import error:', error);
        return {
            success: false,
            message: error.message || 'An unknown error occurred during import.'
        };
    }
};
