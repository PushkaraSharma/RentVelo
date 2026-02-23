import { getDb } from './database';
import { tenants, documents, properties, units, Tenant, NewTenant, Document, NewDocument } from './schema';
import { eq, desc, and } from 'drizzle-orm';

// Re-export types
export { Tenant, Document };

// Create Tenant
export const createTenant = async (tenant: NewTenant): Promise<number> => {
    const db = getDb();
    let finalTenant = { ...tenant };

    // If tenant has no unit_id, check if property is single_unit. 
    // If so, get or create the "Main Property" unit.
    if (!finalTenant.unit_id && finalTenant.property_id) {
        const propRes = await db.select().from(properties).where(eq(properties.id, finalTenant.property_id)).limit(1);
        const prop = propRes[0];

        if (prop && prop.is_multi_unit === false) {
            let propUnits = await db.select().from(units).where(eq(units.property_id, prop.id));
            if (propUnits.length === 0) {
                // Determine rent amount from tenant deposit or just 0 (will be updated later)
                const newUnit = await db.insert(units).values({
                    property_id: prop.id,
                    name: 'Main Property',
                    rent_amount: 0,
                    rent_cycle: 'first_of_month',
                }).returning({ id: units.id });
                finalTenant.unit_id = newUnit[0].id;
            } else {
                finalTenant.unit_id = propUnits[0].id;
            }
        }
    }

    const result = await db.insert(tenants).values(finalTenant).returning({ id: tenants.id });
    return result[0].id;
};

// Get All Tenants (Active by default)
export const getAllTenants = async (status: 'active' | 'inactive' | 'archived' = 'active'): Promise<Tenant[]> => {
    const db = getDb();
    return await db.select().from(tenants).where(eq(tenants.status, status)).orderBy(desc(tenants.created_at));
};

// Get Tenants by Unit ID
export const getTenantsByUnitId = async (unitId: number): Promise<Tenant[]> => {
    const db = getDb();
    return await db.select().from(tenants).where(eq(tenants.unit_id, unitId)).orderBy(desc(tenants.created_at));
};

// Get Tenants by Property ID
export const getTenantsByPropertyId = async (propertyId: number): Promise<Tenant[]> => {
    const db = getDb();
    return await db.select().from(tenants).where(eq(tenants.property_id, propertyId)).orderBy(desc(tenants.created_at));
};

// Get Active Tenant for a Property (Specifically for single-unit properties)
export const getActiveTenantByPropertyId = async (propertyId: number): Promise<Tenant | null> => {
    const db = getDb();
    const result = await db.select()
        .from(tenants)
        .where(and(eq(tenants.property_id, propertyId), eq(tenants.status, 'active')))
        .limit(1);
    return result[0] || null;
};

// Get Tenant by ID
export const getTenantById = async (id: number): Promise<Tenant | null> => {
    const db = getDb();
    const result = await db.select().from(tenants).where(eq(tenants.id, id));
    return result[0] || null;
};

// Update Tenant (with global profile sync)
export const updateTenant = async (id: number, tenant: Partial<NewTenant>): Promise<void> => {
    const db = getDb();

    // 1. Get the current tenant record to find the phone number
    const currentTenant = await getTenantById(id);
    if (!currentTenant) return;

    // 2. Define profile fields that should be synchronized globally
    const profileFields = [
        'name', 'phone', 'email', 'profession', 'guest_count',
        'work_address', 'id_proof_type', 'id_proof_number',
        'emergency_contact_name', 'emergency_contact_phone',
        'photo_uri', 'aadhaar_front_uri', 'aadhaar_back_uri', 'pan_uri'
    ];

    // 3. Extract profile-specific updates
    const profileUpdates: any = {};
    Object.keys(tenant).forEach(key => {
        if (profileFields.includes(key)) {
            profileUpdates[key] = (tenant as any)[key];
        }
    });

    // 4. Update the specific record (includes rent/stay specific fields)
    await db.update(tenants)
        .set({ ...tenant, updated_at: new Date() })
        .where(eq(tenants.id, id));

    // 5. If profile fields changed, sync them across all records with the same phone number
    if (Object.keys(profileUpdates).length > 0) {
        await db.update(tenants)
            .set({ ...profileUpdates, updated_at: new Date() })
            .where(eq(tenants.phone, currentTenant.phone));
    }
};

// Archive Tenant (Soft Delete)
export const archiveTenant = async (id: number): Promise<void> => {
    const db = getDb();
    await db.update(tenants)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(tenants.id, id));
};

// Hard Delete Tenant
export const deleteTenant = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(tenants).where(eq(tenants.id, id));
};

// ===== DOCUMENT OPERATIONS =====

// Add Document
export const addDocument = async (document: NewDocument): Promise<number> => {
    const db = getDb();
    const result = await db.insert(documents).values(document).returning({ id: documents.id });
    return result[0].id;
};

// Get Documents by Tenant ID
export const getDocumentsByTenantId = async (tenantId: number): Promise<Document[]> => {
    const db = getDb();
    return await db.select().from(documents).where(eq(documents.tenant_id, tenantId)).orderBy(desc(documents.created_at));
};

// Delete Document
export const deleteDocument = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(documents).where(eq(documents.id, id));
};
