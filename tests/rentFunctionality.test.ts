import { setupTestDb, teardownTestDb } from './setupDb';
import { generateRealUsageData } from './seedDatabase';
import { properties, units, tenants, rentBills, payments, billExpenses, propertyExpenses } from '../src/db/schema';
import { getDashboardData } from '../src/db/paymentService'; // or from index.ts
import {
    generateBillsForProperty, recalculateBill, getBillsForPropertyMonth,
    addExpenseToBill, removeExpense, getBillExpenses, getBillById,
} from '../src/db/billService';
import { createExpense } from '../src/db/expenseService';
import { sql } from 'drizzle-orm';

/**
 * Bills only generate up to the billing horizon, so workflow tests are anchored to real
 * months instead of arbitrary future dates.
 */
const periodMonthsAgo = (monthsBack: number): { month: number; year: number } => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - monthsBack);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
};

let fixtureCounter = 0;

/**
 * An isolated property with its own rooms and tenants. The seed script fills every recent
 * month with randomised amounts, so tests that assert exact figures need their own data.
 */
async function createIsolatedProperty(db: any, opts: {
    rentPaymentType?: 'previous_month' | 'current_month';
    rentAmount?: number;
    unitCount?: number;
} = {}) {
    const rentAmount = opts.rentAmount ?? 10000;
    const unitCount = opts.unitCount ?? 1;
    const tag = `fixture-${++fixtureCounter}`;

    const movedInAt = new Date();
    movedInAt.setMonth(movedInAt.getMonth() - 6);
    movedInAt.setDate(1);

    const [prop] = await db.insert(properties).values({
        name: `Fixture Property ${tag}`,
        address: '1 Test Street',
        type: 'building',
        is_multi_unit: true,
        rent_payment_type: opts.rentPaymentType ?? 'previous_month',
    }).returning({ id: properties.id });

    const unitIds: number[] = [];
    const tenantIds: number[] = [];

    for (let i = 0; i < unitCount; i++) {
        const [unit] = await db.insert(units).values({
            property_id: prop.id,
            name: `${tag} Room ${i + 1}`,
            rent_amount: rentAmount,
            rent_cycle: 'first_of_month',
        }).returning({ id: units.id });

        const [tenant] = await db.insert(tenants).values({
            property_id: prop.id,
            unit_id: unit.id,
            name: `${tag} Tenant ${i + 1}`,
            phone: `900000${1000 + fixtureCounter * 10 + i}`,
            move_in_date: movedInAt,
            rent_start_date: movedInAt,
            status: 'active',
            lease_type: 'monthly',
        }).returning({ id: tenants.id });

        unitIds.push(unit.id);
        tenantIds.push(tenant.id);
    }

    return { propertyId: prop.id as number, unitIds, tenantIds };
}

const getBillFor = async (db: any, tenantId: number, month: number, year: number) => {
    const [bill] = await db.select().from(rentBills)
        .where(sql`${rentBills.tenant_id} = ${tenantId} AND ${rentBills.month} = ${month} AND ${rentBills.year} = ${year}`);
    return bill;
};

describe('RentVelo Database Seeding & Rent Workflows', () => {
    let db: any;

    beforeAll(async () => {
        // Automatically injects test DB into Drizzle globally through mocking
        db = await setupTestDb();
    });

    afterAll(() => {
        teardownTestDb();
    });

    // -----------------------------------------------------
    // T1: SEED SCRIPT
    // -----------------------------------------------------
    it('T1: should successfully generate 1 year of real usage data without SQL errors', async () => {
        // Runs the massive property, unit, tenant, 12-mo bill generation, and payments loops
        await expect(generateRealUsageData(db)).resolves.not.toThrow();

        const pCount = await db.select({ count: sql<number>`count(*)` }).from(properties);
        const uCount = await db.select({ count: sql<number>`count(*)` }).from(units);
        const tCount = await db.select({ count: sql<number>`count(*)` }).from(tenants);
        const bCount = await db.select({ count: sql<number>`count(*)` }).from(rentBills);
        const payCount = await db.select({ count: sql<number>`count(*)` }).from(payments);

        console.log(`
            Seeding Complete:
            Properties: ${pCount[0].count}
            Units: ${uCount[0].count}
            Tenants: ${tCount[0].count}
            Bills: ${bCount[0].count}
            Payments: ${payCount[0].count}
        `);

        expect(pCount[0].count).toBe(7);
        expect(uCount[0].count).toBeGreaterThan(0);
        expect(tCount[0].count).toBeGreaterThan(0);
        expect(bCount[0].count).toBeGreaterThan(0);
        expect(payCount[0].count).toBeGreaterThan(0);
    }, 60000); // Allow up to 60 seconds since it's generating a lot of data

    // -----------------------------------------------------
    // T2: DASHBOARD TOTALS (getDashboardData)
    // -----------------------------------------------------
    it('T2 & T3 & T4: Dashboard expected, collected, pending, and occupancy totals match seeded data', async () => {
        const dashboard = await getDashboardData();

        expect(dashboard.expected).toBeGreaterThan(0);
        expect(dashboard.collected).toBeGreaterThan(0);
        expect(dashboard.pending + dashboard.collected).toBeCloseTo(dashboard.expected, 1);

        // T4: pendingTenantCount
        expect(dashboard.pendingTenantCount).toBeGreaterThanOrEqual(0);
        expect(typeof dashboard.pendingTenantCount).toBe('number');

        // T10: Occupancy
        expect(dashboard.occupiedCount).toBeGreaterThan(0);
        expect(dashboard.vacantCount).toBeGreaterThanOrEqual(0);
        expect(dashboard.totalRooms).toBe(dashboard.occupiedCount + dashboard.vacantCount);
    });

    // -----------------------------------------------------
    // T5: BALANCE CASCADE
    // -----------------------------------------------------
    it('T5: Editing a payment updates the next month previous_balance', async () => {
        const { propertyId, tenantIds } = await createIsolatedProperty(db);
        const prev = periodMonthsAgo(1);
        const current = periodMonthsAgo(0);

        await generateBillsForProperty(propertyId, prev.month, prev.year);
        await generateBillsForProperty(propertyId, current.month, current.year);

        const bill1 = await getBillFor(db, tenantIds[0], prev.month, prev.year);

        // Pay exactly half
        const halfPaid = Math.floor(bill1.total_amount / 2);
        await db.insert(payments).values({
            property_id: propertyId,
            tenant_id: tenantIds[0],
            unit_id: bill1.unit_id,
            bill_id: bill1.id,
            amount: halfPaid,
            payment_date: new Date(),
            payment_type: 'rent',
            payment_method: 'cash',
            status: 'paid'
        });

        await recalculateBill(bill1.id);

        // Expect bill 2 previous_balance to be exactly the remainder
        const bill2 = await getBillFor(db, tenantIds[0], current.month, current.year);

        expect(bill2.previous_balance).toBe(bill1.total_amount - halfPaid);
    });

    // -----------------------------------------------------
    // T7: BILL IDEMPOTENCY
    // -----------------------------------------------------
    it('T7 & T8: Calling generateBillsForProperty twice does not create duplicates & vacant units are skipped', async () => {
        // Three rooms, but only two are occupied — the vacant one must not produce a bill
        const { propertyId, unitIds } = await createIsolatedProperty(db, { unitCount: 2 });
        await db.insert(units).values({
            property_id: propertyId,
            name: 'Vacant Room',
            rent_amount: 10000,
            rent_cycle: 'first_of_month',
        });

        const { month, year } = periodMonthsAgo(0);

        await generateBillsForProperty(propertyId, month, year);
        const firstRunCountResult = await db.select({ count: sql<number>`count(*)` }).from(rentBills)
            .where(sql`${rentBills.property_id} = ${propertyId} AND ${rentBills.month} = ${month} AND ${rentBills.year} = ${year}`);

        await generateBillsForProperty(propertyId, month, year);
        const secondRunCountResult = await db.select({ count: sql<number>`count(*)` }).from(rentBills)
            .where(sql`${rentBills.property_id} = ${propertyId} AND ${rentBills.month} = ${month} AND ${rentBills.year} = ${year}`);

        // Assert idempotency
        expect(secondRunCountResult[0].count).toBe(firstRunCountResult[0].count);

        // Ensure that vacant units got skipped (bills generated should equal active tenants)
        expect(firstRunCountResult[0].count).toBe(unitIds.length);
    });

    // -----------------------------------------------------
    // T9: OVERPAID STATUS
    // -----------------------------------------------------
    it('T9 & T6: Paying more than total sets overpaid status and makes advance rent on next bill', async () => {
        const { propertyId, unitIds, tenantIds } = await createIsolatedProperty(db);
        const prev = periodMonthsAgo(1);
        const current = periodMonthsAgo(0);

        await generateBillsForProperty(propertyId, prev.month, prev.year);
        const bill = await getBillFor(db, tenantIds[0], prev.month, prev.year);

        const overpayAmount = bill.total_amount + 5000;

        await db.insert(payments).values({
            property_id: propertyId,
            tenant_id: tenantIds[0],
            unit_id: unitIds[0],
            bill_id: bill.id,
            amount: overpayAmount,
            payment_date: new Date(),
            payment_type: 'rent',
            payment_method: 'cash',
            status: 'paid'
        });

        await recalculateBill(bill.id);

        const [recalculatedBill] = await db.select().from(rentBills).where(sql`${rentBills.id} = ${bill.id}`);
        expect(recalculatedBill.status).toBe('overpaid');
        expect(recalculatedBill.paid_amount).toBe(overpayAmount);

        // T6: Next month should have an advance (negative balance)
        await generateBillsForProperty(propertyId, current.month, current.year);
        const nextBill = await getBillFor(db, tenantIds[0], current.month, current.year);

        expect(nextBill.previous_balance).toBe(-5000);
    });

    // -----------------------------------------------------
    // EXPENSE ACTIONS SHEET
    // -----------------------------------------------------
    describe('Bill expenses', () => {
        it('keeps a charge added on a post-paid property after the screen refreshes', async () => {
            // Post-paid is the default, and the reconciler keys expenses by usage month.
            // A charge stamped with the bill month instead was deleted on the next read.
            const { propertyId, tenantIds } = await createIsolatedProperty(db, { rentPaymentType: 'previous_month' });
            const { month, year } = periodMonthsAgo(0);

            await generateBillsForProperty(propertyId, month, year);
            const bill = await getBillFor(db, tenantIds[0], month, year);

            await addExpenseToBill(bill.id, { label: 'Wifi', amount: 500, is_recurring: false });

            // Reading the month is what runs the lazy reconciler, exactly as the screen does
            await getBillsForPropertyMonth(propertyId, month, year);

            const lines = await getBillExpenses(bill.id);
            const wifi = lines.find(l => l.label === 'Property: Wifi');

            expect(wifi).toBeDefined();
            expect(wifi!.amount).toBe(500);

            const refreshed = await getBillById(bill.id);
            expect(refreshed!.total_expenses).toBe(500);
        });

        it('keeps a discount negative and off the property expense ledger', async () => {
            const { propertyId, tenantIds } = await createIsolatedProperty(db, { rentPaymentType: 'current_month' });
            const { month, year } = periodMonthsAgo(0);

            await generateBillsForProperty(propertyId, month, year);
            const bill = await getBillFor(db, tenantIds[0], month, year);
            const totalBefore = bill.total_amount;

            await addExpenseToBill(bill.id, { label: 'Diwali waiver', amount: -500, is_recurring: false });
            await getBillsForPropertyMonth(propertyId, month, year);

            const lines = await getBillExpenses(bill.id);
            const discount = lines.find(l => l.label === 'Diwali waiver');

            // The mirror used to store Math.abs(), and the reconciler then rewrote the bill
            // line to +500, so a waiver increased the tenant's bill instead of reducing it
            expect(discount).toBeDefined();
            expect(discount!.amount).toBe(-500);
            expect(discount!.property_expense_id).toBeNull();

            const refreshed = await getBillById(bill.id);
            expect(refreshed!.total_expenses).toBe(-500);
            expect(refreshed!.total_amount).toBe(totalBefore - 500);

            const ledger = await db.select().from(propertyExpenses)
                .where(sql`${propertyExpenses.property_id} = ${propertyId}`);
            expect(ledger).toHaveLength(0);
        });

        it('removing one room share of a split expense leaves the other rooms untouched', async () => {
            const { propertyId, unitIds, tenantIds } = await createIsolatedProperty(db, {
                rentPaymentType: 'current_month',
                unitCount: 3,
            });
            const { month, year } = periodMonthsAgo(0);

            await generateBillsForProperty(propertyId, month, year);
            await createExpense({
                property_id: propertyId,
                amount: 3000,
                expense_type: 'Plumbing',
                frequency: 'one_time',
                distribute_type: 'rooms',
                distributed_unit_ids: JSON.stringify(unitIds),
                month,
                year,
            });

            // Distribution happens lazily on read
            await getBillsForPropertyMonth(propertyId, month, year);

            const bills = await Promise.all(tenantIds.map(id => getBillFor(db, id, month, year)));
            for (const b of bills) {
                expect(b.total_expenses).toBe(1000);
            }

            const firstRoomLines = await getBillExpenses(bills[0].id);
            const share = firstRoomLines.find(l => l.label === 'Property: Plumbing');
            expect(share).toBeDefined();

            await removeExpense(share!.id);
            await getBillsForPropertyMonth(propertyId, month, year);

            const afterFirst = await getBillById(bills[0].id);
            expect(afterFirst!.total_expenses).toBe(0);

            // The other two rooms keep the share they were already billed, and the remainder
            // is not re-split onto them
            for (const b of bills.slice(1)) {
                const other = await getBillById(b.id);
                expect(other!.total_expenses).toBe(1000);
            }

            // The source expense survives, since other rooms still depend on it
            const ledger = await db.select().from(propertyExpenses)
                .where(sql`${propertyExpenses.property_id} = ${propertyId}`);
            expect(ledger).toHaveLength(1);
        });

        it('restores a recurring expense the month after it was removed', async () => {
            const { propertyId, tenantIds } = await createIsolatedProperty(db, { rentPaymentType: 'current_month' });
            const prev = periodMonthsAgo(1);
            const current = periodMonthsAgo(0);

            await generateBillsForProperty(propertyId, prev.month, prev.year);
            const prevBill = await getBillFor(db, tenantIds[0], prev.month, prev.year);

            await addExpenseToBill(prevBill.id, { label: 'Wifi', amount: 500, is_recurring: true });

            const prevLines = await getBillExpenses(prevBill.id);
            const wifi = prevLines.find(l => l.label === 'Property: Wifi');
            expect(wifi).toBeDefined();

            // Removing a recurring expense applies to that month only
            await removeExpense(wifi!.id);
            const prevAfter = await getBillById(prevBill.id);
            expect(prevAfter!.total_expenses).toBe(0);

            await generateBillsForProperty(propertyId, current.month, current.year);
            await getBillsForPropertyMonth(propertyId, current.month, current.year);

            const currentBill = await getBillFor(db, tenantIds[0], current.month, current.year);
            const currentLines = await getBillExpenses(currentBill.id);

            const restored = currentLines.find(l => l.label === 'Property: Wifi');
            expect(restored).toBeDefined();
            expect(restored!.amount).toBe(500);

            // The zeroed marker must not be carried forward alongside it
            expect(currentLines.filter(l => l.label.endsWith('(Removed)'))).toHaveLength(0);
            expect(currentBill.total_expenses).toBe(500);
        });
    });
});
