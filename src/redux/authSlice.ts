import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const initialState: AuthState = {
    isAuthenticated: false,
    isOnboarded: false,
    user: null,
    isGoogleLinked: false,
    googleEmail: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<{ name: string; email: string; photoUrl?: string }>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.isGoogleLinked = false;
            state.googleEmail = null;
        },
        completeOnboarding: (state) => {
            state.isOnboarded = true;
        },
        linkGoogleAccount: (state, action: PayloadAction<string>) => {
            state.isGoogleLinked = true;
            state.googleEmail = action.payload;
        },
        unlinkGoogleAccount: (state) => {
            state.isGoogleLinked = false;
            state.googleEmail = null;
        },
    },
});

export const { login, logout, completeOnboarding, linkGoogleAccount, unlinkGoogleAccount } = authSlice.actions;
export default authSlice.reducer;
