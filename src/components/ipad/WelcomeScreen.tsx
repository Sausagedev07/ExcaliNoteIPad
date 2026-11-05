import { useRef, useState } from 'react';
import { NOTEBOOK_COLORS, defaultShort, joinPath, useNotebookStore } from '../../store/notebookStore';
import { logger } from '../../utils/logger';
import { Capacitor } from '@capacitor/core';
import { CheckIcon, DownloadIcon, PlusIcon } from './icons';
import { uniqueName } from './utils';

interface WelcomeScreenProps {
  onNewNotebook: () => void;
}

/** Startseite ohne Notizbücher: eine Seite wie aus dem Heft, darunter Überschrift und zwei Aktionen */
export default function WelcomeScreen({ onNewNotebook }: WelcomeScreenProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const device = Capacitor.isNativePlatform() ? 'iPad' : 'Gerät';

  return (
    <main className="flex-1 min-w-0 flex items-center justify-center dot-grid overflow-y-auto" style={{ padding: 48 }}>
      <div className="welcome">
        <Sketch />
        <h1 className="hand-title welcome__title">Notizbücher zum Zeichnen und Schreiben von Hand</h1>
        <p className="welcome__lead">
          Skizzen, Formeln und Mitschriften mit dem Stift, auf Punktpapier wie im Heft. Jedes Notizbuch ist ein Ordner, jede Seite eine Datei.
        </p>
        <div className="welcome__actions">
          <button type="button" className="primary-button" onClick={onNewNotebook} style={{ height: 48 }}>
            <PlusIcon size={20} />
            Erstes Notizbuch anlegen
          </button>
          <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} style={{ height: 48 }}>
            <DownloadIcon size={20} />
            Aus Dateien importieren
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".excalidraw,.json,application/json"
            multiple
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length === 0) return;
              setMessage(await importFiles(files));
            }}
          />
        </div>
        {message && (
          <p role="status" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: '20px', color: 'var(--danger)' }}>
            {message}
          </p>
        )}
        <ul className="welcome__facts">
          {[
            `Speichert automatisch auf diesem ${device}`,
            'In der Dateien-App unter „ExcaliNote“',
            'Synchronisation optional, ab Werk aus',
          ].map((text) => (
            <li key={text}>
              <CheckIcon size={18} />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

/**
 * Eine Physik-Seite, wie sie in ExcaliNote entsteht: Tinte, drei Stiftfarben,
 * Beschriftung von Hand. Tinte und Stiftfarben folgen dem Design (im Dunkeln heller).
 */
function Sketch() {
  const hand = { fontFamily: 'Caveat, cursive', fontSize: 30, fontWeight: 700 } as const;
  return (
    <svg
      className="welcome__sketch"
      viewBox="0 120 660 300"
      role="img"
      aria-label="Skizze: Klotz auf einer schiefen Ebene mit Gewichtskraft, Normalkraft und Hangabtriebskraft"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M30 400 L610 400 L610 150 Z" stroke="currentColor" strokeWidth={3.2} />
      <path d="M470 217 L536 179 L575 246 L509 284 Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={3.2} />
      <path d="M522 232 L522 360 M509 342 L522 365 L535 342" stroke="var(--pen-orange)" strokeWidth={3.4} />
      <path d="M522 232 L484 152 M480 172 L482 148 L505 154" stroke="var(--pen-blue)" strokeWidth={3.4} />
      <path d="M522 232 L430 281 M448 258 L428 283 L455 289" stroke="var(--pen-green)" strokeWidth={3.4} />
      <path d="M130 400 A100 100 0 0 1 112 350" stroke="currentColor" strokeWidth={2.6} />
      <text x="146" y="380" {...hand} fill="currentColor">α</text>
      <text x="368" y="380" {...hand} fill="var(--pen-orange)">F_G = m · g</text>
      <text x="420" y="140" {...hand} fill="var(--pen-blue)">F_N</text>
      <text x="350" y="300" {...hand} fill="var(--pen-green)">F_H</text>
      <text x="40" y="200" {...hand} fill="currentColor">F_H = m · g · sin α</text>
      <text x="40" y="240" {...hand} fill="currentColor">F_N = m · g · cos α</text>
    </svg>
  );
}

/**
 * Prüft die Dateien und legt nur bei mindestens einer gültigen Excalidraw-Datei
 * ein Notizbuch „Importiert“ an. Gibt bei Erfolg null zurück (die Startseite
 * verschwindet dann ohnehin), sonst einen Hinweis.
 */
async function importFiles(files: File[]): Promise<string | null> {
  const pages: { name: string; text: string }[] = [];
  for (const file of files) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data?.type !== 'excalidraw' || !Array.isArray(data.elements)) continue;
      const base = file.name.replace(/\.(excalidraw|json)$/i, '') || 'Unbenannt';
      pages.push({ name: uniqueName(base, pages.map((page) => page.name)), text });
    } catch (error) {
      logger.warn('Datei übersprungen', { name: file.name, error });
    }
  }
  if (pages.length === 0) return 'Keine gültige Excalidraw-Datei gefunden';

  const store = useNotebookStore.getState();
  const taken = store.notebooks.filter((item) => item.type === 'folder').map((item) => item.name);
  const notebook = uniqueName('Importiert', taken);
  try {
    await store.createNotebook(notebook, { short: defaultShort(notebook), color: NOTEBOOK_COLORS[1].value });
    for (const page of pages) {
      await window.electron.fs.writeFile(joinPath(notebook, `${page.name}.excalidraw`), page.text);
    }
    await store.loadNotebooks();
    return null;
  } catch (error) {
    logger.error('Import fehlgeschlagen', { error });
    return 'Der Import ist fehlgeschlagen';
  }
}
