import type { MMKV } from 'react-native-mmkv';
import { createMMKV } from 'react-native-mmkv';

let _storage: MMKV | null = null;

export function getStorage(): MMKV {
    if (!_storage) {
        _storage = createMMKV();
    }
    return _storage;
}

// For backward compatibility — a getter that lazily initializes
// This avoids calling createMMKV() at module load time (before JSI runtime is ready)
export const storage: MMKV = {
    get id() { return getStorage().id; },
    get size() { return getStorage().size; },
    get isReadOnly() { return getStorage().isReadOnly; },
    set: (...args: Parameters<MMKV['set']>) => getStorage().set(...args),
    getString: (...args: Parameters<MMKV['getString']>) => getStorage().getString(...args),
    getBoolean: (...args: Parameters<MMKV['getBoolean']>) => getStorage().getBoolean(...args),
    getNumber: (...args: Parameters<MMKV['getNumber']>) => getStorage().getNumber(...args),
    getBuffer: (...args: Parameters<MMKV['getBuffer']>) => getStorage().getBuffer(...args),
    contains: (...args: Parameters<MMKV['contains']>) => getStorage().contains(...args),
    remove: (...args: Parameters<MMKV['remove']>) => getStorage().remove(...args),
    getAllKeys: () => getStorage().getAllKeys(),
    clearAll: () => getStorage().clearAll(),
    recrypt: (...args: Parameters<MMKV['recrypt']>) => getStorage().recrypt(...args),
    trim: () => getStorage().trim(),
    addOnValueChangedListener: (...args: Parameters<MMKV['addOnValueChangedListener']>) => getStorage().addOnValueChangedListener(...args),
    importAllFrom: (...args: Parameters<MMKV['importAllFrom']>) => getStorage().importAllFrom(...args),
} as MMKV;

// Application User Preference Types
export type ReceiptDefaultFormat = 'ask' | 'pdf' | 'image';
export type ReceiptDefaultAction = 'system' | 'whatsapp';

// Type-safe convenience wrappers
export function getReceiptDefaultFormat(): ReceiptDefaultFormat {
    const val = getStorage().getString('receipt_default_format');
    if (val === 'pdf' || val === 'image') return val as ReceiptDefaultFormat;
    return 'ask';
}

export function setReceiptDefaultFormat(value: ReceiptDefaultFormat) {
    getStorage().set('receipt_default_format', value);
}

export function getReceiptDefaultAction(): ReceiptDefaultAction {
    const val = getStorage().getString('receipt_default_action');
    if (val === 'whatsapp') return 'whatsapp';
    return 'system';
}

export function setReceiptDefaultAction(value: ReceiptDefaultAction) {
    getStorage().set('receipt_default_action', value);
}
