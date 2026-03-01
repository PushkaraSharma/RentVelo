import { getDb } from './database';
import { propertyExpenses, type PropertyExpense, type NewPropertyExpense } from './schema';
import { eq, and, desc } from 'drizzle-orm';

// Re-export types
export { PropertyExpense };

// ===== CRUD OPERATIONS =====

export const createExpense = async (expense: NewPropertyExpense): Promise<number> => {
    const db = getDb();
    const result = await db.insert(propertyExpenses).values(expense).returning({ id: propertyExpenses.id });
    return result[0].id;
};

export const getExpensesByProperty = async (propertyId: number): Promise<PropertyExpense[]> => {
    const db = getDb();
    return await db.select().from(propertyExpenses)
        .where(eq(propertyExpenses.property_id, propertyId))
        .orderBy(desc(propertyExpenses.created_at));
};

export const getExpensesByPropertyMonth = async (
    propertyId: number,
    month: number,
    year: number
): Promise<PropertyExpense[]> => {
    const db = getDb();
    return await db.select().from(propertyExpenses)
        .where(
            and(
                eq(propertyExpenses.property_id, propertyId),
                eq(propertyExpenses.month, month),
                eq(propertyExpenses.year, year)
            )
        )
        .orderBy(desc(propertyExpenses.created_at));
};

export const deleteExpense = async (id: number): Promise<void> => {
    const db = getDb();
    await db.delete(propertyExpenses).where(eq(propertyExpenses.id, id));
};

export const getExpenseSummary = async (
    propertyId: number,
    month: number,
    year: number
): Promise<{ totalExpenses: number; ownerExpenses: number; distributedExpenses: number }> => {
    const db = getDb();
    const expenses = await db.select().from(propertyExpenses)
        .where(
            and(
                eq(propertyExpenses.property_id, propertyId),
                eq(propertyExpenses.month, month),
                eq(propertyExpenses.year, year)
            )
        );

    let totalExpenses = 0;
    let ownerExpenses = 0;
    let distributedExpenses = 0;

    for (const exp of expenses) {
        totalExpenses += exp.amount;
        if (exp.distribute_type === 'owner') {
            ownerExpenses += exp.amount;
        } else {
            distributedExpenses += exp.amount;
        }
    }

    return { totalExpenses, ownerExpenses, distributedExpenses };
};

// Get monthly recurring expenses for a property (to auto-create in new months)
export const getRecurringExpenses = async (propertyId: number): Promise<PropertyExpense[]> => {
    const db = getDb();
    return await db.select().from(propertyExpenses)
        .where(
            and(
                eq(propertyExpenses.property_id, propertyId),
                eq(propertyExpenses.frequency, 'monthly')
            )
        )
        .orderBy(desc(propertyExpenses.created_at));
};
