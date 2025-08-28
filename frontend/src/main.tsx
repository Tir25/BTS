import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';
import './utils/apiInterceptor';

// Setup console filter to suppress expected warnings in development
setupConsoleFilter();

// Preload critical fonts to prevent layout shifts
const link = document.createElement('link');
link.rel = 'preload';
link.as = 'font';
link.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
link.crossOrigin = 'anonymous';
document.head.appendChild(link);

// Ensure proper rendering
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
