import { properties, units, tenants, rentBills, payments, billExpenses } from '../src/db/schema';
import { generateBillsForProperty, recalculateBill } from '../src/db/billService';
import { and, eq } from 'drizzle-orm';

// Random helper
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];
const randomBool = (probability = 0.5) => Math.random() < probability;

export async function generateRealUsageData(db: any) {
    console.log('🌱 Starting database seed...');

    const propertyNames = ['Sunshine PG', 'Green Valley Flats', 'Gokuldham Society', 'Sharma Niwas', 'Co-living Spaze', 'Elite Apartments', 'Standalone House'];
    const pTypes: ("pg" | "house" | "flat" | "building" | "shop")[] = ['pg', 'building', 'building', 'flat', 'pg', 'building', 'house'];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    for (let pMap = 0; pMap < 7; pMap++) {
        // --- 1. Create Property ---
        const isMulti = pTypes[pMap] !== 'house' && pTypes[pMap] !== 'flat';
        const res = await db.insert(properties).values({
            name: propertyNames[pMap],
            address: `Block ${pMap + 1}, Sector ${randomInt(1, 50)}, Fake City`,
            type: pTypes[pMap],
            is_multi_unit: isMulti,
            rent_payment_type: 'previous_month'
        }).returning({ id: properties.id });
        const propertyId = res[0].id;

        // --- 2. Create Units ---
        const numUnits = isMulti ? randomInt(6, 15) : 1;
        const insertedUnits = [];
        for (let u = 0; u < numUnits; u++) {
            const unitType = randomElement(['1BHK', '2BHK', 'Single Room', 'Double Sharing']);
            const baseRent = randomInt(5000, 25000); // 5k to 25k
            const isMetered = randomBool(0.6); // 60% chance metered

            const unitRes = await db.insert(units).values({
                property_id: propertyId,
                name: isMulti ? `Room ${u + 101}` : 'Main Property',
                type: unitType,
                rent_amount: baseRent,
                rent_cycle: 'first_of_month',
                is_metered: isMetered,
                electricity_rate: isMetered ? 8 : null,
                electricity_fixed_amount: !isMetered ? randomInt(300, 1000) : null,
            }).returning({ id: units.id, rent_amount: units.rent_amount });

            insertedUnits.push(unitRes[0]);
        }

        // --- 3. Create Tenants ---
        for (const unit of insertedUnits) {
            // 90% chance to have a tenant
            if (randomBool(0.90)) {
                // Generate a move-in date between 1 to 14 months ago
                const monthsAgo = randomInt(1, 14);
                const moveInDate = new Date(currentYear, currentMonth - 1 - monthsAgo, randomInt(1, 28));

                const hasAdvance = randomBool(0.3); // 30% have advance rent
                const advanceAmount = hasAdvance ? randomInt(5000, parseInt(String(unit.rent_amount))) : 0;

                const tenantRes = await db.insert(tenants).values({
                    property_id: propertyId,
                    unit_id: unit.id,
                    name: `Tenant ${unit.id}-${randomInt(100, 999)}`,
                    phone: `98765${randomInt(10000, 99999)}`,
                    move_in_date: moveInDate,
                    rent_start_date: moveInDate,
                    security_deposit: randomInt(5000, 50000),
                    advance_rent: advanceAmount,
                    status: 'active',
                    lease_type: 'monthly',
                }).returning({ id: tenants.id, rent_start_date: tenants.rent_start_date });
            }
        }
    }

    console.log('✅ Properties, Units, and Tenants created.');

    // --- 4. Generate Bills over 12 Months ---
    // We go from 12 months ago up to the current month to simulate realistic passage of time
    for (let t = 11; t >= 0; t--) {
        let simMonth = currentMonth - t;
        let simYear = currentYear;
        if (simMonth <= 0) {
            simMonth += 12;
            simYear--;
        }

        console.log(`Generating bills and payments for ${simMonth}/${simYear}...`);

        const allProps = await db.select({ id: properties.id }).from(properties);
        for (const prop of allProps) {
            // A. Generate the bills for the property
            await generateBillsForProperty(prop.id, simMonth, simYear);

            // B. Find bills generated for this month
            const monthBills = await db.select().from(rentBills)
                .where(
                    and(
                        eq(rentBills.property_id, prop.id),
                        eq(rentBills.month, simMonth),
                        eq(rentBills.year, simYear)
                    )
                );

            // C. Generate payments for these bills
            for (const bill of monthBills) {
                // Determine payment behavior
                const payBehavior = Math.random();
                let amountToPay = 0;

                if (payBehavior < 0.85) { // 85% pay full
                    amountToPay = bill.total_amount || 0;
                } else if (payBehavior < 0.95) { // 10% pay partial
                    amountToPay = Math.floor((bill.total_amount || 0) * randomElement([0.5, 0.75]));
                } // 5% don't pay anything

                // Only pay if the amount is greater than 0
                if (amountToPay > 0) {
                    // Simulate paying 1-5 days after the 1st of the month
                    const paymentDate = new Date(simYear, simMonth - 1, randomInt(1, 5));

                    const paymentRes = await db.insert(payments).values({
                        property_id: bill.property_id,
                        tenant_id: bill.tenant_id,
                        unit_id: bill.unit_id,
                        bill_id: bill.id,
                        amount: amountToPay,
                        payment_date: paymentDate,
                        payment_type: 'rent',
                        payment_method: randomElement(['upi', 'cash', 'bank_transfer']),
                        status: 'paid',
                    }).returning({ id: payments.id });

                    // Simulate the ReceivePaymentModal logic
                    await recalculateBill(bill.id);
                }
            }
        }
    }

    console.log('🌱 Database seeing complete.');
}
