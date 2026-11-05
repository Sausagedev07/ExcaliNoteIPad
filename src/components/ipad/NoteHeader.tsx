import { useEffect, useRef, useState } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import { clickExcalidrawButton, useEditorStore } from '../../store/editorStore';
import { useSyncStore } from '../../store/syncStore';
import type { SyncStatus } from '../../types/sync';
import { logger } from '../../utils/logger';
import { AlertIcon, CloudIcon, CloudOffIcon, MoonIcon, RedoIcon, RefreshIcon, ShareIcon, SidebarIcon, SunIcon, UndoIcon } from './icons';
import { pageTitle } from './utils';

interface NoteHeaderProps {
  onOpenSync: () => void;
}

/** Kopfzeile (64 px) über der Zeichenfläche */
export default function NoteHeader({ onOpenSync }: NoteHeaderProps) {
  const { currentNote, renameItem, theme, setThemePreference, sidebarDocked, setSidebarDocked, renamingPath, setRenamingPath } = useNotebookStore();
  const api = useEditorStore((s) => s.api);
  const [title, setTitle] = useState('');
  const titleInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(currentNote ? pageTitle(currentNote) : '');
  }, [currentNote]);

  // Neue Seite: Titel zum Umbenennen markieren
  useEffect(() => {
    if (currentNote && renamingPath === currentNote) {
      setRenamingPath(null);
      requestAnimationFrame(() => titleInput.current?.select());
    }
  }, [currentNote, renamingPath, setRenamingPath]);

  const handleRename = async () => {
    if (!currentNote) return;
    const name = title.trim();
    const oldName = pageTitle(currentNote);
    if (!name || name === oldName || /[/\\:]/.test(name)) {
      setTitle(oldName);
      return;
    }
    const parent = currentNote.split('/').slice(0, -1).join('/');
    const newPath = parent ? `${parent}/${name}.excalidraw` : `${name}.excalidraw`;
    try {
      await renameItem(currentNote, newPath);
    } catch (error) {
      logger.error('Seite konnte nicht umbenannt werden', { error });
      setTitle(oldName);
    }
  };

  const isDark = theme === 'dark';

  return (
    <header
      className="flex items-center flex-shrink-0"
      style={{ height: 64, gap: 4, padding: '0 12px', borderBottom: '1px solid var(--border)', background: 'var(--canvas)' }}
    >
      <button
        type="button"
        className="icon-button"
        aria-label="Seitenliste ein- oder ausblenden"
        aria-pressed={sidebarDocked}
        title={sidebarDocked ? 'Seitenliste ausblenden' : 'Seitenliste einblenden'}
        onClick={() => setSidebarDocked(!sidebarDocked)}
      >
        <SidebarIcon />
      </button>

      <label htmlFor="seitentitel" className="sr-only">Seitentitel</label>
      <input
        id="seitentitel"
        type="text"
        className="page-title-input"
        value={title}
        ref={titleInput}
        disabled={!currentNote}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape' && currentNote) {
            setTitle(pageTitle(currentNote));
            e.currentTarget.blur();
          }
        }}
        placeholder={currentNote ? 'Seitentitel' : ''}
      />

      <button type="button" className="icon-button" aria-label="Rückgängig" title="Rückgängig" disabled={!api} onClick={() => clickExcalidrawButton('.undo-button-container button')}>
        <UndoIcon />
      </button>
      <button type="button" className="icon-button" aria-label="Wiederholen" title="Wiederholen" disabled={!api} onClick={() => clickExcalidrawButton('.redo-button-container button')}>
        <RedoIcon />
      </button>

      <div aria-hidden="true" style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />

      <SaveStatusButton onClick={onOpenSync} />

      <button
        type="button"
        className="icon-button"
        aria-label={isDark ? 'Helles Design' : 'Dunkles Design'}
        title={isDark ? 'Helles Design' : 'Dunkles Design'}
        onClick={() => setThemePreference(isDark ? 'light' : 'dark')}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Exportieren oder teilen"
        title="Exportieren oder teilen"
        disabled={!api}
        onClick={() => api?.updateScene({ appState: { openDialog: 'imageExport' } as any })}
      >
        <ShareIcon />
      </button>
    </header>
  );
}

const syncLabels: Record<SyncStatus, string> = {
  disconnected: 'Nicht verbunden',
  connecting: 'Verbinde …',
  syncing: 'Synchronisiere …',
  synced: 'Synchronisiert',
  paused: 'Offline',
  error: 'Sync-Fehler',
};

/**
 * Einzige Stelle für den Speicherstatus („Eine Wahrheit pro Information“):
 * lokal gespeichert, speichert gerade, oder der Sync-Zustand, wenn Sync an ist.
 */
function SaveStatusButton({ onClick }: { onClick: () => void }) {
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const { syncState, settings } = useSyncStore();

  // Nur anzeigen, wenn das Speichern spürbar dauert, sonst flackert der Knopf beim Zeichnen
  const [slowSave, setSlowSave] = useState(false);
  useEffect(() => {
    if (saveStatus !== 'saving') {
      setSlowSave(false);
      return;
    }
    const timer = setTimeout(() => setSlowSave(true), 600);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  let label = 'Lokal gespeichert';
  let icon = <CloudOffIcon size={20} />;
  let description = 'Lokal gespeichert, Synchronisation aus';

  if (slowSave) {
    label = 'Speichert …';
    description = 'Änderungen werden gespeichert';
  } else if (settings.enabled) {
    label = syncLabels[syncState.status];
    description = `Lokal gespeichert, ${label}`;
    icon =
      syncState.status === 'error' ? <AlertIcon size={20} /> :
      syncState.status === 'syncing' || syncState.status === 'connecting' ? <RefreshIcon size={20} className="animate-spin" /> :
      syncState.status === 'synced' ? <CloudIcon size={20} /> :
      <CloudOffIcon size={20} />;
  }

  return (
    <button
      type="button"
      aria-label={description}
      title={syncState.error ? `${description}: ${syncState.error}` : description}
      onClick={onClick}
      className="status-button"
      style={{ marginRight: 4, ...(settings.enabled && syncState.status === 'error' ? { color: 'var(--danger)' } : {}) }}
    >
      <span className="status-button__icon">{icon}</span>
      {label}
    </button>
  );
}
