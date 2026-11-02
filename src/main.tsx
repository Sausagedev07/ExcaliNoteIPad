import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installNativePlatform } from './platform/capacitorFs';

// Auf iOS/iPadOS erst den lokalen Dateisystem-Adapter installieren, dann rendern.
installNativePlatform().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
