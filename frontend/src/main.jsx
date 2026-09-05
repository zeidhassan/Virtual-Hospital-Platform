import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#0d9488', secondary: '#fff' },
        },
      }}
    />
  </StrictMode>
);
