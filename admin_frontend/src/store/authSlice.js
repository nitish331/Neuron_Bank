import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { logout as logoutRequest } from '../services/auth.service';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  setAccessToken,
} from '../utils/authStorage';

/** Revokes server-side first, but clears locally either way. */
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await logoutRequest();
});

/** Seeded from localStorage so a reload does not sign the user out. */
const initialState = {
  user: getStoredUser(),
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Takes the raw `{ token, refreshToken, data }` login response.
    sessionStarted(state, action) {
      const { token, refreshToken, data } = action.payload;

      state.user = data ?? null;
      state.accessToken = token ?? null;
      state.refreshToken = refreshToken ?? null;

      saveSession(action.payload);
    },

    /** Keeps the store in step with a token the API client refreshed. */
    accessTokenRefreshed(state, action) {
      state.accessToken = action.payload;
      setAccessToken(action.payload);
    },

    /** Applied after a profile edit. */
    userUpdated(state, action) {
      state.user = { ...state.user, ...action.payload };
      saveSession({ data: state.user });
    },

    sessionEnded(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;

      clearSession();
    },
  },
  extraReducers: (builder) => {
    // Settled either way: a failed revoke still ends the local session.
    builder.addMatcher(
      (action) =>
        action.type === logoutUser.fulfilled.type ||
        action.type === logoutUser.rejected.type,
      (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;

        clearSession();
      },
    );
  },
});

export const {
  sessionStarted,
  accessTokenRefreshed,
  userUpdated,
  sessionEnded,
} = authSlice.actions;

export const selectUser = (state) => state.auth.user;

// Keyed on the refresh token, not the access token: an expired access token
// with a live refresh token is still a signed-in user, and the interceptor
// recovers it. Guarding on the access token would bounce them mid-recovery.
export const selectIsAuthenticated = (state) => Boolean(state.auth.refreshToken);

export const selectAccessToken = (state) => state.auth.accessToken;

export default authSlice.reducer;
