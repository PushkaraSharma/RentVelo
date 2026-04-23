import { getDb } from './database';
import {
    rentBills, billExpenses, payments, units, tenants, properties, propertyExpenses,
    RentBill, NewRentBill, BillExpense, NewBillExpense, Payment, NewPayment
} from './schema';
import { eq, and, or, desc, sum, sql, inArray } from 'drizzle-orm';
import { differenceInDays, isAfter, startOfDay } from 'date-fns';

// Re-export types
export { RentBill, BillExpense };

/**
 * Helper: count occupied beds in a PG room_group for a given month.
 * "Occupied" = has a bill for that month (which means had an active tenant).
 */
const getOccupiedBedCountForRoom = async (
    propertyId: number,
    roomGroup: string,
    month: number,
    year: number
): Promise<number> => {
    const db = getDb();
    // Get all bed unit IDs in this room group
    const bedsInRoom = await db.select({ id: units.id }).from(units).where(
        and(eq(units.property_id, propertyId), eq(units.room_group, roomGroup))
    );
    if (bedsInRoom.length === 0) return 1;

    const bedIds = bedsInRoom.map(b => b.id);
    const bills = await db.select({ id: rentBills.id }).from(rentBills).where(
        and(
            inArray(rentBills.unit_id, bedIds),
            eq(rentBills.month, month),
            eq(rentBills.year, year)
        )
    );
    return Math.max(1, bills.length);
};

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

    // Skip bill generation for future months — they will be virtual
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    // Current/Future months (relative to today) are treated as virtual simulations until specialized action is taken
    const isFutureMonth = (year > currentYear) || (year === currentYear && month > currentMonth);
    const isStrictlyFuture = (year > currentYear) || (year === currentYear && month > currentMonth);
    if (isFutureMonth) return;

    // Get property to check rent_payment_type
    const propertyResult = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    const property = propertyResult[0];
    const isPostPaid = property?.rent_payment_type === 'previous_month';

    let usageMonth = month;
    let usageYear = year;
    if (isPostPaid) {
        usageMonth = month - 1;
        if (usageMonth < 1) {
            usageMonth = 12;
            usageYear--;
        }
    }
    const usageMonthStart = new Date(usageYear, usageMonth - 1, 1);

    // Get all units for this property (sorted same as room list)
    let propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId))
        .orderBy(sql`CASE WHEN ${units.sequence} IS NULL THEN 1 ELSE 0 END`, units.sequence, units.created_at);

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

    // ── Auto-Increment Rent ──
    // Only fires for current month (future months are virtual and handle increment in getBillsForPropertyMonth)
    if (property?.auto_increment_rent_enabled && (property.auto_increment_percent || property.auto_increment_amount)) {
        const percent = property.auto_increment_percent;
        const fixedAmount = property.auto_increment_amount;
        const freq = property.auto_increment_frequency;
        const lastInc = property.last_increment_date ? new Date(property.last_increment_date) : null;
        const monthsRequired = freq === 'half_yearly' ? 6 : 12;

        if (lastInc) {
            const monthsSinceLastInc = (year - lastInc.getFullYear()) * 12 + (month - (lastInc.getMonth() + 1));
            const cyclesElapsed = Math.floor(monthsSinceLastInc / monthsRequired);

            if (cyclesElapsed >= 1) {
                // Permanently increase rent on all units (safe because this only runs for current month)
                for (const unit of propertyUnits) {
                    let newRent = unit.rent_amount;
                    if (fixedAmount) {
                        newRent = unit.rent_amount + (fixedAmount * cyclesElapsed);
                    } else if (percent) {
                        newRent = unit.rent_amount * Math.pow(1 + percent / 100, cyclesElapsed);
                    }
                    newRent = Math.round(newRent);
                    if (newRent !== unit.rent_amount) {
                        await db.update(units).set({ rent_amount: newRent }).where(eq(units.id, unit.id));
                    }
                }
                await db.update(properties)
                    .set({ last_increment_date: new Date() } as any)
                    .where(eq(properties.id, propertyId));
                propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId));
            }
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

        if (existingBill.length > 0) {
            const bill = existingBill[0];
            // If the bill is already fully paid, we don't want to touch it at all
            if (bill.status === 'paid' || bill.status === 'overpaid') continue;
            // Otherwise, we continue but we'll use an UPDATE instead of an INSERT later
            // (The code below will recalculate prev_reading and previous_balance)
        }

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

        // Initialize water readings
        let waterPrevReading = unit.initial_water_reading ?? 0;
        if (prevBill.length > 0 && prevBill[0].water_curr_reading !== null && prevBill[0].water_curr_reading !== undefined) {
            waterPrevReading = prevBill[0].water_curr_reading;
        }

        // Get utilities (PG-aware fixed costs)
        let electricityAmount = 0;
        let waterAmount = 0;
        if (!unit.is_metered && unit.electricity_fixed_amount) {
            if (unit.room_group) {
                // Pre-split for PG to avoid incorrect initial totals/balances
                const occupiedCount = await getOccupiedBedCountForRoom(propertyId, unit.room_group, month, year);
                electricityAmount = Math.round((unit.electricity_fixed_amount / occupiedCount) * 100) / 100;
            } else {
                electricityAmount = unit.electricity_fixed_amount;
            }
        }
        if (unit.water_fixed_amount) {
            if (unit.room_group) {
                const occupiedCount = await getOccupiedBedCountForRoom(propertyId, unit.room_group, month, year);
                waterAmount = Math.round((unit.water_fixed_amount / occupiedCount) * 100) / 100;
            } else {
                waterAmount = unit.water_fixed_amount;
            }
        }

        // B10: Generate unique bill number using MAX id
        const maxBill = await db.select({ id: rentBills.id }).from(rentBills)
            .where(eq(rentBills.property_id, propertyId)).orderBy(desc(rentBills.id)).limit(1);
        const nextNum = (maxBill[0]?.id ?? 0) + 1;
        const billNumber = `B-${nextNum.toString().padStart(4, '0')}`;

        // Calculate rent (pro-rata for move-in month)
        let rentAmount = unit.rent_amount;
        // The period this bill covers (Usage Month)
        let finalPeriodStart = new Date(usageYear, usageMonth - 1, 1);
        let finalPeriodEnd = new Date(usageYear, usageMonth, 0, 23, 59, 59);

        if (tenant.rent_start_date) {
            const rsd = new Date(tenant.rent_start_date);
            const rsdMonthStart = new Date(rsd.getFullYear(), rsd.getMonth(), 1);
            const currentUsageMonthStart = new Date(usageYear, usageMonth - 1, 1);

            // Check if tenant's rent_start_date falls within the USAGE month of this bill
            if (rsdMonthStart.getTime() === currentUsageMonthStart.getTime() && rsd.getDate() > 1) {
                const daysInMonth = new Date(usageYear, usageMonth, 0).getDate();
                const daysOccupied = daysInMonth - rsd.getDate() + 1; // inclusive of move-in day
                rentAmount = Math.round((unit.rent_amount / daysInMonth) * daysOccupied);
                finalPeriodStart = rsd;
            }
        }
        const totalAmount = rentAmount + electricityAmount + waterAmount + previousBalance;

        // ── PERSISTENCE RULE: NEVER MODIFY EXISTING BILLS ──
        // Only insert if missing. If it exists, we skip it entirely to preserve user data (readings/balances).
        if (existingBill.length > 0) {
            continue;
        }

        // Only reach here for NEW records that need to be created
        const result = await db.insert(rentBills).values({
            property_id: propertyId,
            unit_id: unit.id,
            tenant_id: tenant.id,
            month,
            year,
            rent_amount: rentAmount,
            electricity_amount: electricityAmount,
            water_amount: waterAmount,
            previous_balance: previousBalance,
            prev_reading: prevReading,
            water_prev_reading: waterPrevReading,
            total_expenses: 0,
            total_amount: totalAmount,
            paid_amount: 0,
            balance: totalAmount,
            status: 'pending',
            bill_number: billNumber,
            period_start: finalPeriodStart,
            period_end: finalPeriodEnd,
        }).returning({ id: rentBills.id });

        const newBillId = result[0].id;

        // Copy recurring expenses from previous month's bill
        if (prevBill.length > 0) {
            const recurringExps = await db.select().from(billExpenses).where(
                and(eq(billExpenses.bill_id, prevBill[0].id), eq(billExpenses.is_recurring, true))
            );
            for (const exp of recurringExps) {
                await db.insert(billExpenses).values({
                    bill_id: newBillId,
                    property_id: propertyId,
                    unit_id: unit.id,
                    expense_name: exp.expense_name,
                    amount: exp.amount,
                    is_recurring: true,
                    property_expense_id: exp.property_expense_id
                });
            }
            if (recurringExps.length > 0) {
                const totalExps = recurringExps.reduce((sum, e) => sum + (e.amount ?? 0), 0);
                const finalTotal = totalAmount + totalExps;
                await db.update(rentBills).set({
                    total_expenses: totalExps,
                    total_amount: finalTotal,
                    balance: finalTotal
                }).where(eq(rentBills.id, newBillId));
            }
        }

        // ── Distribute Property Expenses to this newly created bill ──
        const propExpenses = await db.select().from(propertyExpenses)
            .where(
                and(
                    eq(propertyExpenses.property_id, propertyId),
                    eq(propertyExpenses.distribute_type, 'rooms'),
                    or(
                        and(eq(propertyExpenses.month, usageMonth), eq(propertyExpenses.year, usageYear)),
                        eq(propertyExpenses.frequency, 'monthly')
                    )
                )
            );
        // Add non-monthly property expenses to the new bill (if any)
        for (const propExp of propExpenses) {
            try {
                const distributedTo = JSON.parse(propExp.distributed_unit_ids || '[]');
                if (distributedTo.includes(unit.id) && propExp.frequency !== 'monthly') {
                    const splitAmount = propExp.amount / distributedTo.length;
                    await db.insert(billExpenses).values({
                        bill_id: newBillId,
                        property_expense_id: propExp.id,
                        label: `Property: ${propExp.expense_type}`,
                        amount: Math.round(splitAmount)
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Add monthly property expenses to the new bill
        // Guard: Don't apply monthly expenses whose start month is AFTER this bill's usage month
        for (const propExp of propExpenses) {
            try {
                const distributedTo = JSON.parse(propExp.distributed_unit_ids || '[]');
                if (distributedTo.includes(unit.id) && propExp.frequency === 'monthly') {
                    // Skip if this bill month is before the expense's designated start month
                    if (usageYear < propExp.year || (usageYear === propExp.year && usageMonth < propExp.month)) continue;

                    const splitAmount = propExp.amount / distributedTo.length;
                    await db.insert(billExpenses).values({
                        bill_id: newBillId,
                        property_expense_id: propExp.id,
                        label: `Property: ${propExp.expense_type}`,
                        amount: Math.round(splitAmount),
                        is_recurring: true
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Recalculate bill totals (handles property expenses, recurring expenses, etc.)
        await recalculateBill(newBillId);
    } // End of unit loop

    // ── PG Utility Split: split fixed electricity/water across occupied beds (Runs once per room group) ──
    if (property?.type === 'pg') {
        await splitPGUtilities(propertyId, month, year);
    }
};

/**
 * For PG properties: split fixed electricity/water costs equally
 * across occupied beds in the same room_group.
 * Called after bill generation.
 */
const splitPGUtilities = async (
    propertyId: number,
    month: number,
    year: number
): Promise<void> => {
    const db = getDb();

    // Get all units for this property that have a room_group
    const pgUnits = await db.select().from(units).where(
        and(eq(units.property_id, propertyId), sql`${units.room_group} IS NOT NULL`)
    );

    if (pgUnits.length === 0) return;

    // Group units by room_group
    const roomMap = new Map<string, typeof pgUnits>();
    for (const unit of pgUnits) {
        const group = unit.room_group!;
        if (!roomMap.has(group)) roomMap.set(group, []);
        roomMap.get(group)!.push(unit);
    }

    // For each room group, find occupied beds and split utilities
    for (const [roomGroup, bedsInRoom] of roomMap) {
        // Get bills for this month for these beds
        const bedIds = bedsInRoom.map(b => b.id);
        const bills = await db.select().from(rentBills).where(
            and(
                inArray(rentBills.unit_id, bedIds),
                eq(rentBills.month, month),
                eq(rentBills.year, year)
            )
        );

        if (bills.length === 0) continue;

        const occupiedBedCount = bills.length; // Only occupied beds have bills

        // Get the room-level utility config from the first bed
        const roomConfig = bedsInRoom[0];

        // Split fixed electricity
        if (roomConfig.electricity_fixed_amount && roomConfig.electricity_fixed_amount > 0) {
            const perBedElectricity = Math.round((roomConfig.electricity_fixed_amount / occupiedBedCount) * 100) / 100;
            for (const bill of bills) {
                const newTotal = (bill.rent_amount ?? 0) + perBedElectricity + (bill.water_amount ?? 0) + (bill.total_expenses ?? 0) + (bill.previous_balance ?? 0);
                await db.update(rentBills)
                    .set({
                        electricity_amount: perBedElectricity,
                        total_amount: newTotal,
                        balance: newTotal - (bill.paid_amount ?? 0),
                        updated_at: new Date(),
                    })
                    .where(eq(rentBills.id, bill.id));
            }
        }

        // Split fixed water
        if (roomConfig.water_fixed_amount && roomConfig.water_fixed_amount > 0) {
            const perBedWater = Math.round((roomConfig.water_fixed_amount / occupiedBedCount) * 100) / 100;
            for (const bill of bills) {
                // Re-fetch since electricity might have changed above
                const freshBill = await getBillById(bill.id);
                if (!freshBill) continue;
                const newTotal = (freshBill.rent_amount ?? 0) + (freshBill.electricity_amount ?? 0) + perBedWater + (freshBill.total_expenses ?? 0) + (freshBill.previous_balance ?? 0);
                await db.update(rentBills)
                    .set({
                        water_amount: perBedWater,
                        total_amount: newTotal,
                        balance: newTotal - (freshBill.paid_amount ?? 0),
                        updated_at: new Date(),
                    })
                    .where(eq(rentBills.id, bill.id));
            }
        }
    }
};

/**
 * Save a metered utility reading for a PG room and split the cost 
 * equally across all occupied beds for the given month.
 */
export const savePGUtilityReading = async (
    propertyId: number,
    roomGroup: string,
    month: number,
    year: number,
    type: 'electricity' | 'water',
    newReading: number
): Promise<void> => {
    const db = getDb();

    // Get all beds in this room
    const pgUnits = await db.select().from(units).where(
        and(eq(units.property_id, propertyId), eq(units.room_group, roomGroup))
    );

    if (pgUnits.length === 0) return;

    // Get all bills for these beds for the given month
    const bedIds = pgUnits.map(b => b.id);
    const bills = await db.select().from(rentBills).where(
        and(
            inArray(rentBills.unit_id, bedIds),
            eq(rentBills.month, month),
            eq(rentBills.year, year)
        )
    );

    if (bills.length === 0) return;

    const occupiedBedCount = bills.length;
    const roomConfig = pgUnits[0]; // All beds share the same utility config

    const isElec = type === 'electricity';
    const rate = isElec ? (roomConfig.electricity_rate ?? 0) : (roomConfig.water_rate ?? 0);
    const defaultUnits = isElec ? (roomConfig.electricity_default_units ?? 0) : (roomConfig.water_default_units ?? 0);

    // Determine the previous reading. 
    // We can just use the first bill's prev_reading, as they should all be in sync.
    const firstBill = bills[0];
    const prevReading = isElec
        ? ((firstBill.prev_reading !== null && firstBill.prev_reading !== 0) ? firstBill.prev_reading : (roomConfig.initial_electricity_reading ?? 0))
        : ((firstBill.water_prev_reading !== null && firstBill.water_prev_reading !== 0) ? firstBill.water_prev_reading : (roomConfig.initial_water_reading ?? 0));

    // Prevent negative units (though UI shouldn't allow this)
    if (newReading < prevReading) return;

    let unitsUsed = newReading - prevReading;

    // Apply default units logic
    if (defaultUnits > 0 && unitsUsed <= defaultUnits) {
        unitsUsed = defaultUnits;
    }

    const totalCost = unitsUsed * rate;
    const perBedCost = Math.round((totalCost / occupiedBedCount) * 100) / 100;

    // Update all bills with the new reading and calculated split amount
    for (const bill of bills) {
        if (isElec) {
            await db.update(rentBills)
                .set({
                    curr_reading: newReading,
                    prev_reading: prevReading, // enforce sync just in case
                    electricity_amount: perBedCost,
                    updated_at: new Date()
                })
                .where(eq(rentBills.id, bill.id));
        } else {
            await db.update(rentBills)
                .set({
                    water_curr_reading: newReading,
                    water_prev_reading: prevReading,
                    water_amount: perBedCost,
                    updated_at: new Date()
                })
                .where(eq(rentBills.id, bill.id));
        }

        // Recalculate totals for each updated bill
        await recalculateBill(bill.id);
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

    // Get all units for the property (sorted same as room list)
    let propertyUnits = await db.select().from(units).where(eq(units.property_id, propertyId))
        .orderBy(sql`CASE WHEN ${units.sequence} IS NULL THEN 1 ELSE 0 END`, units.sequence, units.created_at);

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
    const isPostPaid = property?.rent_payment_type === 'previous_month';

    let usageMonth = month;
    let usageYear = year;
    if (isPostPaid) {
        usageMonth = month - 1;
        if (usageMonth < 1) {
            usageMonth = 12;
            usageYear--;
        }
    }

    // P1: Hoist property expenses query — same for all units
    const hoistedPropExpenses = await db.select().from(propertyExpenses)
        .where(
            and(
                eq(propertyExpenses.property_id, propertyId),
                eq(propertyExpenses.distribute_type, 'rooms'),
                or(
                    and(eq(propertyExpenses.month, usageMonth), eq(propertyExpenses.year, usageYear)),
                    eq(propertyExpenses.frequency, 'monthly')
                )
            )
        );

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

    // 3. Determine locking: check if ANY future month has a "complex" persisted bill for each unit.
    // A bill is complex if it has manual user inputs: paid_amount > 0, manual readings, or manual non-recurring local expenses.
    // Clean auto-generated shells (soft-reset state) do NOT lock the current month.
    const hasFuturePersistedBillsMap = new Map<number, boolean>();
    const complexFutureBills = await db.select({ unit_id: rentBills.unit_id })
        .from(rentBills)
        .leftJoin(billExpenses, eq(rentBills.id, billExpenses.bill_id))
        .where(
            and(
                inArray(rentBills.unit_id, unitIds),
                or(
                    sql`${rentBills.year} > ${year}`,
                    and(eq(rentBills.year, year), sql`${rentBills.month} > ${month}`)
                ),
                or(
                    sql`${rentBills.paid_amount} > 0`,
                    sql`${rentBills.curr_reading} IS NOT NULL`,
                    sql`${rentBills.water_curr_reading} IS NOT NULL`,
                    and(
                        sql`${billExpenses.id} IS NOT NULL`,
                        eq(billExpenses.is_recurring, false),
                        sql`${billExpenses.property_expense_id} IS NULL`
                    )
                )
            )
        );
    const unitsWithFutureBills = new Set(complexFutureBills.map(fb => fb.unit_id));
    unitIds.forEach(uid => hasFuturePersistedBillsMap.set(uid, unitsWithFutureBills.has(uid)));

    // Batch fetch previous month's bills for recurring expense sync
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const allPrevBills = await db.select().from(rentBills).where(
        and(
            inArray(rentBills.unit_id, unitIds),
            eq(rentBills.month, prevMonth),
            eq(rentBills.year, prevYear)
        )
    );
    const prevBillMap = new Map();
    allPrevBills.forEach(pb => prevBillMap.set(pb.unit_id, pb));

    for (const unit of propertyUnits) {
        const tenant = tenantMap.get(unit.id) || null;
        const hasFutureBills = hasFuturePersistedBillsMap.get(unit.id) || false;

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
            // Persisted bill — apply lazy syncs
            await applyPenaltiesLazily(bill.id, { property, tenant, unit });
            await syncPropertyExpensesLazily(bill.id, unit.id, usageMonth, usageYear, hoistedPropExpenses);

            // Lazy sync recurring bill expenses from previous month
            const prevBill = prevBillMap.get(unit.id);
            if (prevBill) {
                await syncRecurringExpensesLazily(bill.id, prevBill.id);
            }

            // Re-fetch the bill in case syncs changed it
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
            hasFuturePersistedBills: hasFutureBills,
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

    // Check if a penalty expense row exists (including manually waived)
    const existingPenaltyRows = await db.select()
        .from(billExpenses)
        .where(
            and(
                eq(billExpenses.bill_id, billId),
                or(
                    eq(billExpenses.label, 'Late Payment Penalty'),
                    eq(billExpenses.label, 'Late Payment Penalty (Waived)')
                )
            )
        )
        .limit(1);

    const existingRow = existingPenaltyRows[0];

    // If User manually waived the penalty by deleting it, respect that action:
    if (existingRow && existingRow.label === 'Late Payment Penalty (Waived)') {
        return;
    }

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

    // B17: Sync readings with unit initial values if no current reading is set yet
    // This fixes the bug where updating initial reading doesn't reflect in existing bills
    const unitResult = await db.select().from(units).where(eq(units.id, bill.unit_id)).limit(1);
    const unit = unitResult[0];
    let electricityAmount = bill.electricity_amount ?? 0;
    let waterAmount = bill.water_amount ?? 0;
    let prevReading = bill.prev_reading;
    let waterPrevReading = bill.water_prev_reading;
    let needsUpdate = false;

    if (unit) {
        // P2: Single prev-bill query for both electricity and water sync
        const prevBillArr = await db.select().from(rentBills).where(
            and(
                eq(rentBills.unit_id, bill.unit_id),
                sql`${rentBills.month} + ${rentBills.year} * 12 < ${bill.month} + ${bill.year} * 12`
            )
        ).orderBy(desc(sql`${rentBills.month} + ${rentBills.year} * 12`)).limit(1);

        const prevBill = prevBillArr[0] || null;

        // Sync electricity
        if (!prevBill) {
            if (prevReading !== unit.initial_electricity_reading) {
                prevReading = unit.initial_electricity_reading;
                needsUpdate = true;
            }
        } else if (prevBill.curr_reading !== null && prevBill.curr_reading !== prevReading) {
            prevReading = prevBill.curr_reading;
            needsUpdate = true;
        }

        // Sync water (reuse same prevBill)
        if (!prevBill) {
            if (waterPrevReading !== unit.initial_water_reading) {
                waterPrevReading = unit.initial_water_reading;
                needsUpdate = true;
            }
        } else if (prevBill.water_curr_reading !== null && prevBill.water_curr_reading !== waterPrevReading) {
            waterPrevReading = prevBill.water_curr_reading;
            needsUpdate = true;
        }

        // Calculate utility amounts (Electricity) if metered
        if (unit.electricity_rate !== null && bill.curr_reading !== null) {
            const prev = (prevReading !== null && prevReading !== 0) ? prevReading : (unit.initial_electricity_reading ?? 0);
            let unitsUsed = Math.max(0, bill.curr_reading - prev);
            const defaultUnits = unit.electricity_default_units;
            if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
                unitsUsed = defaultUnits;
            }
            let targetElecAmt = unitsUsed * unit.electricity_rate;

            // PG split: divide metered cost across occupied beds in same room
            if (unit.room_group) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                if (occupiedCount > 1) {
                    targetElecAmt = Math.round((targetElecAmt / occupiedCount) * 100) / 100;
                }
            }

            if (electricityAmount !== targetElecAmt) {
                electricityAmount = targetElecAmt;
                needsUpdate = true;
            }
        } else if (unit.electricity_rate !== null && bill.curr_reading === null) {
            // Metered but no reading yet -> cost should be 0
            if (electricityAmount !== 0) {
                electricityAmount = 0;
                needsUpdate = true;
            }
        } else if (unit.electricity_rate === null && unit.electricity_fixed_amount && unit.room_group) {
            // PG split for FIXED electricity
            // Only split if current amount is the full unsplit amount (default state)
            if (electricityAmount === unit.electricity_fixed_amount) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                const targetElecAmt = Math.round((unit.electricity_fixed_amount / occupiedCount) * 100) / 100;
                if (electricityAmount !== targetElecAmt) {
                    electricityAmount = targetElecAmt;
                    needsUpdate = true;
                }
            }
        }

        // Calculate utility amounts (Water) if metered
        if (unit.water_rate !== null && bill.water_curr_reading !== null) {
            const prev = (waterPrevReading !== null && waterPrevReading !== 0) ? waterPrevReading : (unit.initial_water_reading ?? 0);
            let unitsUsed = Math.max(0, bill.water_curr_reading - prev);
            const defaultUnits = unit.water_default_units;
            if (defaultUnits && defaultUnits > 0 && unitsUsed <= defaultUnits) {
                unitsUsed = defaultUnits;
            }
            let targetWaterAmt = unitsUsed * unit.water_rate;

            // PG split: divide metered cost across occupied beds in same room
            if (unit.room_group) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                if (occupiedCount > 1) {
                    targetWaterAmt = Math.round((targetWaterAmt / occupiedCount) * 100) / 100;
                }
            }

            if (waterAmount !== targetWaterAmt) {
                waterAmount = targetWaterAmt;
                needsUpdate = true;
            }
        } else if (unit.water_rate !== null && bill.water_curr_reading === null) {
            // Metered but no reading yet -> cost should be 0
            if (waterAmount !== 0) {
                waterAmount = 0;
                needsUpdate = true;
            }
        } else if (unit.water_rate === null && unit.water_fixed_amount && unit.room_group) {
            // PG split for FIXED water
            if (waterAmount === unit.water_fixed_amount) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                const targetWaterAmt = Math.round((unit.water_fixed_amount / occupiedCount) * 100) / 100;
                if (waterAmount !== targetWaterAmt) {
                    waterAmount = targetWaterAmt;
                    needsUpdate = true;
                }
            }
        }
    }

    // Calculate totals
    const totalAmount = (bill.rent_amount ?? 0) + electricityAmount + waterAmount + totalExpenses + (bill.previous_balance ?? 0);
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
            prev_reading: prevReading,
            water_prev_reading: waterPrevReading,
            electricity_amount: electricityAmount,
            water_amount: waterAmount,
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

        if (nextBill.water_prev_reading !== bill.water_curr_reading) {
            updates.water_prev_reading = bill.water_curr_reading;
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
 * Reset persisted bills for a unit strictly after a given month to their auto-calculated states.
 * Wipes manual user inputs (payments, manual expenses, readings) and lets recalculateBill derive totals.
 */
export const resetFutureBills = async (
    unitId: number,
    fromMonth: number,
    fromYear: number
): Promise<void> => {
    const db = getDb();

    // Find all persisted bills for this unit strictly after the requested month/year
    const billsToReset = await db.select().from(rentBills).where(
        and(
            eq(rentBills.unit_id, unitId),
            or(
                sql`${rentBills.year} > ${fromYear}`,
                and(eq(rentBills.year, fromYear), sql`${rentBills.month} > ${fromMonth}`)
            )
        )
    ).orderBy(rentBills.year, rentBills.month);

    for (const bill of billsToReset) {
        // Delete manual local expenses (keep property-level and recurring ones)
        await db.delete(billExpenses).where(
            and(
                eq(billExpenses.bill_id, bill.id),
                eq(billExpenses.is_recurring, false),
                sql`${billExpenses.property_expense_id} IS NULL`
            )
        );
        // Delete payments
        await db.delete(payments).where(eq(payments.bill_id, bill.id));

        // Reset manual readings (recalculateBill will handle falling back to fixed amounts if applicable)
        await db.update(rentBills)
            .set({
                curr_reading: null,
                water_curr_reading: null,
                updated_at: new Date()
            })
            .where(eq(rentBills.id, bill.id));

        // Recalculate bill completely, which will naturally cascade its new balance and prev_reading 
        // down to the next bill in the sequence loop.
        await recalculateBill(bill.id);
    }
};

/**
 * Reset a single bill (legacy — kept for backward compatibility).
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
    const bill = await getBillById(billId);
    if (!bill) throw new Error('Bill not found');

    // Also create a property expense record so it shows in the Expenses screen
    const isRecurring = expense.is_recurring === true;
    const propExpResult = await db.insert(propertyExpenses).values({
        property_id: bill.property_id,
        amount: Math.abs(expense.amount ?? 0),
        expense_type: expense.label || 'Custom Expense',
        frequency: isRecurring ? 'monthly' : 'one_time',
        distribute_type: 'rooms',
        distributed_unit_ids: JSON.stringify([bill.unit_id]),
        month: bill.month,
        year: bill.year,
    }).returning({ id: propertyExpenses.id });

    const propExpId = propExpResult[0].id;

    const result = await db.insert(billExpenses).values({
        ...expense,
        bill_id: billId,
        property_expense_id: propExpId,
        label: expense.label ? `Property: ${expense.label}` : 'Property: Custom Expense',
    }).returning({ id: billExpenses.id });

    await recalculateBill(billId);
    return result[0].id;
};

export const removeExpense = async (expenseId: number): Promise<void> => {
    const db = getDb();
    // Get the expense before deleting
    const expense = await db.select().from(billExpenses).where(eq(billExpenses.id, expenseId)).limit(1);
    if (expense.length === 0) return;

    const billId = expense[0].bill_id;
    const propertyExpId = expense[0].property_expense_id;
    const label = expense[0].label;
    const isRecurring = expense[0].is_recurring;

    if (label === 'Late Payment Penalty') {
        // Waive penalty instead of deleting, to avoid lazy regeneration
        await db.update(billExpenses)
            .set({ label: 'Late Payment Penalty (Waived)', amount: 0 })
            .where(eq(billExpenses.id, expenseId));
    } else if (isRecurring && propertyExpId) {
        // For recurring property expenses, waive for THIS month only (don't delete the source).
        // Mark it with a "(Removed)" suffix so syncPropertyExpensesLazily won't re-add it.
        await db.update(billExpenses)
            .set({ label: `${label} (Removed)`, amount: 0 })
            .where(eq(billExpenses.id, expenseId));
    } else {
        await db.delete(billExpenses).where(eq(billExpenses.id, expenseId));

        // If this expense came from the property expense module, delete the root expense
        if (propertyExpId) {
            await db.delete(propertyExpenses).where(eq(propertyExpenses.id, propertyExpId));
        }
    }

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

/**
 * Synchronize all pending bills for a unit with the current unit settings.
 * This is called when room settings are updated to ensure changes reflect in existing bills.
 */
export const syncPendingBillsWithUnitSettings = async (unitId: number): Promise<void> => {
    const db = getDb();
    const unit = (await db.select().from(units).where(eq(units.id, unitId)).limit(1))[0];
    if (!unit) return;

    // Find all non-paid bills for this unit
    const pendingBills = await db.select()
        .from(rentBills)
        .where(
            and(
                eq(rentBills.unit_id, unitId),
                or(eq(rentBills.status, 'pending'), eq(rentBills.status, 'partial'))
            )
        );

    for (const bill of pendingBills) {
        let updateData: any = { updated_at: new Date() };

        // Sync fixed amounts (only if user changed unit setting)
        if (unit.electricity_rate === null && unit.electricity_fixed_amount !== null) {
            let elecAmount = unit.electricity_fixed_amount;
            // For PG, if the current bill electricity is the old fixed amount (or unsplit), apply new split
            if (unit.room_group && elecAmount > 0) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                elecAmount = Math.round((elecAmount / occupiedCount) * 100) / 100;
            }
            updateData.electricity_amount = elecAmount;
            updateData.curr_reading = null; // Clear metered data
            updateData.prev_reading = null;
        }

        if (unit.water_rate === null && unit.water_fixed_amount !== null) {
            let waterAmt = unit.water_fixed_amount;
            if (unit.room_group && waterAmt > 0) {
                const occupiedCount = await getOccupiedBedCountForRoom(unit.property_id, unit.room_group, bill.month, bill.year);
                waterAmt = Math.round((waterAmt / occupiedCount) * 100) / 100;
            }
            updateData.water_amount = waterAmt;
            updateData.water_curr_reading = null;
            updateData.water_prev_reading = null;
        }

        // Update rent amount too if it changed
        if (bill.rent_amount !== unit.rent_amount) {
            updateData.rent_amount = unit.rent_amount;
        }

        if (Object.keys(updateData).length > 1) { // more than just updated_at
            await db.update(rentBills)
                .set(updateData)
                .where(eq(rentBills.id, bill.id));
        }

        // Trigger full recalculation (this will also handle metered rate changes and clearing amounts)
        await recalculateBill(bill.id);
    }
};

/**
 * Lazy-sync recurring bill expenses from the previous month's bill.
 * If a recurring expense exists in prevBill but not in currentBill, add it.
 * This ensures recurring expenses cascade forward even if they were added
 * after the current bill was already generated.
 */
const syncRecurringExpensesLazily = async (
    currentBillId: number,
    prevBillId: number
): Promise<void> => {
    const db = getDb();

    // Get recurring expenses from previous month's bill (non-property ones only)
    const prevRecurring = await db.select().from(billExpenses).where(
        and(
            eq(billExpenses.bill_id, prevBillId),
            eq(billExpenses.is_recurring, true),
            sql`${billExpenses.property_expense_id} IS NULL`
        )
    );

    if (prevRecurring.length === 0) return;

    // Get current bill's expenses
    const currentExpenses = await db.select().from(billExpenses).where(
        eq(billExpenses.bill_id, currentBillId)
    );

    let changed = false;

    for (const recurExp of prevRecurring) {
        // Check if current bill already has this recurring expense (match by label)
        const alreadyExists = currentExpenses.some(
            e => (e.label === recurExp.label || e.label === `${recurExp.label} (Removed)`) && e.is_recurring === true
        );

        if (!alreadyExists) {
            await db.insert(billExpenses).values({
                bill_id: currentBillId,
                label: recurExp.label,
                amount: recurExp.amount,
                is_recurring: true,
            });
            changed = true;
        }
    }

    if (changed) {
        await recalculateBill(currentBillId, true);
    }
};

/**
 * Lazy-sync property expenses into an existing bill.
 * Runs at read time (inside getBillsForPropertyMonth) to ensure bills always
 * reflect the current state of property expenses — even if expenses were
 * added/deleted/changed after the bill was originally generated.
 *
 * Accepts prefetched property expenses to avoid redundant DB queries (P1).
 * This is the same self-healing pattern used by applyPenaltiesLazily.
 */
const syncPropertyExpensesLazily = async (
    billId: number,
    unitId: number,
    month: number,
    year: number,
    prefetchedPropExpenses: any[]
): Promise<void> => {
    const db = getDb();

    // Build expected expense map: propExpId -> { label, amount, isRecurring } for this specific unit
    const expectedExpenses = new Map<number, { label: string; amount: number; isRecurring: boolean }>();
    for (const propExp of prefetchedPropExpenses) {
        if (!propExp.distributed_unit_ids) continue;

        // Skip monthly expenses whose designated start month is AFTER this bill's month
        if (propExp.frequency === 'monthly') {
            if (year < propExp.year || (year === propExp.year && month < propExp.month)) continue;
        }

        try {
            const unitIds: number[] = JSON.parse(propExp.distributed_unit_ids);
            if (unitIds.includes(unitId)) {
                const splitAmount = Math.round(propExp.amount / unitIds.length);
                const label = `Property: ${propExp.expense_type}`;
                // E2: Preserve is_recurring based on source frequency
                const isRecurring = propExp.frequency === 'monthly';
                // Rather than aggregating by label, track precisely by property_expense_id
                expectedExpenses.set(propExp.id, {
                    label,
                    amount: splitAmount,
                    isRecurring,
                });
            }
        } catch (e) {
            // Invalid JSON, skip
        }
    }

    // 2. Get current bill expenses with "Property: " prefix or valid property_expense_id
    const currentBillExpenses = await db.select().from(billExpenses)
        .where(eq(billExpenses.bill_id, billId));

    const propertyLabeledExpenses = currentBillExpenses.filter(
        e => e.property_expense_id !== null || e.label.startsWith('Property: ')
    );

    let changed = false;

    // 3. Remove stale ones (exist in bill but NOT in expected)
    for (const existing of propertyLabeledExpenses) {
        // Skip manually removed expenses — they should stay zeroed
        if (existing.label.endsWith('(Removed)') || existing.label.endsWith('(Waived)')) continue;

        // Find if this existing bill expense corresponds to any expected property expense
        let isExpected = false;
        if (existing.property_expense_id) {
            isExpected = expectedExpenses.has(existing.property_expense_id);
        } else {
            // Fallback for older rows without property_expense_id (matching by label)
            isExpected = Array.from(expectedExpenses.values()).some(e => e.label === existing.label);
        }

        if (!isExpected) {
            await db.delete(billExpenses).where(eq(billExpenses.id, existing.id));
            changed = true;
        }
    }

    // 4. Add missing or update changed amounts
    const entries = Array.from(expectedExpenses.entries());
    for (let i = 0; i < entries.length; i++) {
        const propExpId = entries[i][0];
        const expected = entries[i][1];

        const existing = propertyLabeledExpenses.find(e =>
            e.property_expense_id === propExpId || (!e.property_expense_id && e.label === expected.label)
        );

        if (!existing) {
            // Check if this expense was manually removed for this month
            const wasRemoved = propertyLabeledExpenses.some(
                e => e.property_expense_id === propExpId && e.label.endsWith('(Removed)')
            );
            if (wasRemoved) continue; // Don't re-add manually removed expenses
            await db.insert(billExpenses).values({
                bill_id: billId,
                property_expense_id: propExpId,
                label: expected.label,
                amount: expected.amount,
                is_recurring: expected.isRecurring, // E2: correct flag
            });
            changed = true;
        } else if (
            (existing.amount !== expected.amount || existing.is_recurring !== expected.isRecurring || existing.property_expense_id !== propExpId) &&
            !existing.label.endsWith('(Removed)')
        ) {
            // Amount, recurring flag, or missing ID changed — update it
            await db.update(billExpenses)
                .set({ amount: expected.amount, is_recurring: expected.isRecurring, property_expense_id: propExpId })
                .where(eq(billExpenses.id, existing.id));
            changed = true;
        }
    }

    // 5. Recalculate only if something changed
    if (changed) {
        await recalculateBill(billId, true); // skip penalty check to avoid double work
    }
};

// ===== TENANT & UNIT QUERIES =====

/**
 * Get all bills for a given tenant, ordered by year DESC, month DESC.
 * Used to display payment history on the Tenant Detail screen.
 */
export const getBillsByTenantId = async (tenantId: number): Promise<RentBill[]> => {
    const db = getDb();
    return await db.select()
        .from(rentBills)
        .where(eq(rentBills.tenant_id, tenantId))
        .orderBy(desc(rentBills.year), desc(rentBills.month));
};

/**
 * Get aggregated bill summary for a given unit.
 * Returns total revenue collected, outstanding dues, and bill count.
 * Used for Room/Bed statistics on the Room Info tab.
 */
export const getBillSummaryByUnitId = async (unitId: number): Promise<{
    totalRevenue: number;
    outstandingDues: number;
    billCount: number;
}> => {
    const db = getDb();
    const bills = await db.select()
        .from(rentBills)
        .where(eq(rentBills.unit_id, unitId));

    const totalRevenue = bills.reduce((sum, b) => sum + (b.paid_amount ?? 0), 0);
    const outstandingDues = bills.reduce((sum, b) => {
        const bal = b.balance ?? 0;
        return sum + (bal > 0 ? bal : 0);
    }, 0);

    return {
        totalRevenue,
        outstandingDues,
        billCount: bills.length,
    };
};
