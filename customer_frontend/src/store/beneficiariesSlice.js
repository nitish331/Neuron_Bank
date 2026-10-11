import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  addBeneficiary,
  fetchBeneficiaries,
  removeBeneficiary,
  sendBeneficiaryOtp,
  updateBeneficiary,
} from '../services/beneficiary.service';
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

export const loadBeneficiaries = createAsyncThunk(
  'beneficiaries/load',
  async (unused, { rejectWithValue }) => {
    try {
      const response = await fetchBeneficiaries();
      return response.data.beneficiaries;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const createBeneficiary = createAsyncThunk(
  'beneficiaries/create',
  async (details, { rejectWithValue }) => {
    try {
      const response = await addBeneficiary(details);
      return response.data.beneficiary;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const requestBeneficiaryOtp = createAsyncThunk(
  'beneficiaries/requestOtp',
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const response = await sendBeneficiaryOtp(id, action);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const changeBeneficiaryStatus = createAsyncThunk(
  'beneficiaries/changeStatus',
  async ({ id, code, status }, { rejectWithValue }) => {
    try {
      const response = await updateBeneficiary(id, { code, status });
      return response.data.beneficiary;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const deleteBeneficiary = createAsyncThunk(
  'beneficiaries/delete',
  async ({ id, code }, { rejectWithValue }) => {
    try {
      await removeBeneficiary(id, { code });
      return id;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  addStatus: 'idle',
  addError: null,
  otpStatus: 'idle',
  otpError: null,
  actionStatus: 'idle',
  actionError: null,
};

const beneficiariesSlice = createSlice({
  name: 'beneficiaries',
  initialState,
  reducers: {
    addReset(state) {
      state.addStatus = 'idle';
      state.addError = null;
    },
    actionReset(state) {
      state.otpStatus = 'idle';
      state.otpError = null;
      state.actionStatus = 'idle';
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBeneficiaries.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadBeneficiaries.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(loadBeneficiaries.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(createBeneficiary.pending, (state) => {
        state.addStatus = 'pending';
        state.addError = null;
      })
      .addCase(createBeneficiary.fulfilled, (state, action) => {
        state.addStatus = 'succeeded';
        state.items = [action.payload, ...state.items];
      })
      .addCase(createBeneficiary.rejected, (state, action) => {
        state.addStatus = 'failed';
        state.addError = action.payload;
      })

      .addCase(requestBeneficiaryOtp.pending, (state) => {
        state.otpStatus = 'pending';
        state.otpError = null;
      })
      .addCase(requestBeneficiaryOtp.fulfilled, (state) => {
        state.otpStatus = 'sent';
      })
      .addCase(requestBeneficiaryOtp.rejected, (state, action) => {
        state.otpStatus = 'failed';
        state.otpError = action.payload;
      })

      .addCase(changeBeneficiaryStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(deleteBeneficiary.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.items = state.items.filter((item) => item.id !== action.payload);
      })

      // Both confirmed actions share one pending and one failed shape.
      .addMatcher(
        (action) =>
          [changeBeneficiaryStatus.pending.type, deleteBeneficiary.pending.type].includes(
            action.type,
          ),
        (state) => {
          state.actionStatus = 'pending';
          state.actionError = null;
        },
      )
      .addMatcher(
        (action) =>
          [
            changeBeneficiaryStatus.rejected.type,
            deleteBeneficiary.rejected.type,
          ].includes(action.type),
        (state, action) => {
          state.actionStatus = 'failed';
          state.actionError = action.payload;
        },
      );
  },
});

export const { addReset, actionReset } = beneficiariesSlice.actions;

export const selectBeneficiaries = (state) => state.beneficiaries.items;
export const selectBeneficiariesStatus = (state) => state.beneficiaries.status;
export const selectBeneficiariesError = (state) => state.beneficiaries.error;
export const selectAddStatus = (state) => state.beneficiaries.addStatus;
export const selectAddError = (state) => state.beneficiaries.addError;
export const selectOtpStatus = (state) => state.beneficiaries.otpStatus;
export const selectOtpError = (state) => state.beneficiaries.otpError;
export const selectActionStatus = (state) => state.beneficiaries.actionStatus;
export const selectActionError = (state) => state.beneficiaries.actionError;

export default beneficiariesSlice.reducer;
