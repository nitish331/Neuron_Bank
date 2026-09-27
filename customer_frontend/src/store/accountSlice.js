import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  deposit as depositRequest,
  fetchTransactions,
} from '../services/account.service';
import { ApiError } from '../services/apiClient';

/** rejectWithValue keeps the server's field errors usable in the form. */
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

export const deposit = createAsyncThunk(
  'account/deposit',
  async ({ amount, description }, { rejectWithValue }) => {
    try {
      const response = await depositRequest({ amount, description });
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const loadTransactions = createAsyncThunk(
  'account/loadTransactions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchTransactions(params);
      return { ...response.data, page: params.page ?? 1 };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
  {
    // Stops StrictMode's double mount firing two identical requests.
    condition: (params, { getState }) =>
      getState().account.transactionsStatus !== 'pending',
  },
);

const initialState = {
  accountNumber: null,
  balance: null,
  currency: 'INR',
  transactions: [],
  pagination: null,
  transactionsStatus: 'idle',
  transactionsError: null,
  depositStatus: 'idle',
  depositError: null,
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    depositReset(state) {
      state.depositStatus = 'idle';
      state.depositError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransactions.pending, (state) => {
        state.transactionsStatus = 'pending';
        state.transactionsError = null;
      })
      .addCase(loadTransactions.fulfilled, (state, action) => {
        const { accountNumber, balance, currency, transactions, pagination, page } =
          action.payload;

        state.transactionsStatus = 'succeeded';
        state.accountNumber = accountNumber;
        state.balance = balance;
        state.currency = currency ?? state.currency;
        state.pagination = pagination;
        // Page 1 replaces; later pages append for "load more".
        state.transactions =
          page > 1 ? [...state.transactions, ...transactions] : transactions;
      })
      .addCase(loadTransactions.rejected, (state, action) => {
        state.transactionsStatus = 'failed';
        state.transactionsError = action.payload;
      })

      .addCase(deposit.pending, (state) => {
        state.depositStatus = 'pending';
        state.depositError = null;
      })
      .addCase(deposit.fulfilled, (state, action) => {
        state.depositStatus = 'succeeded';
        state.balance = action.payload.balance;
        // One new transaction, straight onto the front of the list.
        state.transactions = [action.payload.transaction, ...state.transactions];

        if (state.pagination) {
          state.pagination.total += 1;
        }
      })
      .addCase(deposit.rejected, (state, action) => {
        state.depositStatus = 'failed';
        state.depositError = action.payload;
      });
  },
});

export const { depositReset } = accountSlice.actions;

export const selectTransactions = (state) => state.account.transactions;
export const selectTransactionsStatus = (state) => state.account.transactionsStatus;
export const selectTransactionsError = (state) => state.account.transactionsError;
export const selectAccountSummary = (state) => ({
  accountNumber: state.account.accountNumber,
  balance: state.account.balance,
  currency: state.account.currency,
});
export const selectDepositStatus = (state) => state.account.depositStatus;
export const selectDepositError = (state) => state.account.depositError;

export default accountSlice.reducer;
