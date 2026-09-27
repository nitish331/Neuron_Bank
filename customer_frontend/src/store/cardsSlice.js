import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import {
  fetchCards,
  requestCard,
  sendCardOtp,
  updateCard,
} from '../services/card.service';
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

export const loadCards = createAsyncThunk(
  'cards/load',
  async (unused, { rejectWithValue }) => {
    try {
      const response = await fetchCards();
      return response.data.cards;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

/** Kept in memory only — never persisted, and cleared when the eye is closed. */
export const revealCard = createAsyncThunk(
  'cards/reveal',
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await fetchCards({ reveal: true });
      const card = response.data.cards.find((item) => item.id === cardId);

      if (!card?.cardNumber) {
        return rejectWithValue({
          message: 'Full details are not available for this card.',
        });
      }

      return { cardNumber: card.cardNumber, cvv: card.cvv };
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const issueCard = createAsyncThunk(
  'cards/issue',
  async (unused, { rejectWithValue }) => {
    try {
      const response = await requestCard();
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const requestOtp = createAsyncThunk(
  'cards/requestOtp',
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await sendCardOtp(cardId);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const applyCardChange = createAsyncThunk(
  'cards/applyChange',
  async ({ cardId, ...changes }, { rejectWithValue }) => {
    try {
      const response = await updateCard(cardId, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  // The plain number and CVV, held in memory only until the panel is dismissed.
  freshSecrets: null,
  revealed: null,
  revealStatus: 'idle',
  revealError: null,
  issueStatus: 'idle',
  issueError: null,
  otpStatus: 'idle',
  otpError: null,
  changeStatus: 'idle',
  changeError: null,
};

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    secretsDismissed(state) {
      state.freshSecrets = null;
    },
    detailsHidden(state) {
      state.revealed = null;
      state.revealStatus = 'idle';
      state.revealError = null;
    },
    changeReset(state) {
      state.otpStatus = 'idle';
      state.otpError = null;
      state.changeStatus = 'idle';
      state.changeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCards.pending, (state) => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(loadCards.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(loadCards.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(revealCard.pending, (state) => {
        state.revealStatus = 'pending';
        state.revealError = null;
      })
      .addCase(revealCard.fulfilled, (state, action) => {
        state.revealStatus = 'succeeded';
        state.revealed = action.payload;
      })
      .addCase(revealCard.rejected, (state, action) => {
        state.revealStatus = 'failed';
        state.revealError = action.payload;
      })

      .addCase(issueCard.pending, (state) => {
        state.issueStatus = 'pending';
        state.issueError = null;
      })
      .addCase(issueCard.fulfilled, (state, action) => {
        state.issueStatus = 'succeeded';
        state.items = [action.payload.card, ...state.items];
        state.freshSecrets = action.payload.secrets;
      })
      .addCase(issueCard.rejected, (state, action) => {
        state.issueStatus = 'failed';
        state.issueError = action.payload;
      })

      .addCase(requestOtp.pending, (state) => {
        state.otpStatus = 'pending';
        state.otpError = null;
      })
      .addCase(requestOtp.fulfilled, (state) => {
        state.otpStatus = 'sent';
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.otpStatus = 'failed';
        state.otpError = action.payload;
      })

      .addCase(applyCardChange.pending, (state) => {
        state.changeStatus = 'pending';
        state.changeError = null;
      })
      .addCase(applyCardChange.fulfilled, (state, action) => {
        state.changeStatus = 'succeeded';
        state.items = state.items.map((card) =>
          card.id === action.payload.card.id ? action.payload.card : card,
        );
      })
      .addCase(applyCardChange.rejected, (state, action) => {
        state.changeStatus = 'failed';
        state.changeError = action.payload;
      });
  },
});

export const { secretsDismissed, detailsHidden, changeReset } = cardsSlice.actions;

export const selectCards = (state) => state.cards.items;
export const selectCardsStatus = (state) => state.cards.status;
export const selectCardsError = (state) => state.cards.error;
export const selectFreshSecrets = (state) => state.cards.freshSecrets;
export const selectRevealed = (state) => state.cards.revealed;
export const selectRevealStatus = (state) => state.cards.revealStatus;
export const selectRevealError = (state) => state.cards.revealError;
export const selectIssueStatus = (state) => state.cards.issueStatus;
export const selectIssueError = (state) => state.cards.issueError;
export const selectOtpStatus = (state) => state.cards.otpStatus;
export const selectOtpError = (state) => state.cards.otpError;
export const selectChangeStatus = (state) => state.cards.changeStatus;
export const selectChangeError = (state) => state.cards.changeError;

/** Only one card can be live at a time; expired ones stay as history. */
export const selectActiveCard = createSelector([selectCards], (cards) =>
  cards.find((card) => card.status !== 'expired') ?? null,
);

export default cardsSlice.reducer;
