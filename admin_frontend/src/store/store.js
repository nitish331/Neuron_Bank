import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import accountsReducer from './accountsSlice';
import adminLoansReducer from './loansSlice';
import ratesReducer from './ratesSlice';
import customersReducer from './customersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    adminLoans: adminLoansReducer,
    rates: ratesReducer,
    customers: customersReducer,
  },
});
