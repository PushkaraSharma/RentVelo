import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

let pending: FirebaseAuthTypes.ConfirmationResult | null = null;

export function isValidIndianMobile(digits: string): boolean {
    return INDIAN_MOBILE.test(digits);
}

export function toIndianE164(digits: string): string {
    return `+91${digits}`;
}

export async function sendPhoneOtp(digits: string, forceResend = false): Promise<void> {
    pending = await auth().signInWithPhoneNumber(toIndianE164(digits), forceResend);
}

export async function confirmPhoneOtp(code: string): Promise<{ phone: string; uid: string }> {
    if (!pending) {
        throw Object.assign(new Error('Send a code before verifying.'), { code: 'auth/missing-verification-code' });
    }
    const credential = await pending.confirm(code);
    const phone = credential?.user?.phoneNumber;
    const uid = credential?.user?.uid;
    if (!phone || !uid) {
        throw Object.assign(new Error('Phone number missing after verification.'), { code: 'auth/missing-phone-number' });
    }
    pending = null;
    return { phone, uid };
}

export async function signOutPhone(): Promise<void> {
    pending = null;
    if (auth().currentUser) {
        await auth().signOut();
    }
}

export async function deletePhoneAccount(): Promise<void> {
    pending = null;
    const user = auth().currentUser;
    if (!user) return;
    await user.delete();
}

export function phoneAuthErrorMessage(error: unknown): string {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : '';
    switch (code) {
        case 'auth/invalid-phone-number':
        case 'auth/missing-phone-number':
            return 'That number does not look valid.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Wait a few minutes and try again.';
        case 'auth/invalid-verification-code':
            return 'That code is wrong. Check the SMS and try again.';
        case 'auth/session-expired':
        case 'auth/code-expired':
        case 'auth/missing-verification-code':
            return 'That code expired. Send a new one.';
        case 'auth/quota-exceeded':
            return 'SMS limit reached for today. Try again later.';
        case 'auth/operation-not-allowed':
            return 'Phone sign-in is not enabled for this app yet.';
        case 'auth/missing-client-identifier':
        case 'auth/app-not-authorized':
            return 'This build is not registered for phone sign-in.';
        case 'auth/network-request-failed':
            return 'Check your internet connection and try again.';
        case 'auth/captcha-check-failed':
            return 'App verification failed. Try again.';
        default:
            return 'Could not verify the number. Please try again.';
    }
}
