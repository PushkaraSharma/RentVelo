import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import migrations from '../../drizzle/migrations';

const DATABASE_NAME = 'rentvelo.db';

// Use openDatabaseSync for synchronous initialization
const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
// Enable foreign keys
expoDb.execSync('PRAGMA foreign_keys = ON;');

// Defensive repair: fixes inconsistent states where 0013 partially ran or table exists but isn't recorded.
try {
  const MIGRATION_0013_TIMESTAMP = 1772530225637;

  // 1. Check if property_expenses already exists (the primary cause of crashes)
  const expensesTable = expoDb.getAllSync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='property_expenses'"
  ) as any[];

  if (expensesTable.length > 0) {
    // If the table exists, we MUST ensure Drizzle doesn't try to CREATE it again.
    // We do this by manually marking migration 0013 as "done" in Drizzle's internal table.
    expoDb.execSync(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (id integer PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at integer);`);
    expoDb.execSync(`INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES ('', ${MIGRATION_0013_TIMESTAMP});`);

    // 2. Since 0013 is now "skipped", we must manually ensure all its other changes (ALTER TABLEs) are applied.
    const patchTable = (tableName: string, col: string, type: string, def?: string) => {
      const columns = expoDb.getAllSync(`PRAGMA table_info(\`${tableName}\`)`) as any[];
      const exists = columns.some((c: any) => c.name === col);
      if (!exists) {
        const d = def !== undefined ? ` DEFAULT ${def}` : '';
        expoDb.execSync(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${type}${d};`);
      }
    };

    // Properties
    patchTable('properties', 'auto_increment_rent_enabled', 'integer', '0');
    patchTable('properties', 'auto_increment_percent', 'real');
    patchTable('properties', 'auto_increment_amount', 'real');
    patchTable('properties', 'auto_increment_frequency', 'text');
    patchTable('properties', 'last_increment_date', 'integer');

    // Units
    patchTable('units', 'room_group', 'text');
    patchTable('units', 'bed_number', 'text');

    // Bill Expenses
    patchTable('bill_expenses', 'property_expense_id', 'integer');
  }
} catch (e) {
  console.warn('Database defensive repair failed, but continuing...', e);
}

export const db = drizzle(expoDb);

export const initDatabase = async (): Promise<void> => {
  // Database is already initialized synchronously
  console.log('✅ Database initialized synchronously with Drizzle');
};

export const getDb = () => {
  return db;
};

// For backward compatibility if anything still uses getDatabase
export const getDatabase = () => {
  return expoDb;
};

export const closeDatabase = () => {
    try {
        expoDb.closeSync();
        console.log('✅ SQLite Database connection closed');
    } catch (e) {
        console.error('Failed to close SQLite Database:', e);
    }
};

// Export migrations
export { migrations };
