import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  approveAccount,
  closeAccount,
  fetchAccounts,
  rejectAccount,
} from '../services/admin.service';
import { ApiError } from '../services/apiClient';

export const PAGE_SIZE = 10;

function toRejection(error) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      fieldErrors: error.fieldErrors,
      status: error.status,
    };
  }
  return { message: 'Something went wrong. Please try again.' };
}

export const loadAccounts = createAsyncThunk(
  'accounts/load',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchAccounts({ limit: PAGE_SIZE, ...params });
      return { ...response.data, status: params.status ?? 'pending' };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const approve = createAsyncThunk(
  'accounts/approve',
  async (accountId, { rejectWithValue }) => {
    try {
      const response = await approveAccount(accountId);
      return { accountId, message: response.message };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const reject = createAsyncThunk(
  'accounts/reject',
  async ({ accountId, reason }, { rejectWithValue }) => {
    try {
      const response = await rejectAccount(accountId, reason);
      return { accountId, message: response.message };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

/** Refused by the server unless the balance is zero and nothing is running. */
export const close = createAsyncThunk(
  'accounts/close',
  async ({ accountId, reason }, { rejectWithValue }) => {
    try {
      const response = await closeAccount(accountId, reason);
      return { accountId, message: response.message, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  accounts: [],
  statusCounts: null,
  pagination: null,
  filter: 'pending',
  status: 'idle',
  error: null,
  // One decision at a time, so the row knows whether it is the busy one.
  decidingId: null,
  decisionError: null,
  lastDecision: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    decisionReset(state) {
      state.decisionError = null;
      state.lastDecision = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAccounts.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadAccounts.fulfilled, (state, action) => {
        const { accounts, statusCounts, pagination, status } = action.payload;

        state.status = 'succeeded';
        state.accounts = accounts;
        state.statusCounts = statusCounts;
        state.pagination = pagination;
        state.filter = status;
      })
      .addCase(loadAccounts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Approve and reject share one busy flag and one error slot.
      .addMatcher(
        (action) =>
          [approve.pending.type, reject.pending.type, close.pending.type].includes(
            action.type,
          ),
        (state, action) => {
          state.decidingId = action.meta.arg?.accountId ?? action.meta.arg;
          state.decisionError = null;
        },
      )
      .addMatcher(
        (action) =>
          [approve.fulfilled.type, reject.fulfilled.type, close.fulfilled.type].includes(
            action.type,
          ),
        (state, action) => {
          state.decidingId = null;
          state.lastDecision = action.payload;
          // The row no longer belongs in this queue once it is decided.
          state.accounts = state.accounts.filter(
            (item) => item.id !== action.payload.accountId,
          );
        },
      )
      .addMatcher(
        (action) =>
          [approve.rejected.type, reject.rejected.type, close.rejected.type].includes(
            action.type,
          ),
        (state, action) => {
          state.decidingId = null;
          state.decisionError = action.payload;
        },
      );
  },
});

export const { decisionReset } = accountsSlice.actions;

export const selectAccounts = (state) => state.accounts.accounts;
export const selectStatusCounts = (state) => state.accounts.statusCounts;
export const selectPagination = (state) => state.accounts.pagination;
export const selectFilter = (state) => state.accounts.filter;
export const selectAccountsStatus = (state) => state.accounts.status;
export const selectAccountsError = (state) => state.accounts.error;
export const selectDecidingId = (state) => state.accounts.decidingId;
export const selectDecisionError = (state) => state.accounts.decisionError;
export const selectLastDecision = (state) => state.accounts.lastDecision;

export default accountsSlice.reducer;
