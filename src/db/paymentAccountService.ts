import { getDb } from './database';
import {
    paymentAccounts,
    properties,
    units,
    rentReceiptConfig,
    PaymentAccount,
    NewPaymentAccount,
    RentReceiptConfig,
} from './schema';
import { eq, inArray } from 'drizzle-orm';

export { PaymentAccount, NewPaymentAccount };

export type ReceiptConfigLike = Pick<
    RentReceiptConfig,
    | 'logo_uri'
    | 'bank_name'
    | 'bank_acc_number'
    | 'bank_ifsc'
    | 'bank_acc_holder'
    | 'wallet_type'
    | 'wallet_phone'
    | 'wallet_name'
    | 'upi_id'
    | 'payment_qr_uri'
    | 'signature_uri'
>;

const PAYMENT_FIELDS: (keyof ReceiptConfigLike)[] = [
    'logo_uri',
    'bank_name',
    'bank_acc_number',
    'bank_ifsc',
    'bank_acc_holder',
    'wallet_type',
    'wallet_phone',
    'wallet_name',
    'upi_id',
    'payment_qr_uri',
    'signature_uri',
];

export const hasAnyPaymentDetails = (row: Partial<ReceiptConfigLike> | null | undefined): boolean => {
    if (!row) return false;
    return PAYMENT_FIELDS.some((key) => {
        const value = row[key];
        return value !== null && value !== undefined && String(value).trim() !== '';
    });
};

export const accountToReceiptConfig = (account: PaymentAccount | null): ReceiptConfigLike | null => {
    if (!account) return null;
    return {
        logo_uri: account.logo_uri,
        bank_name: account.bank_name,
        bank_acc_number: account.bank_acc_number,
        bank_ifsc: account.bank_ifsc,
        bank_acc_holder: account.bank_acc_holder,
        wallet_type: account.wallet_type,
        wallet_phone: account.wallet_phone,
        wallet_name: account.wallet_name,
        upi_id: account.upi_id,
        payment_qr_uri: account.payment_qr_uri,
        signature_uri: account.signature_uri,
    };
};

export const getAllPaymentAccounts = async (): Promise<PaymentAccount[]> => {
    const db = getDb();
    return await db.select().from(paymentAccounts).orderBy(paymentAccounts.created_at);
};

export const getPaymentAccountById = async (id: number): Promise<PaymentAccount | null> => {
    const db = getDb();
    const result = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).limit(1);
    return result[0] || null;
};

export const createPaymentAccount = async (data: NewPaymentAccount): Promise<number> => {
    const db = getDb();
    const result = await db.insert(paymentAccounts).values(data).returning({ id: paymentAccounts.id });
    return result[0].id;
};

export const updatePaymentAccount = async (id: number, data: Partial<NewPaymentAccount>): Promise<void> => {
    const db = getDb();
    await db.update(paymentAccounts)
        .set({ ...data, updated_at: new Date() })
        .where(eq(paymentAccounts.id, id));
};

export const getPaymentAccountUsage = async (accountId: number): Promise<{
    defaultPropertyIds: number[];
    assignedUnitIds: number[];
}> => {
    const db = getDb();
    const defaultProps = await db.select({ id: properties.id })
        .from(properties)
        .where(eq(properties.default_payment_account_id, accountId));
    const assignedUnits = await db.select({ id: units.id })
        .from(units)
        .where(eq(units.payment_account_id, accountId));
    return {
        defaultPropertyIds: defaultProps.map((p) => p.id),
        assignedUnitIds: assignedUnits.map((u) => u.id),
    };
};

export const deletePaymentAccount = async (id: number): Promise<{ success: boolean; reason?: string }> => {
    const usage = await getPaymentAccountUsage(id);
    if (usage.defaultPropertyIds.length > 0 || usage.assignedUnitIds.length > 0) {
        return {
            success: false,
            reason: 'This account is still assigned to a property or rooms. Reassign them first.',
        };
    }
    const db = getDb();
    await db.delete(paymentAccounts).where(eq(paymentAccounts.id, id));
    return { success: true };
};

export const setPropertyDefaultPaymentAccount = async (
    propertyId: number,
    accountId: number | null
): Promise<void> => {
    const db = getDb();
    await db.update(properties)
        .set({ default_payment_account_id: accountId, updated_at: new Date() })
        .where(eq(properties.id, propertyId));
};

export const assignPaymentAccountToUnits = async (
    unitIds: number[],
    accountId: number | null
): Promise<void> => {
    if (unitIds.length === 0) return;
    const db = getDb();
    await db.update(units)
        .set({ payment_account_id: accountId, updated_at: new Date() })
        .where(inArray(units.id, unitIds));
};

export const resolveReceiptConfig = async (
    propertyId: number,
    unitId?: number | null
): Promise<ReceiptConfigLike | null> => {
    const db = getDb();

    if (unitId) {
        const unitRows = await db.select({ payment_account_id: units.payment_account_id })
            .from(units)
            .where(eq(units.id, unitId))
            .limit(1);
        const unitAccountId = unitRows[0]?.payment_account_id;
        if (unitAccountId) {
            const account = await getPaymentAccountById(unitAccountId);
            const mapped = accountToReceiptConfig(account);
            if (mapped) return mapped;
        }
    }

    const propRows = await db.select({ default_payment_account_id: properties.default_payment_account_id })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);
    const defaultAccountId = propRows[0]?.default_payment_account_id;
    if (defaultAccountId) {
        const account = await getPaymentAccountById(defaultAccountId);
        const mapped = accountToReceiptConfig(account);
        if (mapped) return mapped;
    }

    const legacy = await db.select()
        .from(rentReceiptConfig)
        .where(eq(rentReceiptConfig.property_id, propertyId))
        .limit(1);
    return legacy[0] || null;
};

export const migrateReceiptConfigsToPaymentAccounts = async (): Promise<void> => {
    const db = getDb();

    let allProperties: { id: number; name: string; default_payment_account_id: number | null }[] = [];
    try {
        allProperties = await db.select({
            id: properties.id,
            name: properties.name,
            default_payment_account_id: properties.default_payment_account_id,
        }).from(properties);
    } catch (error) {
        console.warn('Payment account migrate skipped (schema not ready):', error);
        return;
    }

    for (const property of allProperties) {
        if (property.default_payment_account_id) continue;

        const configs = await db.select()
            .from(rentReceiptConfig)
            .where(eq(rentReceiptConfig.property_id, property.id))
            .limit(1);
        const config = configs[0];
        if (!hasAnyPaymentDetails(config)) continue;

        const accountId = await createPaymentAccount({
            name: property.name || 'Payment account',
            logo_uri: config.logo_uri,
            bank_name: config.bank_name,
            bank_acc_number: config.bank_acc_number,
            bank_ifsc: config.bank_ifsc,
            bank_acc_holder: config.bank_acc_holder,
            wallet_type: config.wallet_type,
            wallet_phone: config.wallet_phone,
            wallet_name: config.wallet_name,
            upi_id: config.upi_id,
            payment_qr_uri: config.payment_qr_uri,
            signature_uri: config.signature_uri,
        });

        await setPropertyDefaultPaymentAccount(property.id, accountId);
    }
};
