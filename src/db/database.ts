import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import migrations from '../../drizzle/migrations';

const DATABASE_NAME = 'rentvelo.db';

// Use openDatabaseSync for synchronous initialization
const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
// Enable foreign keys
expoDb.execSync('PRAGMA foreign_keys = ON;');

// Defensive repair: ensure columns from migration 0013 exist even if migration was partially applied.
// Each ALTER TABLE is harmless if the column already exists (error is caught and ignored).
const safeAddColumn = (table: string, column: string, type: string, defaultVal?: string) => {
  try {
    const def = defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : '';
    expoDb.execSync(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}${def};`);
  } catch (e) {
    // Column already exists — safe to ignore
  }
};

safeAddColumn('properties', 'auto_increment_rent_enabled', 'integer', '0');
safeAddColumn('properties', 'auto_increment_percent', 'real');
safeAddColumn('properties', 'auto_increment_frequency', 'text');
safeAddColumn('properties', 'last_increment_date', 'integer');

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

// Export migrations
export { migrations };
