import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Editor from './components/Editor/Editor';
import UpdateNotification from './components/UpdateNotification';
import NotebookRail from './components/ipad/NotebookRail';
import PageList from './components/ipad/PageList';
import NoteHeader from './components/ipad/NoteHeader';
import WelcomeScreen from './components/ipad/WelcomeScreen';
import NotebookSheet from './components/ipad/NotebookSheet';
import SettingsSheet, { type SettingsView } from './components/ipad/SettingsSheet';
import { resolveTheme, useNotebookStore } from './store/notebookStore';
import { useSyncStore } from './store/syncStore';
import { useAutoOpenPage } from './components/ipad/utils';
import './components/ipad/ipad.css';

/** Unter dieser Breite (z. B. iPad hochkant) startet die Seitenliste eingeklappt */
const COMPACT_WIDTH = 1000;

function App() {
  const { notebooks, sidebarDocked, setSidebarDocked, theme, themePreference, accent, isLoading, baseDir } = useNotebookStore();
  const initSync = useSyncStore((s) => s.initialize);
  useAutoOpenPage();

  const [notebookSheet, setNotebookSheet] = useState<{ path: string | null } | null>(null);
  const [settingsView, setSettingsView] = useState<SettingsView | null>(null);

  // Sync-Service beim Start initialisieren
  useEffect(() => {
    initSync().catch(console.error);
  }, [initSync]);

  // Design und Akzentfarbe an die Tokens in index.css weitergeben
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty('--accent', accent);
  }, [theme, accent]);

  // „Auto“: dem Systemdesign folgen
  useEffect(() => {
    if (themePreference !== 'auto') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => useNotebookStore.setState({ theme: resolveTheme('auto') });
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [themePreference]);

  // Schmale Fenster (Hochformat): Seitenliste überlagert die Zeichenfläche statt sie zu verschmälern
  const [compact, setCompact] = useState(() => window.matchMedia(`(max-width: ${COMPACT_WIDTH - 1}px)`).matches);
  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${COMPACT_WIDTH - 1}px)`);
    if (media.matches) setSidebarDocked(false);
    const update = (e: MediaQueryListEvent) => {
      setCompact(e.matches);
      setSidebarDocked(!e.matches);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [setSidebarDocked]);

  const isEmpty = !isLoading && baseDir !== '' && notebooks.length === 0;
  const openNewNotebook = () => setNotebookSheet({ path: null });

  return (
    <ErrorBoundary>
      <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
        <NotebookRail
          onNewNotebook={openNewNotebook}
          onEditNotebook={(path) => setNotebookSheet({ path })}
          onOpenSettings={() => setSettingsView('main')}
        />

        {(isEmpty || (sidebarDocked && !compact)) && <PageList />}
        {!isEmpty && sidebarDocked && compact && (
          <div className="fixed inset-0 z-50 flex" style={{ left: 84 }} onPointerDown={(e) => e.target === e.currentTarget && setSidebarDocked(false)}>
            <div className="flex h-full" style={{ boxShadow: '0 16px 40px rgba(38, 34, 58, 0.18)' }}>
              <PageList onPageOpened={() => setSidebarDocked(false)} />
            </div>
          </div>
        )}

        {isEmpty ? (
          <WelcomeScreen onNewNotebook={openNewNotebook} />
        ) : (
          <main className="flex-1 min-w-0 flex flex-col" style={{ background: 'var(--canvas)' }}>
            <NoteHeader onOpenSync={() => setSettingsView('main')} />
            <Editor />
          </main>
        )}

        <UpdateNotification />
      </div>

      {notebookSheet && <NotebookSheet path={notebookSheet.path} onClose={() => setNotebookSheet(null)} />}
      {settingsView && <SettingsSheet initialView={settingsView} onClose={() => setSettingsView(null)} />}
    </ErrorBoundary>
  );
}

export default App;
