import { getDb } from './database';
import { tenants, documents, Tenant, NewTenant, Document, NewDocument } from './schema';
import { eq, desc, and } from 'drizzle-orm';

// Re-export types
export { Tenant, Document };

// Create Tenant
export const createTenant = async (tenant: NewTenant): Promise<number> => {
    const db = getDb();
    const result = await db.insert(tenants).values(tenant).returning({ id: tenants.id });
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

// Update Tenant
export const updateTenant = async (id: number, tenant: Partial<NewTenant>): Promise<void> => {
    const db = getDb();
    await db.update(tenants)
        .set({ ...tenant, updated_at: new Date() })
        .where(eq(tenants.id, id));
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
