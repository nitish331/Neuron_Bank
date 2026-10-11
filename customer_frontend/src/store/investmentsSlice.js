import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  closeDeposit,
  fetchDeposits,
  fetchRates,
  openDeposit,
  sendCloseOtp,
} from '../services/investment.service';
import { ApiError } from '../services/apiClient';

export const PRODUCTS = ['fd', 'rd'];

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

export const loadRates = createAsyncThunk(
  'investments/loadRates',
  async (product, { rejectWithValue }) => {
    try {
      const response = await fetchRates(product);
      return { product, rates: response.data };
    } catch (error) {
      return rejectWithValue({ product, ...toRejection(error) });
    }
  },
);

export const loadDeposits = createAsyncThunk(
  'investments/loadDeposits',
  async (product, { rejectWithValue }) => {
    try {
      const response = await fetchDeposits(product);
      return { product, ...response.data };
    } catch (error) {
      return rejectWithValue({ product, ...toRejection(error) });
    }
  },
);

export const createDeposit = createAsyncThunk(
  'investments/create',
  async ({ product, body }, { rejectWithValue }) => {
    try {
      const response = await openDeposit(product, body);
      return { product, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const requestCloseOtp = createAsyncThunk(
  'investments/requestCloseOtp',
  async ({ product, depositId }, { rejectWithValue }) => {
    try {
      const response = await sendCloseOtp(product, depositId);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const confirmClose = createAsyncThunk(
  'investments/confirmClose',
  async ({ product, depositId, code }, { rejectWithValue }) => {
    try {
      const response = await closeDeposit(product, depositId, code);
      return { product, message: response.message, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

function emptyProduct() {
  return {
    rates: null,
    deposits: [],
    totals: null,
    status: 'idle',
    error: null,
  };
}

const initialState = {
  fd: emptyProduct(),
  rd: emptyProduct(),
  createStatus: 'idle',
  createError: null,
  otpStatus: 'idle',
  otpError: null,
  closeStatus: 'idle',
  closeError: null,
  closeResult: null,
};

const investmentsSlice = createSlice({
  name: 'investments',
  initialState,
  reducers: {
    createReset(state) {
      state.createStatus = 'idle';
      state.createError = null;
    },
    closeReset(state) {
      state.otpStatus = 'idle';
      state.otpError = null;
      state.closeStatus = 'idle';
      state.closeError = null;
      state.closeResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRates.fulfilled, (state, action) => {
        state[action.payload.product].rates = action.payload.rates;
      })

      .addCase(loadDeposits.pending, (state, action) => {
        state[action.meta.arg].status = 'pending';
        state[action.meta.arg].error = null;
      })
      .addCase(loadDeposits.fulfilled, (state, action) => {
        const { product, deposits, ...totals } = action.payload;

        state[product].status = 'succeeded';
        state[product].deposits = deposits;
        state[product].totals = totals;
      })
      .addCase(loadDeposits.rejected, (state, action) => {
        const product = action.meta.arg;

        state[product].status = 'failed';
        state[product].error = action.payload;
      })

      .addCase(createDeposit.pending, (state) => {
        state.createStatus = 'pending';
        state.createError = null;
      })
      .addCase(createDeposit.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state[action.payload.product].deposits = [
          action.payload.deposit,
          ...state[action.payload.product].deposits,
        ];
      })
      .addCase(createDeposit.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })

      .addCase(requestCloseOtp.pending, (state) => {
        state.otpStatus = 'pending';
        state.otpError = null;
      })
      .addCase(requestCloseOtp.fulfilled, (state) => {
        state.otpStatus = 'sent';
      })
      .addCase(requestCloseOtp.rejected, (state, action) => {
        state.otpStatus = 'failed';
        state.otpError = action.payload;
      })

      .addCase(confirmClose.pending, (state) => {
        state.closeStatus = 'pending';
        state.closeError = null;
      })
      .addCase(confirmClose.fulfilled, (state, action) => {
        const { product, deposit } = action.payload;

        state.closeStatus = 'succeeded';
        state.closeResult = action.payload;
        state[product].deposits = state[product].deposits.map((item) =>
          item.id === deposit.id ? deposit : item,
        );
      })
      .addCase(confirmClose.rejected, (state, action) => {
        state.closeStatus = 'failed';
        state.closeError = action.payload;
      });
  },
});

export const { createReset, closeReset } = investmentsSlice.actions;

export const selectRates = (product) => (state) => state.investments[product].rates;
export const selectDeposits = (product) => (state) =>
  state.investments[product].deposits;
export const selectTotals = (product) => (state) => state.investments[product].totals;
export const selectProductStatus = (product) => (state) =>
  state.investments[product].status;
export const selectProductError = (product) => (state) =>
  state.investments[product].error;

export const selectCreateStatus = (state) => state.investments.createStatus;
export const selectCreateError = (state) => state.investments.createError;
export const selectOtpStatus = (state) => state.investments.otpStatus;
export const selectOtpError = (state) => state.investments.otpError;
export const selectCloseStatus = (state) => state.investments.closeStatus;
export const selectCloseError = (state) => state.investments.closeError;
export const selectCloseResult = (state) => state.investments.closeResult;

export default investmentsSlice.reducer;
