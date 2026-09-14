import * as StoreReview from 'expo-store-review';
import { storage } from '../utils/storage';

const ACTION_COUNTER_KEY = '@store_review_action_count';
const LAST_PROMPT_KEY = '@store_review_last_prompt_date';
const HAS_REVIEWED_KEY = '@store_review_has_reviewed';

/**
 * Strategy:
 * 1. Increment counter for each "Positive Action" (Rent Received, Tenant Added).
 * 2. Request review if:
 *    - Counter >= 3
 *    - It's been at least 2 months since last prompt (or never prompted).
 *    - User hasn't explicitly dismissed forever (hard to track in native, but we can try).
 */
export const incrementActionAndReview = async () => {
    try {
        // 1. Check if we've already asked too recently or if they've reviewed
        const lastPrompt = storage.getString(LAST_PROMPT_KEY);
        const hasReviewed = storage.getBoolean(HAS_REVIEWED_KEY);

        if (hasReviewed) return;

        // Minimum time between prompts (1 month)
        const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
        if (lastPrompt) {
            const lastDate = new Date(lastPrompt).getTime();
            if (Date.now() - lastDate < ONE_MONTH_MS) {
                console.log('[StoreReview] Prompted too recently (less than 1 month), skipping.');
                return;
            }
        }

        // 2. Increment action counter
        const currentCount = storage.getNumber(ACTION_COUNTER_KEY) || 0;
        const newCount = currentCount + 1;
        storage.set(ACTION_COUNTER_KEY, newCount);

        console.log(`[StoreReview] Action count: ${newCount}`);

        // 3. Request review if milestone reached (at least 3 positive actions)
        if (newCount >= 3) {
            const isAvailable = await StoreReview.isAvailableAsync();

            if (isAvailable) {
                console.log('[StoreReview] Requesting review...');
                await StoreReview.requestReview();

                // Track last prompt date
                storage.set(LAST_PROMPT_KEY, new Date().toISOString());
            } else {
                console.log('[StoreReview] Review not available on this device/environment.');
            }
        } else {
            console.log(`[StoreReview] Need ${3 - newCount} more actions to trigger review prompt.`);
        }
    } catch (error) {
        console.error('[StoreReview] Failed to handle review logic:', error);
    }
};

/**
 * Useful for debugging or forcing a review in development.
 */
export const forceRequestReview = async () => {
    if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
    }
};
