import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import { ThemeProvider } from './context/ThemeContext';
import AuthProvider from './context/AuthProvider';
import reportWebVitals from './reportWebVitals';

// Order matters: tokens define the variables the other two consume.
import './styles/tokens.css';
import './styles/global.css';
import './styles/utilities.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
