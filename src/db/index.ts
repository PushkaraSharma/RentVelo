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
    getDashboardData,
    addMeterReading,
    getLatestMeterReading,
    getMeterReadingsByUnitId,
} from './paymentService';
export type { DashboardData } from './paymentService';

// Types from schema
export * from './schema';

// Receipt Config operations
export {
    getReceiptConfigByPropertyId,
    upsertReceiptConfig,
} from './receiptConfigService';

// Bill operations
export {
    generateBillsForProperty,
    getBillsForPropertyMonth,
    getBillById,
    updateBill,
    recalculateBill,
    addExpenseToBill,
    removeExpense,
    getBillExpenses,
    addPaymentToBill,
    removePaymentFromBill,
    getBillPayments,
} from './billService';

// Notification operations
export {
    createNotification,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    generateRentReminders
} from './notificationService';
export type { Notification } from './notificationService';
