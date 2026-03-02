import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import migrations from '../../drizzle/migrations';

const DATABASE_NAME = 'rentvelo.db';

// Use openDatabaseSync for synchronous initialization
const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
// Enable foreign keys
expoDb.execSync('PRAGMA foreign_keys = ON;');

// Defensive repair: only needed if migration 0013 was PARTIALLY applied.
// Drizzle's expo-sqlite migrator tracks migrations by created_at (folderMillis),
// NOT by hash (hash is always ''). Migration 0013's folderMillis = 1772560957000.
// If Drizzle already recorded it, but columns are missing, we patch them.
// If Drizzle hasn't recorded it yet, we do NOT interfere — Drizzle will handle it.
try {
  const migrationTable = expoDb.getAllSync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
  ) as any[];

  if (migrationTable.length > 0) {
    // Drizzle uses: SELECT ... ORDER BY created_at DESC LIMIT 1
    // Then runs migrations where created_at > lastDbMigration.created_at
    // So if the last recorded created_at >= 0013's folderMillis, 0013 was "applied"
    const lastMigration = expoDb.getAllSync(
      "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1"
    ) as any[];

    const MIGRATION_0013_TIMESTAMP = 1772560957000;

    if (lastMigration.length > 0 && Number(lastMigration[0].created_at) >= MIGRATION_0013_TIMESTAMP) {
      // Drizzle thinks 0013 ran. Patch any missing columns (partial apply scenario).
      const columns = expoDb.getAllSync("PRAGMA table_info(properties)") as any[];
      const colNames = new Set(columns.map((c: any) => c.name));

      const patch = (col: string, type: string, def?: string) => {
        if (!colNames.has(col)) {
          const d = def !== undefined ? ` DEFAULT ${def}` : '';
          expoDb.execSync(`ALTER TABLE \`properties\` ADD COLUMN \`${col}\` ${type}${d};`);
        }
      };

      patch('auto_increment_rent_enabled', 'integer', '0');
      patch('auto_increment_percent', 'real');
      patch('auto_increment_frequency', 'text');
      patch('last_increment_date', 'integer');
    }
    // If 0013 hasn't been recorded yet, do nothing — Drizzle will run it.
  }
} catch (e) {
  // Safe to ignore — fresh install or table doesn't exist yet
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

// Export migrations
export { migrations };
