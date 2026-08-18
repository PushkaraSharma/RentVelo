import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync, __resetDatabase } from './__mocks__/expo-sqlite';
import { syncDatabaseSchema } from '../src/db/database';

// Import the generated SQL migrations bundle from drizzle-kit
import migrations from '../drizzle/migrations';

export async function setupTestDb() {
    // Get the mock DB instance (backed by better-sqlite3)
    const expoDb = openDatabaseSync('test.db') as any;
    const db = drizzle(expoDb);

    // Apply migrations to the in-memory database
    // This physically creates all tables required for the schema
    await migrate(db, migrations);

    // Mirror the app boot sequence: App.tsx runs the migrations and then this repair pass.
    // The generated migrations have drifted from src/db/schema.ts, and this is where the
    // app adds the missing columns back. Without it the test schema is not the app schema.
    syncDatabaseSchema();

    return db;
}

export function teardownTestDb() {
    __resetDatabase();
}
