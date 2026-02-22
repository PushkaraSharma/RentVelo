import { getDb } from './database';
import { notifications, rentBills, Notification, NewNotification } from './schema';
import { eq, desc, and } from 'drizzle-orm';

// Re-export type
export { Notification };

export const createNotification = async (notification: NewNotification): Promise<number> => {
    const db = getDb();
    const result = await db.insert(notifications).values(notification).returning({ id: notifications.id });
    return result[0].id;
};

export const getNotifications = async (): Promise<Notification[]> => {
    const db = getDb();
    return await db.select().from(notifications).orderBy(desc(notifications.created_at));
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const db = getDb();
    const unread = await db.select().from(notifications).where(eq(notifications.is_read, false));
    return unread.length;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
    const db = getDb();
    await db.update(notifications)
        .set({ is_read: true })
        .where(eq(notifications.id, id));
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    const db = getDb();
    await db.update(notifications)
        .set({ is_read: true })
        .where(eq(notifications.is_read, false));
};

// Auto-generate rent reminders based on pending bills
export const generateRentReminders = async (): Promise<void> => {
    const db = getDb();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if we already generated reminders recently to avoid spamming
    // In a real app, this might be tied to a specific day configuration
    // For now, we'll check if any 'rent_due' notifications exist for this month/year bounds (approx)
    // A simpler approach is to check if there's any recent reminder for each pending bill.
    // To keep it simple, we generate them when explicitly called (e.g., from a scheduled background job or manual trigger)

    const pendingBills = await db.select().from(rentBills)
        .where(and(eq(rentBills.month, currentMonth), eq(rentBills.year, currentYear)));

    for (const bill of pendingBills) {
        if (bill.status === 'pending' || bill.status === 'partial') {
            // Check if we already have an unread reminder for this tenant this month
            const existing = await db.select().from(notifications)
                .where(
                    and(
                        eq(notifications.tenant_id, bill.tenant_id),
                        eq(notifications.type, 'rent_due'),
                        eq(notifications.is_read, false)
                    )
                );

            if (existing.length === 0) {
                const balance = bill.balance || 0;
                await createNotification({
                    type: 'rent_due',
                    title: 'Rent Reminder',
                    body: `A balance of ₹${balance.toLocaleString()} is pending for this month's rent.`,
                    property_id: bill.property_id,
                    tenant_id: bill.tenant_id,
                    unit_id: bill.unit_id,
                    is_read: false,
                });
            }
        }
    }
};
