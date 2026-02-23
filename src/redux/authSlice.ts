import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';

const ONBOARDING_KEY = 'isOnboarded';
const AUTH_KEY = 'authState';

interface AuthState {
    isAuthenticated: boolean;
    isOnboarded: boolean;
    user: {
        name: string;
        email: string;
        photoUrl?: string;
    } | null;
    isGoogleLinked: boolean;
    googleEmail: string | null;
}

const loadAuthState = (): Partial<AuthState> => {
    try {
        const storedAuth = storage.getString(AUTH_KEY);
        if (storedAuth) {
            return JSON.parse(storedAuth);
        }
    } catch (e) {
        console.error('Failed to load auth state', e);
    }
    return {};
};

const savedAuthState = loadAuthState();

const initialState: AuthState = {
    isAuthenticated: savedAuthState.isAuthenticated ?? false,
    isOnboarded: storage.getBoolean(ONBOARDING_KEY) ?? false,
    user: savedAuthState.user ?? null,
    isGoogleLinked: savedAuthState.isGoogleLinked ?? false,
    googleEmail: savedAuthState.googleEmail ?? null,
};

const saveAuthState = (state: AuthState) => {
    try {
        storage.set(AUTH_KEY, JSON.stringify({
            isAuthenticated: state.isAuthenticated,
            user: state.user,
            isGoogleLinked: state.isGoogleLinked,
            googleEmail: state.googleEmail
        }));
    } catch (e) {
        console.error('Failed to save auth state', e);
    }
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<{ name: string; email: string; photoUrl?: string }>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
            saveAuthState(state);
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.isGoogleLinked = false;
            state.googleEmail = null;
            saveAuthState(state);
        },
        completeOnboarding: (state) => {
            state.isOnboarded = true;
            storage.set(ONBOARDING_KEY, true);
        },
        linkGoogleAccount: (state, action: PayloadAction<{ email: string, name?: string | null, photoUrl?: string | null }>) => {
            state.isGoogleLinked = true;
            state.googleEmail = action.payload.email;

            // If the user currently just "Guest User", upgrade their profile with Google info
            if (state.user?.name === 'Guest User' || !state.user) {
                state.user = {
                    name: action.payload.name || 'User',
                    email: action.payload.email,
                    photoUrl: action.payload.photoUrl || undefined
                };
            }

            saveAuthState(state);
        },
        unlinkGoogleAccount: (state) => {
            state.isGoogleLinked = false;
            state.googleEmail = null;
            saveAuthState(state);
        },
    },
});

export const { login, logout, completeOnboarding, linkGoogleAccount, unlinkGoogleAccount } = authSlice.actions;
export default authSlice.reducer;
