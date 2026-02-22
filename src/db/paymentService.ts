import { getDb } from './database';
import { payments, tenants, units, meterReadings, properties, rentBills, type Payment, type NewPayment, type MeterReading, type NewMeterReading } from './schema';
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

// ===== DASHBOARD DATA =====

export interface DashboardData {
    expected: number;
    collected: number;
    pending: number;
    pendingTenantCount: number;
    occupiedCount: number;
    vacantCount: number;
    totalRooms: number;
    pendingProperties: { id: number; name: string; pendingCount: number }[];
    trends: { month: number; year: number; label: string; expected: number; collected: number }[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
    const db = getDb();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // --- Current month bills ---
    const allBills = await db.select().from(rentBills)
        .where(and(eq(rentBills.month, currentMonth), eq(rentBills.year, currentYear)));

    const expected = allBills.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const collected = allBills.reduce((s, b) => s + (b.paid_amount ?? 0), 0);
    const pending = expected - collected;

    const pendingBills = allBills.filter(b => b.status === 'pending' || b.status === 'partial');
    const pendingTenantCount = new Set(pendingBills.map(b => b.tenant_id)).size;

    // --- Occupancy ---
    const allUnits = await db.select().from(units);
    const totalRooms = allUnits.length;
    const activeTenantUnits = await db.select({ unitId: tenants.unit_id })
        .from(tenants)
        .where(eq(tenants.status, 'active'));
    const occupiedIds = new Set(activeTenantUnits.map(t => t.unitId));
    const occupiedCount = allUnits.filter(u => occupiedIds.has(u.id)).length;
    const vacantCount = totalRooms - occupiedCount;

    // --- Pending properties (for property picker) ---
    const allProps = await db.select().from(properties);
    const pendingProperties: { id: number; name: string; pendingCount: number }[] = [];
    for (const prop of allProps) {
        const count = pendingBills.filter(b => b.property_id === prop.id).length;
        if (count > 0) {
            pendingProperties.push({ id: prop.id, name: prop.name, pendingCount: count });
        }
    }

    // --- 6-month trends ---
    const trends: { month: number; year: number; label: string; expected: number; collected: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) { m += 12; y--; }
        const bills = await db.select().from(rentBills)
            .where(and(eq(rentBills.month, m), eq(rentBills.year, y)));
        const exp = bills.reduce((s, b) => s + (b.total_amount ?? 0), 0);
        const col = bills.reduce((s, b) => s + (b.paid_amount ?? 0), 0);
        trends.push({ month: m, year: y, label: monthNames[m - 1], expected: exp, collected: col });
    }

    return {
        expected, collected, pending,
        pendingTenantCount,
        occupiedCount, vacantCount, totalRooms,
        pendingProperties,
        trends,
    };
};

export interface GlobalTransaction {
    id: string;
    title: string;
    date: Date;
    amount: number;
    type: 'credit' | 'debit';
    status: 'Success' | 'Pending';
}

export const getGlobalTransactions = async (): Promise<{ transactions: GlobalTransaction[], totalCollected: number }> => {
    const db = getDb();

    // Get all payments (credits)
    const allPayments = await db.select({
        id: payments.id,
        amount: payments.amount,
        date: payments.payment_date,
        type: payments.payment_type,
        status: payments.status,
        unitName: units.name,
        propertyName: properties.name
    })
        .from(payments)
        .leftJoin(units, eq(payments.unit_id, units.id))
        .leftJoin(properties, eq(payments.property_id, properties.id))
        .orderBy(desc(payments.payment_date));

    let totalCollected = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const formattedTransactions: GlobalTransaction[] = allPayments.map(p => {
        // Calculate total collected this month
        if (p.status === 'paid' && p.date && p.date.getMonth() === currentMonth && p.date.getFullYear() === currentYear) {
            totalCollected += p.amount;
        }

        let title = 'Payment';
        if (p.type === 'rent') title = `Rent - ${p.unitName || p.propertyName || 'Property'}`;
        else if (p.type === 'security_deposit') title = `Deposit - ${p.unitName || p.propertyName || 'Property'}`;
        else if (p.type === 'maintenance') title = `Maintenance - ${p.propertyName || 'Property'}`;

        return {
            id: `payment_${p.id}`,
            title,
            date: p.date || new Date(),
            amount: p.amount,
            type: 'credit', // Currently rentvelo only tracks incoming payments
            status: p.status === 'paid' ? 'Success' : 'Pending'
        };
    });

    return {
        transactions: formattedTransactions,
        totalCollected
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
