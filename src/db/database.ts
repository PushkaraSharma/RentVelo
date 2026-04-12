import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import migrations from '../../drizzle/migrations';

const DATABASE_NAME = 'rentvelo.db';

// Use openDatabaseSync for synchronous initialization
let expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
// Enable foreign keys
expoDb.execSync('PRAGMA foreign_keys = ON;');

// Defensive repair: fixes inconsistent states where 0013 partially ran or table exists but isn't recorded.
export let db = drizzle(expoDb);

export const syncDatabaseSchema = (forceRefresh = false) => {
  try {
    if (forceRefresh) {
        // After a file restore, we must re-open the handle to ensure we are pointing to the new disk content
        expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
        expoDb.execSync('PRAGMA foreign_keys = ON;');
        // Re-initialize drizzle instance with the new handle
        db = drizzle(expoDb);
        console.log('🔄 Database handle and Drizzle instance refreshed');
    }
    // 1. Check if property_expenses already exists (the primary cause of crashes)
    const expensesTable = expoDb.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='property_expenses'"
    ) as any[];

    if (expensesTable.length > 0) {
      // If the table exists, we MUST ensure Drizzle doesn't try to CREATE it again.
      // We do this by manually marking migration 0013 as "done" in Drizzle's internal table.
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (id integer PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at integer);`);
      
      const MIGRATIONS = [
        1772530225637, // 0013
        1774766534121, // 0014
        1774889875804  // 0015
      ];

      MIGRATIONS.forEach(ts => {
        expoDb.execSync(`INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES ('manual_hotfix', ${ts});`);
      });
    }

    // Since we've had schema sync issues across different test devices, we aggressively patch missing columns individually.
    const patchTable = (tableName: string, col: string, type: string, def?: string) => {
      try {
        const columns = expoDb.getAllSync(`PRAGMA table_info(\`${tableName}\`)`) as any[];
        if (columns.length === 0) return; // Table not created yet
        
        const exists = columns.some((c: any) => c.name === col);
        if (!exists) {
          console.log(`🔧 Patching ${tableName}: adding ${col}...`);
          const d = def !== undefined ? ` DEFAULT ${def}` : '';
          expoDb.execSync(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${type}${d};`);
        }
      } catch (err) {
        console.warn(`Failed to patch table ${tableName}:`, err);
      }
    };

    // Properties
    patchTable('properties', 'auto_increment_rent_enabled', 'integer', '0');
    patchTable('properties', 'auto_increment_percent', 'real');
    patchTable('properties', 'auto_increment_amount', 'real');
    patchTable('properties', 'auto_increment_frequency', 'text');
    patchTable('properties', 'last_increment_date', 'integer');
    patchTable('properties', 'total_floors', 'integer');

    // Units
    patchTable('units', 'room_group', 'text');
    patchTable('units', 'bed_number', 'text');
    patchTable('units', 'sequence', 'integer');

    // Bill Expenses
    patchTable('bill_expenses', 'property_expense_id', 'integer');
    
    console.log('✅ Database schema check completed');
      
  } catch (e) {
    console.warn('Database defensive repair failed, but continuing...', e);
  }
};

// Run once on boot
syncDatabaseSchema();

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
