import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade out the inline boot loader once React has mounted its first frame.
requestAnimationFrame(() => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.classList.add('is-hidden');
    setTimeout(() => loader.remove(), 300);
  }
});
