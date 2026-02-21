import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql, InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const properties = sqliteTable('properties', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    address: text('address').notNull(),
    type: text('type', { enum: ['house', 'pg', 'flat', 'building', 'shop'] }).notNull(),
    image_uri: text('image_uri'),
    amenities: text('amenities'), // Stores JSON string
    is_multi_unit: integer('is_multi_unit', { mode: 'boolean' }).default(false),
    owner_name: text('owner_name'),
    owner_phone: text('owner_phone'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Property = InferSelectModel<typeof properties>;
export type NewProperty = InferInsertModel<typeof properties>;

export const units = sqliteTable('units', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    property_id: integer('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    floor: text('floor'),
    type: text('type'), // e.g., 1BHK, 2BHK, Studio
    remarks: text('remarks'),
    rent_amount: real('rent_amount').notNull(),
    rent_cycle: text('rent_cycle', { enum: ['first_of_month', 'relative'] }),
    is_metered: integer('is_metered', { mode: 'boolean' }).default(false),
    electricity_rate: real('electricity_rate'),
    electricity_fixed_amount: real('electricity_fixed_amount'),
    initial_electricity_reading: real('initial_electricity_reading'),
    water_rate: real('water_rate'),
    water_fixed_amount: real('water_fixed_amount'),
    initial_water_reading: real('initial_water_reading'),
    furnishing_type: text('furnishing_type', { enum: ['full', 'semi', 'none'] }),
    size: real('size'), // Sq. Ft.
    custom_amenities: text('custom_amenities'), // JSON string
    images: text('images'), // JSON string of URIs
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Unit = InferSelectModel<typeof units>;
export type NewUnit = InferInsertModel<typeof units>;

export const tenants = sqliteTable('tenants', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    property_id: integer('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    unit_id: integer('unit_id')
        .references(() => units.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    profession: text('profession'),
    guest_count: text('guest_count'),
    work_address: text('work_address'),
    id_proof_type: text('id_proof_type'),
    id_proof_number: text('id_proof_number'),
    emergency_contact_name: text('emergency_contact_name'),
    emergency_contact_phone: text('emergency_contact_phone'),
    photo_uri: text('photo_uri'),
    aadhaar_front_uri: text('aadhaar_front_uri'),
    aadhaar_back_uri: text('aadhaar_back_uri'),
    pan_uri: text('pan_uri'),
    move_in_date: integer('move_in_date', { mode: 'timestamp' }),
    rent_start_date: integer('rent_start_date', { mode: 'timestamp' }),
    move_out_date: integer('move_out_date', { mode: 'timestamp' }),
    lease_type: text('lease_type', { enum: ['monthly', 'yearly', 'fixed'] }),
    lease_period_value: integer('lease_period_value'),
    lease_period_unit: text('lease_period_unit', { enum: ['days', 'months', 'years'] }),
    lease_start_date: integer('lease_start_date', { mode: 'timestamp' }),
    lease_end_date: integer('lease_end_date', { mode: 'timestamp' }),
    security_deposit: real('security_deposit').default(0),
    advance_rent: real('advance_rent').default(0),
    balance_amount: real('balance_amount').default(0),
    status: text('status', { enum: ['active', 'inactive', 'archived'] }).default('active'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

export const payments = sqliteTable('payments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    property_id: integer('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    tenant_id: integer('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    unit_id: integer('unit_id')
        .references(() => units.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    payment_date: integer('payment_date', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    payment_type: text('payment_type', { enum: ['rent', 'security_deposit', 'advance', 'maintenance', 'other'] }),
    payment_method: text('payment_method', { enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'] }),
    status: text('status', { enum: ['pending', 'paid', 'overdue', 'cancelled'] }).default('pending'),
    notes: text('notes'),
    receipt_url: text('receipt_url'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;

export const meterReadings = sqliteTable('meter_readings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    property_id: integer('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    unit_id: integer('unit_id')
        .references(() => units.id, { onDelete: 'cascade' }),
    reading_type: text('reading_type', { enum: ['electricity', 'water'] }),
    previous_reading: real('previous_reading'),
    current_reading: real('current_reading').notNull(),
    reading_date: integer('reading_date', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    amount: real('amount'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type MeterReading = InferSelectModel<typeof meterReadings>;
export type NewMeterReading = InferInsertModel<typeof meterReadings>;

export const documents = sqliteTable('documents', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: integer('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    document_type: text('document_type'),
    document_name: text('document_name').notNull(),
    file_uri: text('file_uri').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

export const rentReceiptConfig = sqliteTable('rent_receipt_config', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    property_id: integer('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    logo_uri: text('logo_uri'),
    bank_name: text('bank_name'),
    bank_acc_number: text('bank_acc_number'),
    bank_ifsc: text('bank_ifsc'),
    bank_acc_holder: text('bank_acc_holder'),
    wallet_type: text('wallet_type'), // google_pay, paytm, phonepe, other
    wallet_phone: text('wallet_phone'),
    wallet_name: text('wallet_name'),
    upi_id: text('upi_id'),
    payment_qr_uri: text('payment_qr_uri'),
    signature_uri: text('signature_uri'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type RentReceiptConfig = InferSelectModel<typeof rentReceiptConfig>;
export type NewRentReceiptConfig = InferInsertModel<typeof rentReceiptConfig>;
