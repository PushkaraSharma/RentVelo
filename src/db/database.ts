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
        const columns = expoDb.getAllSync(`PRAGMA table_info('${tableName}')`) as any[];
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
    patchTable('properties', 'total_units', 'integer');
    patchTable('properties', 'build_date', 'text');
    patchTable('properties', 'owner_email', 'text');

    // Units
    patchTable('units', 'room_group', 'text');
    patchTable('units', 'bed_number', 'text');
    patchTable('units', 'sequence', 'integer');
    patchTable('units', 'payment_account_id', 'integer');

    // Properties — default payment account
    patchTable('properties', 'default_payment_account_id', 'integer');

    // Bill Expenses
    patchTable('bill_expenses', 'property_expense_id', 'integer');

    // Payment accounts (global vault). Existing installs often skip Drizzle.
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL,
        logo_uri text,
        bank_name text,
        bank_acc_number text,
        bank_ifsc text,
        bank_acc_holder text,
        wallet_type text,
        wallet_phone text,
        wallet_name text,
        upi_id text,
        payment_qr_uri text,
        signature_uri text,
        created_at integer DEFAULT (strftime('%s', 'now')),
        updated_at integer DEFAULT (strftime('%s', 'now'))
      );
    `);

    migrateReceiptConfigsToPaymentAccountsSync();
    
    console.log('✅ Database schema check completed');
      
  } catch (e) {
    console.warn('Database defensive repair failed, but continuing...', e);
  }
};

const hasPaymentValue = (value: unknown): boolean => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};

const migrateReceiptConfigsToPaymentAccountsSync = () => {
  try {
    const tables = expoDb.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('payment_accounts', 'rent_receipt_config', 'properties')"
    ) as { name: string }[];
    const tableNames = new Set(tables.map((t) => t.name));
    if (!tableNames.has('payment_accounts') || !tableNames.has('properties')) return;

    const unmapped = expoDb.getAllSync(
      `SELECT id, name FROM properties WHERE default_payment_account_id IS NULL`
    ) as { id: number; name: string }[];

    for (const property of unmapped) {
      if (!tableNames.has('rent_receipt_config')) continue;
      const configs = expoDb.getAllSync(
        `SELECT * FROM rent_receipt_config WHERE property_id = ? LIMIT 1`,
        [property.id]
      ) as any[];
      const config = configs[0];
      if (!config) continue;

      const hasAny = [
        config.logo_uri, config.bank_name, config.bank_acc_number, config.bank_ifsc,
        config.bank_acc_holder, config.wallet_type, config.wallet_phone, config.wallet_name,
        config.upi_id, config.payment_qr_uri, config.signature_uri,
      ].some(hasPaymentValue);
      if (!hasAny) continue;

      const inserted = expoDb.runSync(
        `INSERT INTO payment_accounts (
          name, logo_uri, bank_name, bank_acc_number, bank_ifsc, bank_acc_holder,
          wallet_type, wallet_phone, wallet_name, upi_id, payment_qr_uri, signature_uri
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          property.name || 'Payment account',
          config.logo_uri ?? null,
          config.bank_name ?? null,
          config.bank_acc_number ?? null,
          config.bank_ifsc ?? null,
          config.bank_acc_holder ?? null,
          config.wallet_type ?? null,
          config.wallet_phone ?? null,
          config.wallet_name ?? null,
          config.upi_id ?? null,
          config.payment_qr_uri ?? null,
          config.signature_uri ?? null,
        ]
      );

      expoDb.runSync(
        `UPDATE properties SET default_payment_account_id = ? WHERE id = ?`,
        [inserted.lastInsertRowId, property.id]
      );
    }
  } catch (err) {
    console.warn('Failed to migrate receipt configs to payment accounts:', err);
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

export const ensureRentBillUniqueness = () => {
  expoDb.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS rent_bills_unit_tenant_period_unique
    ON rent_bills (unit_id, tenant_id, month, year);
  `);
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
