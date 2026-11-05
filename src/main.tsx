import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Schriften lokal gebündelt (App läuft offline, kein Google-Fonts-Link)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/caveat/600.css';
import '@fontsource/caveat/700.css';
import './index.css';
import { installNativePlatform } from './platform/capacitorFs';

// Auf iOS/iPadOS erst den lokalen Dateisystem-Adapter installieren, dann rendern.
// Im Browser (nur Entwicklung) ersetzt ein In-Memory-Dateisystem den Electron-Preload.
async function installPlatform() {
  await installNativePlatform();
  if (import.meta.env.DEV && !(window as any).electron) {
    const { installMemoryFs } = await import('./platform/memoryFs');
    installMemoryFs();
  }
}

installPlatform().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
