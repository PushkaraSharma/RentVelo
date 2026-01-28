import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    isAuthenticated: boolean;
    isOnboarded: boolean;
    user: {
        name: string;
        email: string;
        photoUrl?: string;
    } | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isOnboarded: false,
    user: null,
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
        },
        completeOnboarding: (state) => {
            state.isOnboarded = true;
        },
    },
});

export const { login, logout, completeOnboarding } = authSlice.actions;
export default authSlice.reducer;
