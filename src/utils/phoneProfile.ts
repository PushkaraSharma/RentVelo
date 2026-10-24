import { storage } from './storage';

const PHONE_NAME_CONFIRMED_KEY = '@phone_name_confirmed';

export function markPhoneNameConfirmed() {
    storage.set(PHONE_NAME_CONFIRMED_KEY, true);
}

export function needsPhoneName(authMethod: string | null | undefined, name?: string | null) {
    if (authMethod !== 'phone') return false;
    if (storage.getBoolean(PHONE_NAME_CONFIRMED_KEY)) return false;
    const trimmed = (name || '').trim();
    return trimmed.length === 0 || trimmed === 'Owner';
}
