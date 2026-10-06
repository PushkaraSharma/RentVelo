import { getDb } from '../db/database';
import { payments, properties, rentBills, tenants, units } from '../db/schema';

/** Fixed portfolio so Play Store captures look populated and stable. */
export async function seedScreenshotPortfolio() {
    const db = getDb();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const propertyRows = await db.insert(properties).values([
        {
            name: 'Sunshine PG',
            address: '12 Lake Road, Pune',
            type: 'pg',
            is_multi_unit: true,
        },
        {
            name: 'Green Valley Flats',
            address: '4B, Koregaon Park, Pune',
            type: 'building',
            is_multi_unit: true,
        },
    ]).returning({ id: properties.id });

    const sunshineId = propertyRows[0].id;
    const valleyId = propertyRows[1].id;

    const unitRows = await db.insert(units).values([
        { property_id: sunshineId, name: 'Room 101', rent_amount: 8000 },
        { property_id: sunshineId, name: 'Room 102', rent_amount: 9500 },
        { property_id: sunshineId, name: 'Room 103', rent_amount: 7500 },
        { property_id: valleyId, name: 'Flat 2B', rent_amount: 18000 },
        { property_id: valleyId, name: 'Flat 3A', rent_amount: 22000 },
    ]).returning({ id: units.id });

    const tenantRows = await db.insert(tenants).values([
        { property_id: sunshineId, unit_id: unitRows[0].id, name: 'Ananya Iyer', phone: '9876500101', status: 'active' },
        { property_id: sunshineId, unit_id: unitRows[1].id, name: 'Rohan Desai', phone: '9876500102', status: 'active' },
        { property_id: valleyId, unit_id: unitRows[3].id, name: 'Kavya Nair', phone: '9876500201', status: 'active' },
        { property_id: valleyId, unit_id: unitRows[4].id, name: 'Arjun Mehta', phone: '9876500202', status: 'active' },
    ]).returning({ id: tenants.id });

    await db.insert(rentBills).values([
        {
            property_id: sunshineId, unit_id: unitRows[0].id, tenant_id: tenantRows[0].id,
            month, year, rent_amount: 8000, total_amount: 8000, paid_amount: 8000, balance: 0, status: 'paid',
        },
        {
            property_id: sunshineId, unit_id: unitRows[1].id, tenant_id: tenantRows[1].id,
            month, year, rent_amount: 9500, previous_balance: 1500, total_amount: 11000, paid_amount: 5000, balance: 6000, status: 'partial',
        },
        {
            property_id: valleyId, unit_id: unitRows[3].id, tenant_id: tenantRows[2].id,
            month, year, rent_amount: 18000, total_amount: 18000, paid_amount: 18000, balance: 0, status: 'paid',
        },
        {
            property_id: valleyId, unit_id: unitRows[4].id, tenant_id: tenantRows[3].id,
            month, year, rent_amount: 22000, total_amount: 22000, paid_amount: 0, balance: 22000, status: 'pending',
        },
    ]);

    const billRows = await db.select({ id: rentBills.id, tenant_id: rentBills.tenant_id, property_id: rentBills.property_id, unit_id: rentBills.unit_id, paid_amount: rentBills.paid_amount })
        .from(rentBills);

    for (const bill of billRows) {
        if (!bill.paid_amount) continue;
        await db.insert(payments).values({
            property_id: bill.property_id,
            tenant_id: bill.tenant_id,
            unit_id: bill.unit_id,
            bill_id: bill.id,
            amount: bill.paid_amount,
            payment_type: 'rent',
            payment_method: bill.tenant_id === tenantRows[0].id ? 'upi' : 'cash',
            status: 'paid',
        });
    }
}
