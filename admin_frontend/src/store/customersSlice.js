import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCustomers, setCustomerStatus } from '../services/admin.service';
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

export const loadCustomers = createAsyncThunk(
  'customers/load',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchCustomers({ limit: PAGE_SIZE, ...params });
      return {
        ...response.data,
        filters: { status: params.status ?? '', search: params.search ?? '' },
      };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const changeStatus = createAsyncThunk(
  'customers/changeStatus',
  async ({ userId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await setCustomerStatus(userId, { status, reason });
      return { userId, status, message: response.message, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  customers: [],
  pagination: null,
  applied: { status: '', search: '' },
  status: 'idle',
  error: null,
  // One decision at a time, so the row knows whether it is the busy one.
  changingId: null,
  changeError: null,
  lastChange: null,
};

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    changeReset(state) {
      state.changeError = null;
      state.lastChange = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        const { customers, pagination, filters } = action.payload;

        state.status = 'succeeded';
        state.customers = customers;
        state.pagination = pagination;
        state.applied = filters;
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(changeStatus.pending, (state, action) => {
        state.changingId = action.meta.arg.userId;
        state.changeError = null;
      })
      .addCase(changeStatus.fulfilled, (state, action) => {
        state.changingId = null;
        state.lastChange = action.payload;
        // The row stays put; only its status badge moves.
        state.customers = state.customers.map((item) =>
          item.id === action.payload.userId
            ? { ...item, status: action.payload.status }
            : item,
        );
      })
      .addCase(changeStatus.rejected, (state, action) => {
        state.changingId = null;
        state.changeError = action.payload;
      });
  },
});

export const { changeReset } = customersSlice.actions;

export const selectCustomers = (state) => state.customers.customers;
export const selectCustomersPagination = (state) => state.customers.pagination;
export const selectCustomersApplied = (state) => state.customers.applied;
export const selectCustomersStatus = (state) => state.customers.status;
export const selectCustomersError = (state) => state.customers.error;
export const selectChangingId = (state) => state.customers.changingId;
export const selectChangeError = (state) => state.customers.changeError;
export const selectLastChange = (state) => state.customers.lastChange;

export default customersSlice.reducer;
