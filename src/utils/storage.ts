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
