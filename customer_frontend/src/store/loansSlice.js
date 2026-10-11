import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import {
  applyForLoan,
  fetchLoanRates,
  fetchLoanRequests,
} from '../services/loan.service';
import { ApiError } from '../services/apiClient';

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

export const loadLoanRates = createAsyncThunk(
  'loans/loadRates',
  async (amount, { rejectWithValue }) => {
    try {
      const response = await fetchLoanRates(amount);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const loadLoans = createAsyncThunk(
  'loans/load',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchLoanRequests(params);
      return { ...response.data, status: params.status ?? '' };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const submitLoanRequest = createAsyncThunk(
  'loans/submit',
  async (details, { rejectWithValue }) => {
    try {
      const response = await applyForLoan(details);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  requests: [],
  summary: null,
  canApply: true,
  pagination: null,
  filter: '',
  status: 'idle',
  error: null,
  rates: null,
  ratesStatus: 'idle',
  submitStatus: 'idle',
  submitError: null,
};

const loansSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    submitReset(state) {
      state.submitStatus = 'idle';
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLoanRates.pending, (state) => {
        state.ratesStatus = 'pending';
      })
      .addCase(loadLoanRates.fulfilled, (state, action) => {
        state.ratesStatus = 'succeeded';
        state.rates = action.payload;
      })
      .addCase(loadLoanRates.rejected, (state) => {
        state.ratesStatus = 'failed';
      })

      .addCase(loadLoans.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadLoans.fulfilled, (state, action) => {
        const { requests, summary, canApply, pagination, status } = action.payload;

        state.status = 'succeeded';
        state.requests = requests;
        state.summary = summary;
        state.canApply = canApply;
        state.pagination = pagination;
        state.filter = status;
      })
      .addCase(loadLoans.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(submitLoanRequest.pending, (state) => {
        state.submitStatus = 'pending';
        state.submitError = null;
      })
      .addCase(submitLoanRequest.fulfilled, (state) => {
        state.submitStatus = 'succeeded';
        // A pending request blocks the next one, so stop offering it.
        state.canApply = false;
      })
      .addCase(submitLoanRequest.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.submitError = action.payload;
      });
  },
});

export const { submitReset } = loansSlice.actions;

export const selectLoanRequests = (state) => state.loans.requests;
export const selectLoanSummary = (state) => state.loans.summary;
export const selectCanApply = (state) => state.loans.canApply;
export const selectLoansStatus = (state) => state.loans.status;
export const selectLoansError = (state) => state.loans.error;
export const selectLoanFilter = (state) => state.loans.filter;
export const selectLoanRates = (state) => state.loans.rates;
export const selectRatesStatus = (state) => state.loans.ratesStatus;
export const selectSubmitStatus = (state) => state.loans.submitStatus;
export const selectSubmitError = (state) => state.loans.submitError;

/** What is still owed across every approved loan, plus any overdue flag. */
export const selectOutstanding = createSelector([selectLoanRequests], (requests) =>
  requests.reduce(
    (acc, loan) => {
      if (loan.repayment && loan.status === 'approved') {
        acc.total += loan.repayment.outstanding;
        acc.monthlyEmi += loan.repayment.emiAmount;
        if (loan.repayment.isOverdue) acc.overdueCount += 1;
      }
      return acc;
    },
    { total: 0, monthlyEmi: 0, overdueCount: 0 },
  ),
);

export default loansSlice.reducer;
