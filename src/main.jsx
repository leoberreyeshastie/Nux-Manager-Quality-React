import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CatalogosProvider } from './context/CatalogosContext.jsx';
import { ExpedientesProvider } from './context/ExpedientesContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CatalogosProvider>
          <ExpedientesProvider>
            <App />
          </ExpedientesProvider>
        </CatalogosProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);