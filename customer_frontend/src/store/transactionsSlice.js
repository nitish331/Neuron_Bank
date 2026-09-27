import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchTransactions } from '../services/account.service';
import { ApiError } from '../services/apiClient';

export const PAGE_SIZE = 10;

/** Kept apart from accountSlice so page filters cannot skew the dashboard. */
export const loadPage = createAsyncThunk(
  'transactions/loadPage',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchTransactions({ limit: PAGE_SIZE, ...params });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue({ message: error.message, status: error.status });
      }
      return rejectWithValue({ message: 'Something went wrong. Please try again.' });
    }
  },
);

export const EMPTY_FILTERS = { type: '', startDate: '', endDate: '' };

const initialState = {
  accountNumber: null,
  balance: null,
  currency: 'INR',
  items: [],
  pagination: null,
  // Applied is what the last request used; draft is what the form holds.
  applied: EMPTY_FILTERS,
  draft: EMPTY_FILTERS,
  status: 'idle',
  error: null,
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    draftChanged(state, action) {
      state.draft = { ...state.draft, ...action.payload };
    },
    draftCleared(state) {
      state.draft = EMPTY_FILTERS;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPage.pending, (state, action) => {
        state.status = 'pending';
        state.error = null;
        // Record what this request asked for, so the header can describe it.
        const { type = '', startDate = '', endDate = '' } = action.meta.arg || {};
        state.applied = { type, startDate, endDate };
      })
      .addCase(loadPage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accountNumber = action.payload.accountNumber;
        state.balance = action.payload.balance;
        state.currency = action.payload.currency ?? state.currency;
        state.items = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(loadPage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { draftChanged, draftCleared } = transactionsSlice.actions;

export const selectItems = (state) => state.transactions.items;
export const selectPagination = (state) => state.transactions.pagination;
export const selectDraft = (state) => state.transactions.draft;
export const selectApplied = (state) => state.transactions.applied;
export const selectStatus = (state) => state.transactions.status;
export const selectError = (state) => state.transactions.error;
export const selectSummary = (state) => ({
  accountNumber: state.transactions.accountNumber,
  balance: state.transactions.balance,
});

export default transactionsSlice.reducer;
