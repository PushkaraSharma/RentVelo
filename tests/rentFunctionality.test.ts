import { setupTestDb, teardownTestDb } from './setupDb';
import { generateRealUsageData } from './seedDatabase';
import { properties, units, tenants, rentBills, payments, billExpenses } from '../src/db/schema';
import { getDashboardData } from '../src/db/paymentService'; // or from index.ts
import { generateBillsForProperty, recalculateBill } from '../src/db/billService';
import { sql } from 'drizzle-orm';

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
        // Find a random multi-month tenant
        const tResult = await db.select().from(tenants).limit(1);
        const tenant = tResult[0];

        // Create a bill for month 1 and month 2
        await generateBillsForProperty(tenant.property_id, 1, 2027);
        await generateBillsForProperty(tenant.property_id, 2, 2027);

        // Get month 1 bill
        const [bill1] = await db.select().from(rentBills)
            .where(sql`${rentBills.tenant_id} = ${tenant.id} AND ${rentBills.month} = 1 AND ${rentBills.year} = 2027`);

        // Pay exactly half
        const halfPaid = Math.floor(bill1.total_amount / 2);
        const [payment] = await db.insert(payments).values({
            property_id: tenant.property_id,
            tenant_id: tenant.id,
            unit_id: tenant.unit_id,
            bill_id: bill1.id,
            amount: halfPaid,
            payment_date: new Date(),
            payment_type: 'rent',
            payment_method: 'cash',
            status: 'paid'
        }).returning({ id: payments.id });

        await recalculateBill(bill1.id);

        // Expect bill 2 previous_balance to be exactly the remainder
        const [bill2] = await db.select().from(rentBills)
            .where(sql`${rentBills.tenant_id} = ${tenant.id} AND ${rentBills.month} = 2 AND ${rentBills.year} = 2027`);

        expect(bill2.previous_balance).toBe(bill1.total_amount - halfPaid);
    });

    // -----------------------------------------------------
    // T7: BILL IDEMPOTENCY
    // -----------------------------------------------------
    it('T7 & T8: Calling generateBillsForProperty twice does not create duplicates & vacant units are skipped', async () => {
        const [prop] = await db.select().from(properties).limit(1);

        await generateBillsForProperty(prop.id, 5, 2028);
        const firstRunCountResult = await db.select({ count: sql<number>`count(*)` }).from(rentBills)
            .where(sql`${rentBills.property_id} = ${prop.id} AND ${rentBills.month} = 5 AND ${rentBills.year} = 2028`);

        await generateBillsForProperty(prop.id, 5, 2028);
        const secondRunCountResult = await db.select({ count: sql<number>`count(*)` }).from(rentBills)
            .where(sql`${rentBills.property_id} = ${prop.id} AND ${rentBills.month} = 5 AND ${rentBills.year} = 2028`);

        // Assert idempotency
        expect(secondRunCountResult[0].count).toBe(firstRunCountResult[0].count);

        // Ensure that vacant units got skipped (bills generated should equal active tenants)
        const activeTenants = await db.select({ count: sql<number>`count(*)` }).from(tenants)
            .where(sql`${tenants.property_id} = ${prop.id} AND ${tenants.status} = 'active'`);

        expect(firstRunCountResult[0].count).toBe(activeTenants[0].count);
    });

    // -----------------------------------------------------
    // T9: OVERPAID STATUS
    // -----------------------------------------------------
    it('T9 & T6: Paying more than total sets overpaid status and makes advance rent on next bill', async () => {
        const [tenant] = await db.select().from(tenants).limit(1);
        await generateBillsForProperty(tenant.property_id, 8, 2029);

        const [bill] = await db.select().from(rentBills)
            .where(sql`${rentBills.tenant_id} = ${tenant.id} AND ${rentBills.month} = 8 AND ${rentBills.year} = 2029`);

        const overpayAmount = bill.total_amount + 5000;

        await db.insert(payments).values({
            property_id: tenant.property_id,
            tenant_id: tenant.id,
            unit_id: tenant.unit_id,
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
        await generateBillsForProperty(tenant.property_id, 9, 2029);
        const [nextBill] = await db.select().from(rentBills)
            .where(sql`${rentBills.tenant_id} = ${tenant.id} AND ${rentBills.month} = 9 AND ${rentBills.year} = 2029`);

        expect(nextBill.previous_balance).toBe(-5000);
    });
});
