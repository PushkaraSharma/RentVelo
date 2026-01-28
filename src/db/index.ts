// Database initialization
export { initDatabase, getDb } from './database';

// Property operations
export {
    createProperty,
    getAllProperties,
    getPropertiesWithStats,
    getPropertyById,
    updateProperty,
    deleteProperty,
    createUnit,
    getUnitsByPropertyId,
    getAllUnits,
    getUnitById,
    updateUnit,
    deleteUnit,
} from './propertyService';

// Tenant operations
export {
    createTenant,
    getAllTenants,
    getTenantsByUnitId,
    getTenantsByPropertyId,
    getActiveTenantByPropertyId,
    getTenantById,
    updateTenant,
    archiveTenant,
    deleteTenant,
    addDocument,
    getDocumentsByTenantId,
    deleteDocument,
} from './tenantService';

// Payment operations
export {
    createPayment,
    getAllPayments,
    getPaymentsByTenantId,
    getPaymentsByStatus,
    getPaymentById,
    updatePayment,
    deletePayment,
    getFinancialSummary,
    addMeterReading,
    getLatestMeterReading,
    getMeterReadingsByUnitId,
} from './paymentService';

// Types from schema
export * from './schema';
