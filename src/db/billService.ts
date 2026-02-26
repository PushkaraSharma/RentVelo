import { getDb } from './database';
import {
    rentBills, billExpenses, payments, units, tenants, properties,
    RentBill, NewRentBill, BillExpense, NewBillExpense, Payment, NewPayment
} from './schema';
import { eq, and, desc, sum, sql, inArray } from 'drizzle-orm';
import { differenceInDays, isAfter, startOfDay } from 'date-fns';

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
    let propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

    // AUTO-REPAIR: If single-unit property has no units, create one
    if (property && property.is_multi_unit === false && propertyUnits.length === 0) {
        const unitData = {
            property_id: propertyId,
            name: 'Main Property',
            rent_amount: 0,
            rent_cycle: 'monthly',
        };
        const result = await db.insert(units).values(unitData as any).returning({ id: units.id });
        const newUnitId = result[0].id;

        // Refresh property units
        propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

        // If there's an active tenant with no unit_id, link them
        const activeTenantsNoUnit = await db.select()
            .from(tenants)
            .where(and(
                eq(tenants.property_id, propertyId),
                eq(tenants.status, 'active'),
                sql`${tenants.unit_id} IS NULL`
            ));

        for (const t of activeTenantsNoUnit) {
            await db.update(tenants).set({ unit_id: newUnitId }).where(eq(tenants.id, t.id));
        }
    }

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

        // B17: Carry over electricity readings
        let prevReading = unit.initial_electricity_reading ?? 0;
        if (prevBill.length > 0 && prevBill[0].curr_reading !== null && prevBill[0].curr_reading !== undefined) {
            prevReading = prevBill[0].curr_reading;
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
            prev_reading: prevReading,
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
    let propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

    // AUTO-REPAIR: If single-unit property has no units, create one
    if (propertyUnits.length === 0) {
        const propResult = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
        const property = propResult[0];

        if (property && property.is_multi_unit === false) {
            const unitData = {
                property_id: propertyId,
                name: 'Main Property',
                rent_amount: 0,
                rent_cycle: 'monthly',
            };
            const result = await db.insert(units).values(unitData as any).returning({ id: units.id });
            const newUnitId = result[0].id;

            // Refresh property units
            propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));

            // Link active tenant if missing unit_id
            const activeTenantsNoUnit = await db.select()
                .from(tenants)
                .where(and(
                    eq(tenants.property_id, propertyId),
                    eq(tenants.status, 'active'),
                    sql`${tenants.unit_id} IS NULL`
                ));

            for (const t of activeTenantsNoUnit) {
                await db.update(tenants).set({ unit_id: newUnitId }).where(eq(tenants.id, t.id));
            }
        }
    }

    const results: any[] = [];
    const unitIds = propertyUnits.map(u => u.id);

    if (unitIds.length === 0) return [];

    // Fetch property config once for all units
    const propResult = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    const property = propResult[0];

    // 1. Batch fetch all active tenants for these units
    const allActiveTenants = await db.select()
        .from(tenants)
        .where(
            and(
                inArray(tenants.unit_id, unitIds),
                eq(tenants.status, 'active')
            )
        );

    // 2. Batch fetch all bills for these units/month/year
    const allBills = await db.select()
        .from(rentBills)
        .where(
            and(
                inArray(rentBills.unit_id, unitIds),
                eq(rentBills.month, month),
                eq(rentBills.year, year)
            )
        );

    // Create maps for quick lookup
    const tenantMap = new Map();
    allActiveTenants.forEach(t => {
        if (t.unit_id) tenantMap.set(t.unit_id, t);
    });

    const billMap = new Map();
    allBills.forEach(b => {
        billMap.set(b.unit_id, b);
    });

    // 3. Batch fetch all bills for the NEXT month to determine locking status
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const allNextBills = await db.select()
        .from(rentBills)
        .where(
            and(
                inArray(rentBills.unit_id, unitIds),
                eq(rentBills.month, nextMonth),
                eq(rentBills.year, nextYear)
            )
        );

    const nextBillMap = new Map();
    allNextBills.forEach(nb => {
        // Any payment OR any meter reading edit counts as a "change" that locks the previous month
        const hasChanges = ((nb.paid_amount || 0) > 0) || (nb.curr_reading !== null && nb.curr_reading !== nb.prev_reading);
        nextBillMap.set(nb.unit_id, { hasChanges, id: nb.id });
    });

    for (const unit of propertyUnits) {
        const tenant = tenantMap.get(unit.id) || null;
        const nextBillStatus = nextBillMap.get(unit.id) || { hasChanges: false, id: null };

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

        let bill = billMap.get(unit.id) || null;

        if (bill) {
            // Trigger penalty calculation lazily
            // Pass prefetched data to avoid redundant queries
            await applyPenaltiesLazily(bill.id, { property, tenant, unit });
            // Re-fetch the bill in case properties changed
            const updatedBills = await db.select().from(rentBills).where(eq(rentBills.id, bill.id)).limit(1);
            if (updatedBills.length > 0) {
                bill = updatedBills[0];
            }
        }

        results.push({
            unit,
            tenant,
            bill,
            isVacant: !tenant,
            isNotMovedIn,
            isLeaseExpired,
            nextBillStatus,
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

export const applyPenaltiesLazily = async (
    billId: number,
    prefetchedData?: { property?: any; tenant?: any; unit?: any }
): Promise<void> => {
    const db = getDb();
    const bill = await getBillById(billId);
    if (!bill || bill.status === 'paid' || bill.status === 'overpaid') return;

    // Get Property config
    const property = prefetchedData?.property || (await db.select().from(properties).where(eq(properties.id, bill.property_id)).limit(1))[0];
    if (!property || property.penalty_amount_per_day === null || property.penalty_grace_period_days === null) return;

    // Get Tenant info to determine rent_start_date/cycle
    const tenant = prefetchedData?.tenant || (await db.select().from(tenants).where(eq(tenants.id, bill.tenant_id)).limit(1))[0];
    if (!tenant) return;

    // Determine due date (usually 1st of the bill month, or relative to rent_start_date)
    let dueDate = new Date(bill.year, bill.month - 1, 1);
    const unit = prefetchedData?.unit || (await db.select().from(units).where(eq(units.id, bill.unit_id)).limit(1))[0];
    if (unit && unit.rent_cycle === 'relative' && tenant.rent_start_date) {
        const startDay = new Date(tenant.rent_start_date).getDate();
        dueDate = new Date(bill.year, bill.month - 1, startDay);
    }

    // Calculate penalty start date (due date + grace period)
    const penaltyStartDate = new Date(dueDate);
    penaltyStartDate.setDate(penaltyStartDate.getDate() + property.penalty_grace_period_days);

    const today = startOfDay(new Date());
    const isOverdue = isAfter(today, penaltyStartDate);

    let totalPenalty = 0;

    if (isOverdue) {
        // Waive if partial payment is made and setting is true
        let shouldWaive = false;
        if (property.waive_penalty_on_partial_payment) {
            const payResult = await db.select({ total: sum(payments.amount) })
                .from(payments)
                .where(and(eq(payments.bill_id, billId), eq(payments.status, 'paid')));
            if ((Number(payResult[0]?.total || 0)) > 0) {
                shouldWaive = true;
            }
        }

        if (!shouldWaive) {
            const daysOverdue = differenceInDays(today, penaltyStartDate);
            // Must be strictly greater than 0
            if (daysOverdue > 0) {
                totalPenalty = daysOverdue * property.penalty_amount_per_day;
            }
        }
    }

    // Check if a penalty expense row exists
    const existingPenaltyRows = await db.select()
        .from(billExpenses)
        .where(
            and(
                eq(billExpenses.bill_id, billId),
                eq(billExpenses.label, 'Late Payment Penalty')
            )
        )
        .limit(1);

    const existingRow = existingPenaltyRows[0];

    let requiresRecalculate = false;

    if (totalPenalty > 0) {
        if (existingRow) {
            if (existingRow.amount !== totalPenalty) {
                await db.update(billExpenses)
                    .set({ amount: totalPenalty })
                    .where(eq(billExpenses.id, existingRow.id));
                requiresRecalculate = true;
            }
        } else {
            // Check if rent sum is > 0 to prevent penalizing 0 balance active rooms 
            const balanceWithoutPenalty = (bill.rent_amount ?? 0) + (bill.electricity_amount ?? 0) + (bill.previous_balance ?? 0);
            if (balanceWithoutPenalty > 0) {
                await db.insert(billExpenses).values({
                    bill_id: billId,
                    label: 'Late Payment Penalty',
                    amount: totalPenalty,
                    is_recurring: false,
                });
                requiresRecalculate = true;
            }
        }
    } else if (existingRow) {
        // Total penalty dropped to 0 (e.g. settings changed or payment made), remove existing row
        await db.delete(billExpenses).where(eq(billExpenses.id, existingRow.id));
        requiresRecalculate = true;
    }

    // Call recalculateBill avoiding infinite deep loops
    if (requiresRecalculate) {
        await recalculateBill(billId, true);
    }
};

export const updateBill = async (id: number, data: Partial<NewRentBill>): Promise<void> => {
    const db = getDb();
    await db.update(rentBills)
        .set({ ...data, updated_at: new Date() })
        .where(eq(rentBills.id, id));
};

/**
 * Recalculate totals, balance, and status for a bill.
 */
export const recalculateBill = async (billId: number, skipPenaltyCheck = false): Promise<RentBill> => {
    const db = getDb();
    const bill = await getBillById(billId);
    if (!bill) throw new Error('Bill not found');

    // Only apply penalties if we aren't recursively calling from applyPenaltiesLazily
    if (!skipPenaltyCheck) {
        await applyPenaltiesLazily(billId);
    }

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

    // B3 & B17: Cascade to next month — update its previous_balance and prev_reading in ONE batch
    const nextMonth = bill.month === 12 ? 1 : bill.month + 1;
    const nextYear = bill.month === 12 ? bill.year + 1 : bill.year;
    const nextBillResult = await db.select().from(rentBills).where(
        and(
            eq(rentBills.unit_id, bill.unit_id),
            eq(rentBills.month, nextMonth),
            eq(rentBills.year, nextYear)
        )
    ).limit(1);

    if (nextBillResult.length > 0) {
        const nextBill = nextBillResult[0];
        const updates: any = {};
        let needsRecalculate = false;

        if (nextBill.previous_balance !== balance) {
            updates.previous_balance = balance;
            needsRecalculate = true;
        }

        if (nextBill.prev_reading !== bill.curr_reading) {
            updates.prev_reading = bill.curr_reading;
            needsRecalculate = true;
        }

        if (needsRecalculate) {
            updates.updated_at = new Date();
            await db.update(rentBills)
                .set(updates)
                .where(eq(rentBills.id, nextBill.id));
            await recalculateBill(nextBill.id);
        }
    }

    return (await getBillById(billId))!;
};

/**
 * Reset a bill to its original generated state or delete it.
 * This is used to "unlock" previous months by removing "future" records.
 */
export const resetBill = async (billId: number): Promise<void> => {
    const db = getDb();
    const bill = await getBillById(billId);
    if (!bill) return;

    // Delete associated expenses and payments
    await db.delete(billExpenses).where(eq(billExpenses.bill_id, billId));
    await db.delete(payments).where(eq(payments.bill_id, billId));

    // Delete the bill itself
    await db.delete(rentBills).where(eq(rentBills.id, billId));
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
