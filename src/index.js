import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Temporarily remove StrictMode to prevent double rendering
  <AuthProvider>
    <App />
  </AuthProvider>
);
