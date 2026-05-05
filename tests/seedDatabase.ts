import { properties, units, tenants, rentBills, payments, billExpenses, meterReadings, documents, rentReceiptConfig, notifications } from '../src/db/schema';
import { generateBillsForProperty, recalculateBill } from '../src/db/billService';
import { and, eq } from 'drizzle-orm';

// Random helper
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];
const randomBool = (probability = 0.5) => Math.random() < probability;

export async function generateRealUsageData(db: any) {
    console.log('🌱 Starting database seed...');
    console.log('🧹 Purging all existing data...');

    // Wipe all tables in order respecting foreign keys (cascades usually handle this, but being thorough)
    await db.delete(notifications).execute();
    await db.delete(rentReceiptConfig).execute().catch(() => { }); // might not exist
    await db.delete(documents).execute();
    await db.delete(meterReadings).execute();
    await db.delete(billExpenses).execute();
    await db.delete(payments).execute();
    await db.delete(rentBills).execute();
    await db.delete(tenants).execute();
    await db.delete(units).execute();
    await db.delete(properties).execute();

    console.log('✨ Database clean. Injecting new random data...');

    const propertyNames = ['Sunshine PG', 'Green Valley Flats', 'Gokuldham Society', 'Sharma Niwas', 'Co-living Spaze', 'Elite Apartments', 'Standalone House'];
    const pTypes: ("pg" | "house" | "flat" | "building" | "shop")[] = ['pg', 'building', 'building', 'flat', 'pg', 'building', 'house'];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    for (let pMap = 0; pMap < 7; pMap++) {
        // --- 1. Create Property ---
        const isMulti = pTypes[pMap] !== 'house' && pTypes[pMap] !== 'flat';
        
        // Varying settings per property
        const rentPaymentType = pMap % 2 === 0 ? 'current_month' : 'previous_month';
        const hasPenalty = pMap < 3; // First 3 properties have penalties
        const hasAutoIncrement = pMap === 1 || pMap === 4;
        const creationDate = new Date(currentYear, currentMonth - 1 - 18, 1); // 18 months ago

        const res = await db.insert(properties).values({
            name: propertyNames[pMap],
            address: `Block ${pMap + 1}, Sector ${randomInt(1, 50)}, Fake City`,
            type: pTypes[pMap],
            is_multi_unit: isMulti,
            rent_payment_type: rentPaymentType,
            penalty_grace_period_days: hasPenalty ? 5 : null,
            penalty_amount_per_day: hasPenalty ? 50 : null,
            auto_increment_rent_enabled: hasAutoIncrement,
            auto_increment_percent: hasAutoIncrement ? 5 : null,
            auto_increment_frequency: hasAutoIncrement ? 'yearly' : null,
            last_increment_date: hasAutoIncrement ? creationDate : null,
        }).returning({ id: properties.id });
        const propertyId = res[0].id;

        // --- 2. Create Units ---
        const numUnits = isMulti ? randomInt(6, 15) : 1;
        const insertedUnits = [];
        const isPG = pTypes[pMap] === 'pg';

        for (let u = 0; u < numUnits; u++) {
            const unitType = randomElement(['1BHK', '2BHK', 'Single Room', 'Double Sharing']);
            const baseRent = randomInt(5000, 25000); // 5k to 25k
            const isMetered = randomBool(0.6); // 60% chance metered

            const roomGroup = isPG ? `Room ${Math.floor(u / 2) + 101}` : null;
            const bedNumber = isPG ? `Bed ${(u % 2) + 1}` : null;

            const unitRes = await db.insert(units).values({
                property_id: propertyId,
                name: isPG ? `${roomGroup} - ${bedNumber}` : (isMulti ? `Unit ${u + 101}` : 'Main Property'),
                type: unitType,
                rent_amount: baseRent,
                rent_cycle: 'first_of_month',
                is_metered: isMetered,
                electricity_rate: isMetered ? 8 : null,
                electricity_fixed_amount: !isMetered ? randomInt(300, 1000) : null,
                initial_electricity_reading: isMetered ? 100 : null,
                water_rate: isMetered ? 15 : null,
                water_fixed_amount: !isMetered ? 200 : null,
                initial_water_reading: isMetered ? 50 : null,
                room_group: roomGroup,
                bed_number: bedNumber,
            }).returning({ id: units.id, rent_amount: units.rent_amount });

            insertedUnits.push(unitRes[0]);
        }

        // --- 3. Create Tenants ---
        for (const unit of insertedUnits) {
            // 90% chance to have a tenant
            if (randomBool(0.90)) {
                // Scenario: Some tenants are old (to test auto-increment), some are new
                const monthsAgo = randomElement([2, 5, 14, 24]); 
                const moveInDate = new Date(currentYear, currentMonth - 1 - monthsAgo, randomInt(1, 28));
                
                // Scenario: Some tenants move out mid-month (to test pro-rata)
                const willMoveOutMidMonth = randomBool(0.1); // 10% chance
                const moveOutDate = willMoveOutMidMonth ? new Date(currentYear, currentMonth - 1, randomInt(5, 15)) : null;

                const hasAdvance = randomBool(0.3); // 30% have advance rent
                const advanceAmount = hasAdvance ? randomInt(5000, parseInt(String(unit.rent_amount))) : 0;

                const leaseType = randomElement(['monthly', 'fixed', 'yearly']);
                const leaseEndDate = leaseType === 'fixed' 
                    ? new Date(moveInDate.getTime() + (randomInt(6, 12) * 30 * 24 * 60 * 60 * 1000))
                    : (leaseType === 'yearly' ? new Date(moveInDate.getTime() + (365 * 24 * 60 * 60 * 1000)) : null);

                const tenantRes = await db.insert(tenants).values({
                    property_id: propertyId,
                    unit_id: unit.id,
                    name: `Tenant ${unit.id}-${randomInt(100, 999)}`,
                    phone: `98765${randomInt(10000, 99999)}`,
                    move_in_date: moveInDate,
                    rent_start_date: moveInDate,
                    move_out_date: moveOutDate,
                    security_deposit: randomInt(5000, 50000),
                    advance_rent: advanceAmount,
                    status: moveOutDate && moveOutDate < now ? 'inactive' : 'active',
                    lease_type: leaseType as any,
                    lease_end_date: leaseEndDate,
                }).returning({ id: tenants.id, rent_start_date: tenants.rent_start_date });

                // If a tenant moved out mid-month, maybe another one moves in shortly after?
                if (willMoveOutMidMonth && moveOutDate) {
                    const newMoveIn = new Date(moveOutDate.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 days later
                    if (newMoveIn < now) {
                        await db.insert(tenants).values({
                            property_id: propertyId,
                            unit_id: unit.id,
                            name: `Replacement ${unit.id}-${randomInt(100, 999)}`,
                            phone: `90000${randomInt(10000, 99999)}`,
                            move_in_date: newMoveIn,
                            rent_start_date: newMoveIn,
                            status: 'active',
                            lease_type: 'monthly',
                        }).execute();
                    }
                }
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

            // C. Generate payments and expenses for these bills
            for (const bill of monthBills) {
                // Determine payment behavior
                const payBehavior = Math.random();
                let amountToPay = 0;

                // Add random bill expenses (15% chance)
                if (randomBool(0.15)) {
                    await db.insert(billExpenses).values({
                        bill_id: bill.id,
                        label: randomElement(['Tap Repair', 'Fan Repair', 'Cleaning Fee', 'Society Fee']),
                        amount: randomInt(100, 1000),
                        is_recurring: false,
                    }).execute();
                }

                if (payBehavior < 0.85) { // 85% pay full
                    amountToPay = bill.total_amount || 0;
                } else if (payBehavior < 0.95) { // 10% pay partial
                    amountToPay = Math.floor((bill.total_amount || 0) * randomElement([0.5, 0.75]));
                } // 5% don't pay anything

                // Only pay if the amount is greater than 0
                if (amountToPay > 0) {
                    // Simulate paying 1-15 days after the 1st of the month (some late to trigger penalty logic later)
                    const paymentDate = new Date(simYear, simMonth - 1, randomInt(1, 15));

                    await db.insert(payments).values({
                        property_id: bill.property_id,
                        tenant_id: bill.tenant_id,
                        unit_id: bill.unit_id,
                        bill_id: bill.id,
                        amount: amountToPay,
                        payment_date: paymentDate,
                        payment_type: 'rent',
                        payment_method: randomElement(['upi', 'cash', 'bank_transfer']),
                        status: 'paid',
                    }).execute();
                }

                // Recalculate bill to apply expenses, penalties, and update balances
                await recalculateBill(bill.id);
            }
        }
    }

    console.log('🌱 Simulating one future pending rent bill to trigger notifications...');
    const futureMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const futureYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    // Pick the first property to slap a future bill on 
    const targetProp = await db.select({ id: properties.id }).from(properties).limit(1);
    if (targetProp.length > 0) {
        await generateBillsForProperty(targetProp[0].id, futureMonth, futureYear);
    }

    console.log('🌱 Database seeing complete.');
}
