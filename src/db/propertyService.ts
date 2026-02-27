import { getDb } from './database';
import { properties, units, tenants, Property, NewProperty, Unit, NewUnit } from './schema';
import { eq, desc, and } from 'drizzle-orm';

// Re-export types
export { Property, Unit };

// Create Property
export const createProperty = async (property: NewProperty): Promise<number> => {
    const db = getDb();
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

        // Count occupied rooms (units that have at least one active tenant)
        const activeTenants = await db.select()
            .from(tenants)
            .where(and(eq(tenants.property_id, prop.id), eq(tenants.status, 'active')));

        let occupiedCount = 0;
        if (prop.is_multi_unit) {
            // For multi-unit, count unique unit_ids that have active tenants
            occupiedCount = new Set(activeTenants.map(t => t.unit_id).filter(id => id !== null)).size;
        } else {
            // For single-unit, it's either occupied (1) or vacant (0)
            occupiedCount = activeTenants.length > 0 ? 1 : 0;
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
    await db.update(units)
        .set({ ...unit, updated_at: new Date() })
        .where(eq(units.id, id));
};

// Delete Unit
export const deleteUnit = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(units).where(eq(units.id, id));
};
