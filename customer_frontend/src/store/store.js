import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import accountReducer from './accountSlice';
import transactionsReducer from './transactionsSlice';
import analyticsReducer from './analyticsSlice';
import cardsReducer from './cardsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
    transactions: transactionsReducer,
    analytics: analyticsReducer,
    cards: cardsReducer,
  },
});
