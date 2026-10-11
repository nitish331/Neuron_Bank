import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchInterestRates, updateInterestRates } from '../services/admin.service';
import { ApiError } from '../services/apiClient';

export const RATE_TYPES = ['fixedDeposit', 'recurringDeposit', 'loan'];

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
  'rates/load',
  async (unused, { rejectWithValue }) => {
    try {
      const response = await fetchInterestRates();
      return response.data.rateCards;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const saveRates = createAsyncThunk(
  'rates/save',
  async ({ type, rates }, { rejectWithValue }) => {
    try {
      const response = await updateInterestRates(type, rates);
      return { type, message: response.message, ...response.data };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  rateCards: null,
  status: 'idle',
  error: null,
  saveStatus: 'idle',
  saveError: null,
  lastSaved: null,
};

const ratesSlice = createSlice({
  name: 'rates',
  initialState,
  reducers: {
    saveReset(state) {
      state.saveStatus = 'idle';
      state.saveError = null;
      state.lastSaved = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRates.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadRates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.rateCards = action.payload;
      })
      .addCase(loadRates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(saveRates.pending, (state) => {
        state.saveStatus = 'pending';
        state.saveError = null;
      })
      .addCase(saveRates.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded';
        state.lastSaved = action.payload;
        // The response carries the saved card, so no refetch is needed.
        state.rateCards[action.payload.type] = action.payload.rateCard;
      })
      .addCase(saveRates.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload;
      });
  },
});

export const { saveReset } = ratesSlice.actions;

export const selectRateCards = (state) => state.rates.rateCards;
export const selectRatesStatus = (state) => state.rates.status;
export const selectRatesError = (state) => state.rates.error;
export const selectSaveStatus = (state) => state.rates.saveStatus;
export const selectSaveError = (state) => state.rates.saveError;
export const selectLastSaved = (state) => state.rates.lastSaved;

export default ratesSlice.reducer;
