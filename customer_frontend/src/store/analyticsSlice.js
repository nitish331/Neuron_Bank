import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { fetchAnalytics } from '../services/analytics.service';
import { ApiError } from '../services/apiClient';

export const DEFAULT_MONTHS = 6;

export const loadAnalytics = createAsyncThunk(
  'analytics/load',
  async ({ months = DEFAULT_MONTHS } = {}, { rejectWithValue }) => {
    try {
      const response = await fetchAnalytics({ months });
      return { ...response.data, months };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue({ message: error.message, status: error.status });
      }
      return rejectWithValue({ message: 'Something went wrong. Please try again.' });
    }
  },
);

const initialState = {
  months: DEFAULT_MONTHS,
  currency: 'INR',
  balance: null,
  overall: null,
  thisMonth: null,
  lastMonth: null,
  deltas: null,
  monthly: [],
  loans: null,
  investments: null,
  placeholders: [],
  status: 'idle',
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(loadAnalytics.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadAnalytics.fulfilled, (state, action) => {
        const payload = action.payload;

        state.status = 'succeeded';
        state.months = payload.months;
        state.currency = payload.currency ?? state.currency;
        state.balance = payload.balance;
        state.overall = payload.overall;
        state.thisMonth = payload.thisMonth;
        state.lastMonth = payload.lastMonth;
        state.deltas = payload.deltas;
        state.monthly = payload.monthly ?? [];
        state.loans = payload.loans;
        state.investments = payload.investments;
        state.placeholders = payload.placeholders ?? [];
      })
      .addCase(loadAnalytics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const selectAnalyticsStatus = (state) => state.analytics.status;
export const selectAnalyticsError = (state) => state.analytics.error;
export const selectAnalyticsMonths = (state) => state.analytics.months;
export const selectAnalyticsBalance = (state) => state.analytics.balance;
export const selectLoans = (state) => state.analytics.loans;
export const selectInvestments = (state) => state.analytics.investments;
export const selectPlaceholders = (state) => state.analytics.placeholders;

/** Money In / Money Out for the current month, with month-on-month deltas. */
export const selectCashflow = createSelector(
  [(state) => state.analytics.thisMonth, (state) => state.analytics.deltas],
  (thisMonth, deltas) => ({
    moneyIn: thisMonth?.credits ?? 0,
    moneyOut: thisMonth?.debits ?? 0,
    inDelta: deltas?.credits ?? null,
    outDelta: deltas?.debits ?? null,
  }),
);

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const MONTH_LABEL_LONG = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: '2-digit',
});

/** Turns the server's "YYYY-MM" buckets into chart-ready arrays. */
export const selectMonthlySeries = createSelector(
  [(state) => state.analytics.monthly],
  (monthly) => {
    // Beyond six columns the year matters, otherwise Jan repeats unlabelled.
    const format = monthly.length > 6 ? MONTH_LABEL_LONG : MONTH_LABEL;

    return {
      labels: monthly.map(({ month }) => {
        const [year, index] = month.split('-').map(Number);
        return format.format(new Date(year, index - 1, 1));
      }),
      income: monthly.map(({ credits }) => credits),
      expenses: monthly.map(({ debits }) => debits),
    };
  },
);

export default analyticsSlice.reducer;
