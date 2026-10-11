import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import accountReducer from './accountSlice';
import transactionsReducer from './transactionsSlice';
import analyticsReducer from './analyticsSlice';
import cardsReducer from './cardsSlice';
import beneficiariesReducer from './beneficiariesSlice';
import investmentsReducer from './investmentsSlice';
import loansReducer from './loansSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
    transactions: transactionsReducer,
    analytics: analyticsReducer,
    cards: cardsReducer,
    beneficiaries: beneficiariesReducer,
    investments: investmentsReducer,
    loans: loansReducer,
  },
});
