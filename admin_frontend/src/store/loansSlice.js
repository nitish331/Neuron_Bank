import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  approveLoanRequest,
  fetchLoanRequests,
  rejectLoanRequest,
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

export const loadLoanRequests = createAsyncThunk(
  'adminLoans/load',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchLoanRequests({ limit: PAGE_SIZE, ...params });
      return { ...response.data, status: params.status ?? 'pending' };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const approveLoan = createAsyncThunk(
  'adminLoans/approve',
  async (loanId, { rejectWithValue }) => {
    try {
      const response = await approveLoanRequest(loanId);
      return { loanId, message: response.message, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const rejectLoan = createAsyncThunk(
  'adminLoans/reject',
  async ({ loanId, reason }, { rejectWithValue }) => {
    try {
      const response = await rejectLoanRequest(loanId, reason);
      return { loanId, message: response.message };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  requests: [],
  statusCounts: null,
  pagination: null,
  filter: 'pending',
  status: 'idle',
  error: null,
  // One decision at a time, so the drawer knows whether it is the busy one.
  decidingId: null,
  decisionError: null,
  lastDecision: null,
};

const loansSlice = createSlice({
  name: 'adminLoans',
  initialState,
  reducers: {
    decisionReset(state) {
      state.decisionError = null;
      state.lastDecision = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLoanRequests.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadLoanRequests.fulfilled, (state, action) => {
        const { requests, statusCounts, pagination, status } = action.payload;

        state.status = 'succeeded';
        state.requests = requests;
        state.statusCounts = statusCounts;
        state.pagination = pagination;
        state.filter = status;
      })
      .addCase(loadLoanRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Approve and reject share one busy flag and one error slot.
      .addMatcher(
        (action) =>
          [approveLoan.pending.type, rejectLoan.pending.type].includes(action.type),
        (state, action) => {
          state.decidingId = action.meta.arg?.loanId ?? action.meta.arg;
          state.decisionError = null;
        },
      )
      .addMatcher(
        (action) =>
          [approveLoan.fulfilled.type, rejectLoan.fulfilled.type].includes(action.type),
        (state, action) => {
          state.decidingId = null;
          state.lastDecision = action.payload;
          // The row no longer belongs in this queue once it is decided.
          state.requests = state.requests.filter(
            (item) => item.id !== action.payload.loanId,
          );
        },
      )
      .addMatcher(
        (action) =>
          [approveLoan.rejected.type, rejectLoan.rejected.type].includes(action.type),
        (state, action) => {
          state.decidingId = null;
          state.decisionError = action.payload;
        },
      );
  },
});

export const { decisionReset } = loansSlice.actions;

export const selectLoanRequests = (state) => state.adminLoans.requests;
export const selectLoanCounts = (state) => state.adminLoans.statusCounts;
export const selectLoanPagination = (state) => state.adminLoans.pagination;
export const selectLoanFilter = (state) => state.adminLoans.filter;
export const selectLoansStatus = (state) => state.adminLoans.status;
export const selectLoansError = (state) => state.adminLoans.error;
export const selectDecidingId = (state) => state.adminLoans.decidingId;
export const selectDecisionError = (state) => state.adminLoans.decisionError;
export const selectLastDecision = (state) => state.adminLoans.lastDecision;

export default loansSlice.reducer;
