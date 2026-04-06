import { appleAuth } from '@invertase/react-native-apple-authentication';
import { storage } from '../utils/storage';

export interface AppleUser {
    id: string;
    email: string | null;
    name: string | null;
}

export const signInWithApple = async (): Promise<AppleUser | null> => {
    try {
        // performs login request
        const appleAuthRequestResponse = await appleAuth.performRequest({
            requestedOperation: appleAuth.Operation.LOGIN,
            requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });

        // get current authentication state for user
        // /!\ This can be redacted if the user has opted in to Apple's "Hide My Email" feature
        const { user: userId, email, fullName, identityToken } = appleAuthRequestResponse;

        if (!identityToken) {
            throw new Error('Apple Sign-In failed - no identity token returned');
        }

        // Apple only returns name and email on the FIRST sign-in.
        // We should store them locally if we get them.
        let name = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : null;
        
        // If name is just empty space, make it null
        if (name === '') name = null;

        const userData = {
            id: userId,
            email: email || null,
            name: name || null,
        };

        // If we don't have email/name now, they might be stored from a previous login
        // (Apple only sends them once)
        const storedUserBlob = storage.getString(`@apple_user_${userId}`);
        if (storedUserBlob) {
            try {
                const parsed = JSON.parse(storedUserBlob);
                if (!userData.email && parsed.email) userData.email = parsed.email;
                if (!userData.name && parsed.name) userData.name = parsed.name;
            } catch (e) {
                console.warn('Failed to parse stored Apple user:', e);
            }
        }

        // Store for future use since Apple only returns them once 
        // We only overwrite if we got some new data, otherwise we keep what we had
        storage.set(`@apple_user_${userId}`, JSON.stringify(userData));

        return userData;
    } catch (error: any) {
        if (error.code === appleAuth.Error.CANCELED) {
            console.log('User cancelled Apple Sign-In');
            return null;
        }
        console.error('Apple Sign-In Error:', error);
        throw error;
    }
};

export const isAppleAuthSupported = () => {
    return appleAuth.isSupported;
};

export const signOutApple = async (userId: string) => {
    try {
        storage.remove(`@apple_user_${userId}`);
    } catch (error) {
        console.error('Apple Sign-Out Error:', error);
    }
};
