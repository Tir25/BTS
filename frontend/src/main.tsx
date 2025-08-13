import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';

// Setup console filter to suppress expected warnings in development
setupConsoleFilter();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
