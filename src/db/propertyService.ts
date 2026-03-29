import { getDb } from './database';
import { properties, units, tenants, Property, NewProperty, Unit, NewUnit } from './schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// Re-export types
export { Property, Unit };

// Create Property
export const createProperty = async (property: NewProperty): Promise<number> => {
    const db = getDb();

    if (property.name) {
        const existingProperties = await db.select().from(properties).where(eq(properties.name, property.name));
        if (existingProperties.length > 0) {
            throw new Error('A property with this name already exists.');
        }
    }

    const result = await db.insert(properties).values(property).returning({ id: properties.id });
    return result[0].id;
};

// Get All Properties
export const getAllProperties = async (): Promise<Property[]> => {
    const db = getDb();
    return await db.select().from(properties).orderBy(desc(properties.created_at));
};

// Get Properties with Stats (Total rooms, Occupied rooms)
export const getPropertiesWithStats = async (): Promise<any[]> => {
    const db = getDb();
    const props = await db.select().from(properties).orderBy(desc(properties.created_at));

    // In a production app with huge data, we'd use a join/group by. 
    // For local SQLite, mapping is efficient enough.
    const enrichedProps = await Promise.all(props.map(async (prop) => {
        const propUnits = await db.select().from(units).where(eq(units.property_id, prop.id));
        const totalRooms = propUnits.length;

        // Count occupied rooms (units that have at least one active tenant AND the unit still exists)
        const validActiveTenants = await db.select({
            unit_id: tenants.unit_id
        })
            .from(tenants)
            .innerJoin(units, eq(tenants.unit_id, units.id))
            .where(and(eq(tenants.property_id, prop.id), eq(tenants.status, 'active')));

        let occupiedCount = 0;
        if (prop.is_multi_unit) {
            // For multi-unit, count unique unit_ids that have active tenants
            occupiedCount = new Set(validActiveTenants.map(t => t.unit_id).filter(id => id !== null)).size;
        } else {
            // For single-unit, it's either occupied (1) or vacant (0)
            occupiedCount = validActiveTenants.length > 0 ? 1 : 0;
        }

        return {
            ...prop,
            totalRooms,
            occupiedCount
        };
    }));

    return enrichedProps;
};

// Get Property by ID
export const getPropertyById = async (id: number): Promise<Property | null> => {
    const db = getDb();
    const result = await db.select().from(properties).where(eq(properties.id, id));
    return result[0] || null;
};

// Update Property
export const updateProperty = async (id: number, property: Partial<NewProperty>): Promise<void> => {
    const db = getDb();

    if (property.name) {
        const existingProperties = await db.select().from(properties).where(eq(properties.name, property.name));
        if (existingProperties.length > 0 && existingProperties[0].id !== id) {
            throw new Error('A property with this name already exists.');
        }
    }

    await db.update(properties)
        .set({ ...property, updated_at: new Date() })
        .where(eq(properties.id, id));
};

// Delete Property
export const deleteProperty = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(properties).where(eq(properties.id, id));
};

// ===== UNIT OPERATIONS =====

// Create Unit
export const createUnit = async (unit: NewUnit): Promise<number> => {
    const db = getDb();

    if (unit.name && unit.property_id) {
        const existingUnits = await db.select().from(units).where(and(eq(units.name, unit.name), eq(units.property_id, unit.property_id)));
        if (existingUnits.length > 0) {
            throw new Error('A room with this name already exists in this property.');
        }
    }

    // For PG beds: validate unique bed_number within same room_group + property
    if (unit.room_group && unit.bed_number && unit.property_id) {
        const existingBeds = await db.select().from(units).where(
            and(
                eq(units.property_id, unit.property_id),
                eq(units.room_group, unit.room_group),
                eq(units.bed_number, unit.bed_number)
            )
        );
        if (existingBeds.length > 0) {
            throw new Error(`Bed "${unit.bed_number}" already exists in room "${unit.room_group}".`);
        }
    }

    const result = await db.insert(units).values(unit).returning({ id: units.id });
    return result[0].id;
};

// Get Units by Property ID with Tenant info
export const getUnitsByPropertyId = async (propertyId: number): Promise<any[]> => {
    const db = getDb();
    const propUnits = await db.select().from(units).where(eq(units.property_id, propertyId)).orderBy(units.name);

    return await Promise.all(propUnits.map(async (unit) => {
        const activeTenant = await db.select()
            .from(tenants)
            .where(and(eq(tenants.unit_id, unit.id), eq(tenants.status, 'active')))
            .limit(1);

        return {
            ...unit,
            tenant_name: activeTenant[0]?.name || null,
            tenant_id: activeTenant[0]?.id || null,
            is_occupied: activeTenant.length > 0
        };
    }));
};

// Get All Units
export const getAllUnits = async (): Promise<Unit[]> => {
    const db = getDb();
    return await db.select().from(units).orderBy(units.name);
};

// Get Unit by ID
export const getUnitById = async (id: number): Promise<Unit | null> => {
    const db = getDb();
    const result = await db.select().from(units).where(eq(units.id, id));
    return result[0] || null;
};

// Update Unit
export const updateUnit = async (id: number, unit: Partial<NewUnit>): Promise<void> => {
    const db = getDb();

    if (unit.name) {
        const currentUnit = await getUnitById(id);
        if (currentUnit) {
            const propertyId = unit.property_id || currentUnit.property_id;
            const existingUnits = await db.select().from(units).where(and(eq(units.name, unit.name), eq(units.property_id, propertyId)));
            if (existingUnits.length > 0 && existingUnits[0].id !== id) {
                throw new Error('A room with this name already exists in this property.');
            }
        }
    }

    await db.update(units)
        .set({ ...unit, updated_at: new Date() })
        .where(eq(units.id, id));
};

// Delete Unit
export const deleteUnit = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(units).where(eq(units.id, id));
};

// ===== PG BED SYSTEM HELPERS =====

export interface PGRoomConfig {
    propertyId: number;
    roomName: string;       // e.g. "Room A"
    floor?: string;
    bedCount: number;
    bedRents: number[];     // rent per bed (length = bedCount)
    bedNames?: string[];    // optional custom names, defaults to "Bed 1", "Bed 2"...
    // Utility config (shared across all beds in the room)
    electricityRate?: number | null;
    electricityFixedAmount?: number | null;
    initialElectricityReading?: number | null;
    electricityDefaultUnits?: number | null;
    waterRate?: number | null;
    waterFixedAmount?: number | null;
    initialWaterReading?: number | null;
    waterDefaultUnits?: number | null;
    furnishingType?: 'full' | 'semi' | 'none' | null;
}

/**
 * Create a PG room with multiple beds.
 * Each bed becomes a unit row with shared room_group.
 */
export const createPGRoom = async (config: PGRoomConfig): Promise<number[]> => {
    const bedIds: number[] = [];

    for (let i = 0; i < config.bedCount; i++) {
        const bedName = config.bedNames?.[i] || `Bed ${i + 1}`;
        const unitName = `${config.roomName} - ${bedName}`;

        const id = await createUnit({
            property_id: config.propertyId,
            name: unitName,
            floor: config.floor,
            rent_amount: config.bedRents[i] ?? config.bedRents[0],
            room_group: config.roomName,
            bed_number: bedName,
            // Utility config — same for all beds in the room
            is_metered: !!config.electricityRate || !!config.waterRate,
            electricity_rate: config.electricityRate,
            electricity_fixed_amount: config.electricityFixedAmount,
            initial_electricity_reading: config.initialElectricityReading,
            electricity_default_units: config.electricityDefaultUnits,
            water_rate: config.waterRate,
            water_fixed_amount: config.waterFixedAmount,
            initial_water_reading: config.initialWaterReading,
            water_default_units: config.waterDefaultUnits,
            furnishing_type: config.furnishingType,
        });
        bedIds.push(id);
    }

    return bedIds;
};

/**
 * Get units grouped by room_group for a PG property.
 * Returns an array of room groups, each containing its beds with tenant info.
 */
export const getUnitsGroupedByRoom = async (propertyId: number): Promise<any[]> => {
    const db = getDb();
    const allUnits = await getUnitsByPropertyId(propertyId);

    // Group by room_group
    const roomMap = new Map<string, any[]>();
    for (const unit of allUnits) {
        const group = unit.room_group || unit.name; // fallback for non-PG
        if (!roomMap.has(group)) {
            roomMap.set(group, []);
        }
        roomMap.get(group)!.push(unit);
    }

    return Array.from(roomMap.entries()).map(([roomName, beds]) => ({
        roomName,
        beds,
        totalBeds: beds.length,
        occupiedBeds: beds.filter((b: any) => b.is_occupied).length,
        floor: beds[0]?.floor || null,
    }));
};

/**
 * Get all beds in a specific room group for a property.
 */
export const getBedsForRoom = async (propertyId: number, roomGroup: string): Promise<Unit[]> => {
    const db = getDb();
    return await db.select().from(units).where(
        and(eq(units.property_id, propertyId), eq(units.room_group, roomGroup))
    ).orderBy(units.bed_number);
};

/**
 * Update a PG room group: rename, add/remove beds, update utilities and rents.
 * Blocks deletion of beds with active tenants.
 */
export const updatePGRoom = async (
    propertyId: number,
    oldRoomGroup: string,
    config: PGRoomConfig
): Promise<void> => {
    const db = getDb();

    // Get existing beds in this room group
    const existingBeds = await getBedsForRoom(propertyId, oldRoomGroup);
    const currentCount = existingBeds.length;
    const newCount = config.bedCount;

    // Check active tenants on beds that would be removed
    if (newCount < currentCount) {
        // We remove from the end — check those beds for tenants
        for (let i = newCount; i < currentCount; i++) {
            const bed = existingBeds[i];
            const activeTenant = await db.select()
                .from(tenants)
                .where(and(eq(tenants.unit_id, bed.id), eq(tenants.status, 'active')))
                .limit(1);
            if (activeTenant.length > 0) {
                throw new Error(`Cannot remove ${bed.bed_number || 'Bed ' + (i + 1)} — tenant "${activeTenant[0].name}" is assigned to it. Remove the tenant first.`);
            }
        }
    }

    // 1) Update existing beds (rename, rents, utilities)
    const bedsToUpdate = Math.min(currentCount, newCount);
    for (let i = 0; i < bedsToUpdate; i++) {
        const bed = existingBeds[i];
        const bedName = config.bedNames?.[i] || `Bed ${i + 1}`;
        const unitName = `${config.roomName} - ${bedName}`;

        await db.update(units)
            .set({
                name: unitName,
                room_group: config.roomName,
                bed_number: bedName,
                rent_amount: config.bedRents[i] ?? config.bedRents[0],
                floor: config.floor || null,
                furnishing_type: config.furnishingType || null,
                electricity_rate: config.electricityRate ?? null,
                electricity_fixed_amount: config.electricityFixedAmount ?? null,
                initial_electricity_reading: config.initialElectricityReading ?? null,
                electricity_default_units: config.electricityDefaultUnits ?? null,
                water_rate: config.waterRate ?? null,
                water_fixed_amount: config.waterFixedAmount ?? null,
                initial_water_reading: config.initialWaterReading ?? null,
                water_default_units: config.waterDefaultUnits ?? null,
                updated_at: new Date(),
            })
            .where(eq(units.id, bed.id));
    }

    // 2) Add new beds if count increased
    for (let i = currentCount; i < newCount; i++) {
        const bedName = config.bedNames?.[i] || `Bed ${i + 1}`;
        await createUnit({
            property_id: propertyId,
            name: `${config.roomName} - ${bedName}`,
            room_group: config.roomName,
            bed_number: bedName,
            rent_amount: config.bedRents[i] ?? config.bedRents[0],
            rent_cycle: 'first_of_month',
            floor: config.floor,
            furnishing_type: config.furnishingType,
            electricity_rate: config.electricityRate,
            electricity_fixed_amount: config.electricityFixedAmount,
            initial_electricity_reading: config.initialElectricityReading,
            electricity_default_units: config.electricityDefaultUnits,
            water_rate: config.waterRate,
            water_fixed_amount: config.waterFixedAmount,
            initial_water_reading: config.initialWaterReading,
            water_default_units: config.waterDefaultUnits,
        });
    }

    // 3) Remove excess vacant beds if count decreased
    for (let i = newCount; i < currentCount; i++) {
        await deleteUnit(existingBeds[i].id);
    }
};
