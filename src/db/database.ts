import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import migrations from '../../drizzle/migrations';

const DATABASE_NAME = 'rentvelo.db';

// Use openDatabaseSync for synchronous initialization
const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
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
