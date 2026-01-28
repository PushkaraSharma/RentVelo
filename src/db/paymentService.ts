import { getDb } from './database';
import { payments, tenants, units, meterReadings, Payment, NewPayment, MeterReading, NewMeterReading } from './schema';
import { eq, desc, and, gte, sum } from 'drizzle-orm';

// Re-export types
export { Payment, MeterReading };

// Create Payment
export const createPayment = async (payment: NewPayment): Promise<number> => {
    const db = getDb();
    const result = await db.insert(payments).values(payment).returning({ id: payments.id });
    return result[0].id;
};

// Get All Payments
export const getAllPayments = async (): Promise<Payment[]> => {
    const db = getDb();
    return await db.select().from(payments).orderBy(desc(payments.payment_date));
};

// Get Payments by Tenant ID
export const getPaymentsByTenantId = async (tenantId: number): Promise<Payment[]> => {
    const db = getDb();
    return await db.select().from(payments).where(eq(payments.tenant_id, tenantId)).orderBy(desc(payments.payment_date));
};

// Get Payments by Status
export const getPaymentsByStatus = async (status: 'pending' | 'paid' | 'overdue' | 'cancelled'): Promise<Payment[]> => {
    const db = getDb();
    return await db.select().from(payments).where(eq(payments.status, status)).orderBy(desc(payments.payment_date));
};

// Get Payment by ID
export const getPaymentById = async (id: number): Promise<Payment | null> => {
    const db = getDb();
    const result = await db.select().from(payments).where(eq(payments.id, id));
    return result[0] || null;
};

// Update Payment
export const updatePayment = async (id: number, payment: Partial<NewPayment>): Promise<void> => {
    const db = getDb();
    await db.update(payments)
        .set({ ...payment, updated_at: new Date() })
        .where(eq(payments.id, id));
};

// Delete Payment
export const deletePayment = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(payments).where(eq(payments.id, id));
};

// Get Financial Summary
export const getFinancialSummary = async (): Promise<{ expected: number; collected: number }> => {
    const db = getDb();

    // Get total expected (sum of all active tenant rents)
    const expectedResult = await db.select({
        total: sum(units.rent_amount)
    })
        .from(units)
        .innerJoin(tenants, eq(tenants.unit_id, units.id))
        .where(eq(tenants.status, 'active'));

    const expectedTotal = Number(expectedResult[0]?.total || 0);

    // Get total collected this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const collectedResult = await db.select({
        total: sum(payments.amount)
    })
        .from(payments)
        .where(
            and(
                eq(payments.status, 'paid'),
                eq(payments.payment_type, 'rent'),
                gte(payments.payment_date, startOfMonth)
            )
        );

    const collectedTotal = Number(collectedResult[0]?.total || 0);

    return {
        expected: expectedTotal,
        collected: collectedTotal,
    };
};

// ===== METER READING OPERATIONS =====

// Add Meter Reading
export const addMeterReading = async (reading: NewMeterReading): Promise<number> => {
    const db = getDb();
    const result = await db.insert(meterReadings).values(reading).returning({ id: meterReadings.id });
    return result[0].id;
};

// Get Latest Meter Reading
export const getLatestMeterReading = async (
    unitId: number,
    readingType: 'electricity' | 'water'
): Promise<MeterReading | null> => {
    const db = getDb();
    const result = await db.select()
        .from(meterReadings)
        .where(
            and(
                eq(meterReadings.unit_id, unitId),
                eq(meterReadings.reading_type, readingType)
            )
        )
        .orderBy(desc(meterReadings.reading_date))
        .limit(1);

    return result[0] || null;
};

// Get Meter Readings by Unit ID
export const getMeterReadingsByUnitId = async (unitId: number): Promise<MeterReading[]> => {
    const db = getDb();
    return await db.select()
        .from(meterReadings)
        .where(eq(meterReadings.unit_id, unitId))
        .orderBy(desc(meterReadings.reading_date));
};
