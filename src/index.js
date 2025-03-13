// Primero, agregar React Query a las dependencias en package.json:
// "dependencies": {
//   ...
//   "@tanstack/react-query": "^5.0.0",
//   ...
// }

// src/index.js - Configuración de React Query
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Crear cliente de React Query con configuración óptima
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

reportWebVitals();