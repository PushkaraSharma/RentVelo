import { setupTestDb, teardownTestDb } from './setupDb';
import { properties } from '../src/db/schema';
import { getPropertiesWithStats } from '../src/db/propertyService';

describe('Database Mapping Mock Test', () => {
    let db: any;

    beforeAll(async () => {
        db = await setupTestDb();
    });

    afterAll(() => {
        teardownTestDb();
    });

    it('should successfully perform migrations and insertions', async () => {
        // Insert a dummy property
        const res = await db.insert(properties).values({
            name: 'Test Setup Property',
            address: '123 Fake Street',
            type: 'pg',
        }).returning({ id: properties.id });

        expect(res[0].id).toBeGreaterThan(0);

        const allProps = await getPropertiesWithStats();
        console.log('allProps =>', JSON.stringify(allProps, null, 2));
        expect(allProps.length).toBe(1);
        expect(allProps[0].name).toBe('Test Setup Property');
    });
});
