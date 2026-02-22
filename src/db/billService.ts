import { getDb } from './database';
import {
    rentBills, billExpenses, payments, units, tenants, properties,
    RentBill, NewRentBill, BillExpense, NewBillExpense, Payment, NewPayment
} from './schema';
import { eq, and, desc, sum } from 'drizzle-orm';

// Re-export types
export { RentBill, BillExpense };

// ===== BILL GENERATION =====

/**
 * Generate bills for all occupied rooms in a property for a given month.
 * Skips rooms that already have a bill for that month.
 * Auto-carries previous balance and recurring expenses.
 */
export const generateBillsForProperty = async (
    propertyId: number,
    month: number,
    year: number
): Promise<void> => {
    const db = getDb();

    // Get property to check rent_payment_type
    const propertyResult = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    const property = propertyResult[0];
    const isPostPaid = property?.rent_payment_type === 'previous_month';

    // Get all units for this property
    const propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

    for (const unit of propertyUnits) {
        // Find active tenant for this unit
        const activeTenants = await db.select()
            .from(tenants)
            .where(and(eq(tenants.unit_id, unit.id), eq(tenants.status, 'active')))
            .limit(1);

        if (activeTenants.length === 0) continue; // Skip vacant rooms

        const tenant = activeTenants[0];

        // Determine the "Usage Month" for gating
        let usageMonth = month;
        let usageYear = year;
        if (isPostPaid) {
            usageMonth = month - 1;
            if (usageMonth < 1) { usageMonth = 12; usageYear--; }
        }
        const usageMonthStart = new Date(usageYear, usageMonth - 1, 1);

        // B2: Skip if month is before tenant's rent_start_date
        if (tenant.rent_start_date) {
            const rsd = new Date(tenant.rent_start_date);
            const rsdMonthStart = new Date(rsd.getFullYear(), rsd.getMonth(), 1);
            if (usageMonthStart < rsdMonthStart) continue;
        }

        // B5: Skip if lease has expired (fixed lease type)
        if (tenant.lease_type === 'fixed' && tenant.lease_end_date) {
            const led = new Date(tenant.lease_end_date);
            if (usageMonthStart > new Date(led.getFullYear(), led.getMonth(), 1)) continue;
        }

        // Check if a bill already exists for this unit+month+year
        const existingBill = await db.select()
            .from(rentBills)
            .where(
                and(
                    eq(rentBills.unit_id, unit.id),
                    eq(rentBills.month, month),
                    eq(rentBills.year, year)
                )
            )
            .limit(1);

        if (existingBill.length > 0) continue; // Already exists, don't overwrite manual changes

        // Calculate previous balance from last month's bill
        let previousBalance = 0;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;

        const prevBill = await db.select()
            .from(rentBills)
            .where(
                and(
                    eq(rentBills.unit_id, unit.id),
                    eq(rentBills.month, prevMonth),
                    eq(rentBills.year, prevYear)
                )
            )
            .limit(1);

        if (prevBill.length > 0) {
            previousBalance = prevBill[0].balance ?? 0;
        } else if (tenant.advance_rent && tenant.advance_rent > 0) {
            // B4: First bill uses advance_rent as credit (negative = advance)
            previousBalance = -(tenant.advance_rent);
        }

        // Get electricity amount (for fixed cost units)
        let electricityAmount = 0;
        if (!unit.is_metered && unit.electricity_fixed_amount) {
            electricityAmount = unit.electricity_fixed_amount;
        }

        // B10: Generate unique bill number using MAX id
        const maxBill = await db.select({ id: rentBills.id }).from(rentBills)
            .where(eq(rentBills.property_id, propertyId)).orderBy(desc(rentBills.id)).limit(1);
        const nextNum = (maxBill[0]?.id ?? 0) + 1;
        const billNumber = `B-${nextNum.toString().padStart(4, '0')}`;

        // Calculate total
        const rentAmount = unit.rent_amount;
        const totalAmount = rentAmount + electricityAmount + previousBalance;

        // Create the bill
        const result = await db.insert(rentBills).values({
            property_id: propertyId,
            unit_id: unit.id,
            tenant_id: tenant.id,
            month,
            year,
            rent_amount: rentAmount,
            electricity_amount: electricityAmount,
            previous_balance: previousBalance,
            total_expenses: 0,
            total_amount: totalAmount,
            paid_amount: 0,
            balance: totalAmount,
            status: 'pending',
            bill_number: billNumber,
        }).returning({ id: rentBills.id });

        const newBillId = result[0].id;

        // Copy recurring expenses from previous month's bill
        if (prevBill.length > 0) {
            const recurringExpenses = await db.select()
                .from(billExpenses)
                .where(
                    and(
                        eq(billExpenses.bill_id, prevBill[0].id),
                        eq(billExpenses.is_recurring, true)
                    )
                );

            let totalExp = 0;
            for (const exp of recurringExpenses) {
                await db.insert(billExpenses).values({
                    bill_id: newBillId,
                    label: exp.label,
                    amount: exp.amount,
                    is_recurring: true,
                });
                totalExp += exp.amount;
            }

            // Update bill totals if recurring expenses were added
            if (totalExp > 0) {
                const newTotal = totalAmount + totalExp;
                await db.update(rentBills)
                    .set({
                        total_expenses: totalExp,
                        total_amount: newTotal,
                        balance: newTotal,
                        updated_at: new Date(),
                    })
                    .where(eq(rentBills.id, newBillId));
            }
        }
    }
};

// ===== BILL QUERIES =====

/**
 * Get all bills for a property in a given month, enriched with tenant & unit names.
 * Also returns vacant unit info.
 */
export const getBillsForPropertyMonth = async (
    propertyId: number,
    month: number,
    year: number
): Promise<any[]> => {
    const db = getDb();

    // Get all units for the property
    const propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

    const results: any[] = [];

    for (const unit of propertyUnits) {
        // Find active tenant
        const activeTenants = await db.select()
            .from(tenants)
            .where(and(eq(tenants.unit_id, unit.id), eq(tenants.status, 'active')))
            .limit(1);

        const tenant = activeTenants.length > 0 ? activeTenants[0] : null;

        // Determine special states
        let isNotMovedIn = false;
        let isLeaseExpired = false;

        if (tenant) {
            // Check if tenant hasn't moved in yet for this month
            if (tenant.rent_start_date) {
                const rsd = new Date(tenant.rent_start_date);
                const billMonthStart = new Date(year, month - 1, 1);
                if (billMonthStart < new Date(rsd.getFullYear(), rsd.getMonth(), 1)) {
                    isNotMovedIn = true;
                }
            } else if (tenant.move_in_date) {
                const mid = new Date(tenant.move_in_date);
                const billMonthStart = new Date(year, month - 1, 1);
                if (billMonthStart < new Date(mid.getFullYear(), mid.getMonth(), 1)) {
                    isNotMovedIn = true;
                }
            }

            // Check if lease has expired
            if (tenant.lease_type === 'fixed' && tenant.lease_end_date) {
                const led = new Date(tenant.lease_end_date);
                const billMonthStart = new Date(year, month - 1, 1);
                if (billMonthStart > new Date(led.getFullYear(), led.getMonth(), 1)) {
                    isLeaseExpired = true;
                }
            }
        }

        // Find bill for this month
        const bills = await db.select()
            .from(rentBills)
            .where(
                and(
                    eq(rentBills.unit_id, unit.id),
                    eq(rentBills.month, month),
                    eq(rentBills.year, year)
                )
            )
            .limit(1);

        const bill = bills.length > 0 ? bills[0] : null;

        results.push({
            unit,
            tenant,
            bill,
            isVacant: !tenant,
            isNotMovedIn,
            isLeaseExpired,
        });
    }

    return results;
};

export const getBillById = async (id: number): Promise<RentBill | null> => {
    const db = getDb();
    const result = await db.select().from(rentBills).where(eq(rentBills.id, id));
    return result[0] || null;
};

// ===== BILL UPDATE & RECALCULATION =====

export const updateBill = async (id: number, data: Partial<NewRentBill>): Promise<void> => {
    const db = getDb();
    await db.update(rentBills)
        .set({ ...data, updated_at: new Date() })
        .where(eq(rentBills.id, id));
};

/**
 * Recalculate totals, balance, and status for a bill.
 */
export const recalculateBill = async (billId: number): Promise<RentBill> => {
    const db = getDb();
    const bill = await getBillById(billId);
    if (!bill) throw new Error('Bill not found');

    // Sum expenses
    const expResult = await db.select({ total: sum(billExpenses.amount) })
        .from(billExpenses)
        .where(eq(billExpenses.bill_id, billId));
    const totalExpenses = Number(expResult[0]?.total || 0);

    // Sum payments
    const payResult = await db.select({ total: sum(payments.amount) })
        .from(payments)
        .where(and(eq(payments.bill_id, billId), eq(payments.status, 'paid')));
    const paidAmount = Number(payResult[0]?.total || 0);

    // Calculate totals
    const totalAmount = (bill.rent_amount ?? 0) + (bill.electricity_amount ?? 0) + totalExpenses + (bill.previous_balance ?? 0);
    const balance = totalAmount - paidAmount;

    // Determine status
    let status: 'pending' | 'partial' | 'paid' | 'overpaid' = 'pending';
    if (paidAmount >= totalAmount && totalAmount > 0) {
        status = paidAmount > totalAmount ? 'overpaid' : 'paid';
    } else if (paidAmount > 0) {
        status = 'partial';
    }

    // Update bill
    await db.update(rentBills)
        .set({
            total_expenses: totalExpenses,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            balance,
            status,
            updated_at: new Date(),
        })
        .where(eq(rentBills.id, billId));

    // B3: Cascade to next month — update its previous_balance if it changed
    const nextMonth = bill.month === 12 ? 1 : bill.month + 1;
    const nextYear = bill.month === 12 ? bill.year + 1 : bill.year;
    const nextBill = await db.select().from(rentBills).where(
        and(
            eq(rentBills.unit_id, bill.unit_id),
            eq(rentBills.month, nextMonth),
            eq(rentBills.year, nextYear)
        )
    ).limit(1);
    if (nextBill.length > 0 && nextBill[0].previous_balance !== balance) {
        await db.update(rentBills)
            .set({ previous_balance: balance, updated_at: new Date() })
            .where(eq(rentBills.id, nextBill[0].id));
        await recalculateBill(nextBill[0].id);
    }

    return (await getBillById(billId))!;
};

// ===== EXPENSE OPERATIONS =====

export const addExpenseToBill = async (billId: number, expense: Omit<NewBillExpense, 'bill_id'>): Promise<number> => {
    const db = getDb();
    const result = await db.insert(billExpenses).values({
        ...expense,
        bill_id: billId,
    }).returning({ id: billExpenses.id });

    await recalculateBill(billId);
    return result[0].id;
};

export const removeExpense = async (expenseId: number): Promise<void> => {
    const db = getDb();
    // Get the bill_id before deleting
    const expense = await db.select().from(billExpenses).where(eq(billExpenses.id, expenseId)).limit(1);
    if (expense.length === 0) return;

    const billId = expense[0].bill_id;
    await db.delete(billExpenses).where(eq(billExpenses.id, expenseId));
    await recalculateBill(billId);
};

export const getBillExpenses = async (billId: number): Promise<BillExpense[]> => {
    const db = getDb();
    return await db.select().from(billExpenses)
        .where(eq(billExpenses.bill_id, billId))
        .orderBy(desc(billExpenses.created_at));
};

// ===== PAYMENT OPERATIONS (BILL-LINKED) =====

export const addPaymentToBill = async (
    billId: number,
    paymentData: Omit<NewPayment, 'bill_id'>
): Promise<number> => {
    const db = getDb();
    const bill = await getBillById(billId);
    if (!bill) throw new Error('Bill not found');

    const result = await db.insert(payments).values({
        ...paymentData,
        bill_id: billId,
        property_id: bill.property_id,
        tenant_id: bill.tenant_id,
        unit_id: bill.unit_id,
        payment_type: 'rent',
        status: 'paid',
    }).returning({ id: payments.id });

    await recalculateBill(billId);
    return result[0].id;
};

export const removePaymentFromBill = async (paymentId: number): Promise<void> => {
    const db = getDb();
    // Get the bill_id before deleting
    const payment = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (payment.length === 0) return;

    const billId = payment[0].bill_id;
    await db.delete(payments).where(eq(payments.id, paymentId));

    if (billId) {
        await recalculateBill(billId);
    }
};

export const getBillPayments = async (billId: number): Promise<Payment[]> => {
    const db = getDb();
    return await db.select().from(payments)
        .where(and(eq(payments.bill_id, billId), eq(payments.status, 'paid')))
        .orderBy(desc(payments.payment_date));
};
