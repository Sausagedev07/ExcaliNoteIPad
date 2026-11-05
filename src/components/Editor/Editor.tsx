import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw, MainMenu, getSceneVersion } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { useEditorStore } from '../../store/editorStore';
import { useSyncStore } from '../../store/syncStore';
import { logger } from '../../utils/logger';
import DrawingToolbar, { ZoomBar } from '../ipad/DrawingToolbar';
import { NotebookIcon, PlusIcon } from '../ipad/icons';
import { pageTitle, uniqueName } from '../ipad/utils';

/** Seiten mit Standard-Hintergrund zeigen das Papier samt Punktraster dahinter */
const PAPER_BACKGROUNDS = ['#ffffff', '#fff', '#fffefb', 'transparent'];
const GRID_SIZE = 26;

export default function Editor() {
  const {
    currentNote,
    saveNote,
    theme,
    loadNotebooks,
    showGrid,
  } = useNotebookStore();
  // Nur die (stabilen) Setter: kein Re-Render bei jeder Zustandsänderung
  const { setApi, setActiveTool, setZoom, setSaveStatus } = useEditorStore.getState();

  const [initialData, setInitialData] = useState<{
    elements?: ExcalidrawElement[];
    appState?: any;
    files?: BinaryFiles;
  } | null>(null);
  const [loadedNotePath, setLoadedNotePath] = useState<string | null>(null);

  // useRef für Debouncing und Änderungserkennung
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutNoteRef = useRef<string | null>(null);
  const sceneVersionRef = useRef<number | null>(null);
  const fileCountRef = useRef(0);
  const backgroundRef = useRef<string | undefined>(undefined);
  const loadedNoteRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync-Store für Datei-Updates
  const { lastSyncUpdate } = useSyncStore();

  // Initial: Notizbücher laden
  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  // Notizbücher neu laden wenn Sync-Update erfolgt
  useEffect(() => {
    if (lastSyncUpdate > 0) {
      logger.info('Sync-Update erkannt, lade Notizbücher neu');
      loadNotebooks();
    }
  }, [lastSyncUpdate, loadNotebooks]);

  // Aktuelle Notiz laden
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!currentNote || !window.electron) return;

      // Reset status on note switch
      setSaveStatus('saved');

      // Verhindere doppeltes Laden derselben Notiz
      if (loadedNoteRef.current === currentNote) return;

      loadedNoteRef.current = currentNote;

      let data: any = { elements: [], appState: {}, files: {} };
      try {
        logger.info('[Editor] Lade Notiz', { currentNote });

        // Lade JSON-Datei mit elements, appState UND files (Bilder inline)
        const content = await window.electron.fs.readFile(currentNote);

        // RACE CONDITION CHECK:
        // Prüfe ob die geladene Notiz noch immer die aktuell ausgewählte ist.
        // Wenn der User inzwischen gewechselt hat, verwerfen wir das Ergebnis.
        if (currentNote !== loadedNoteRef.current) {
          logger.info('[Editor] Ladevorgang verworfen - User hat bereits gewechselt', {
            loaded: currentNote,
            current: loadedNoteRef.current
          });
          return;
        }

        data = JSON.parse(content);
        logger.info('[Editor] Notiz-Daten geladen', {
          elementCount: data.elements?.length || 0,
          fileCount: Object.keys(data.files || {}).length,
          currentNote
        });
      } catch (error) {
        logger.error('[Editor] Fehler beim Laden der Notiz', { currentNote, error });
      }

      // Weißer Standard-Hintergrund → transparent, damit Papier und Punktraster durchscheinen
      const appState = { ...(data.appState || {}) };
      const background = String(appState.viewBackgroundColor ?? '#ffffff').toLowerCase();
      if (PAPER_BACKGROUNDS.includes(background)) {
        appState.viewBackgroundColor = 'transparent';
      }
      // Excalidraws Linienraster ersetzt das eigene Punktraster
      appState.gridSize = null;
      // Neue Striche in der Farbe der eigenen Werkzeugleiste
      appState.currentItemStrokeColor = useEditorStore.getState().strokeColor;
      appState.currentItemOpacity = 100;
      useEditorStore.setState({ penMode: 'pen' });

      const elements = data.elements || [];
      sceneVersionRef.current = getSceneVersion(elements);
      fileCountRef.current = Object.keys(data.files || {}).length;
      backgroundRef.current = appState.viewBackgroundColor;

      setInitialData({ elements, appState, files: data.files || {} });
      setLoadedNotePath(currentNote);
    };

    loadCurrentNote();
  }, [currentNote, setSaveStatus]);

  // Cleanup für Debouncing und API
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setApi(null);
    };
  }, [setApi]);

  // Punktraster mit der Zeichenfläche mitbewegen (direkt am DOM, ohne Re-Render)
  const updateGrid = useCallback((appState: AppState) => {
    const el = canvasRef.current;
    if (!el) return;
    const zoom = appState.zoom.value;
    const size = GRID_SIZE * zoom;
    el.style.backgroundSize = `${size}px ${size}px`;
    el.style.backgroundPosition = `${appState.scrollX * zoom}px ${appState.scrollY * zoom}px`;
  }, []);

  // Auto-Save: nur bei echten Inhaltsänderungen speichern (nicht beim Verschieben der Ansicht)
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // Zustand für die eigene Oberfläche
      const editor = useEditorStore.getState();
      if (editor.activeTool !== appState.activeTool.type) setActiveTool(appState.activeTool.type);
      if (editor.zoom !== appState.zoom.value) setZoom(appState.zoom.value);
      updateGrid(appState);

      if (!currentNote) return;

      const version = getSceneVersion(elements);
      const fileCount = Object.keys(files).length;
      if (
        version === sceneVersionRef.current &&
        fileCount === fileCountRef.current &&
        appState.viewBackgroundColor === backgroundRef.current
      ) {
        return;
      }
      sceneVersionRef.current = version;
      fileCountRef.current = fileCount;
      backgroundRef.current = appState.viewBackgroundColor;

      // Setze Status auf unsaved
      setSaveStatus('unsaved');

      // Ausstehendes Speichern derselben Seite ersetzen; das einer anderen Seite läuft weiter
      if (saveTimeoutRef.current && saveTimeoutNoteRef.current === currentNote) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save (500ms)
      saveTimeoutNoteRef.current = currentNote;
      saveTimeoutRef.current = setTimeout(async () => {
        saveTimeoutRef.current = null;
        setSaveStatus('saving');
        try {
          // Excalidraw-Standard: Speichere alles inline in der JSON-Datei
          await saveNote(currentNote, {
            type: 'excalidraw',
            version: 2,
            source: 'https://excalinote.app',
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              currentItemFontFamily: appState.currentItemFontFamily,
              currentItemFontSize: appState.currentItemFontSize,
              currentItemStrokeColor: appState.currentItemStrokeColor,
              currentItemBackgroundColor: appState.currentItemBackgroundColor,
              currentItemFillStyle: appState.currentItemFillStyle,
              currentItemStrokeWidth: appState.currentItemStrokeWidth,
              currentItemRoughness: appState.currentItemRoughness,
              currentItemOpacity: appState.currentItemOpacity,
            },
            files,
          });
          setSaveStatus('saved');
          logger.info('[Editor] Notiz gespeichert', {
            currentNote,
            elementCount: elements.length,
            fileCount,
          });
        } catch (error) {
          logger.error('[Editor] Fehler beim Speichern', { currentNote, error });
          setSaveStatus('unsaved');
        }
      }, 500);
    },
    [currentNote, saveNote, setActiveTool, setZoom, setSaveStatus, updateGrid]
  );

  // Excalidraw API Handler
  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    setApi(api);
    logger.info('[Editor] Excalidraw API initialisiert');
  }, [setApi]);

  const canvasClass = `ipad-canvas flex-1 relative overflow-hidden${showGrid ? ' dot-grid' : ''}`;

  if (!currentNote) {
    return (
      <div className={canvasClass}>
        <EmptyNotebook />
      </div>
    );
  }

  // Leere Fläche, bis die Daten für die aktuelle Notiz bereit sind (Laden dauert lokal nur kurz)
  if (currentNote !== loadedNotePath) {
    return <div className={canvasClass} aria-busy="true" />;
  }

  return (
    <div ref={canvasRef} className={canvasClass}>
      <Excalidraw
        key={currentNote}
        excalidrawAPI={handleExcalidrawAPI}
        onChange={handleChange}
        initialData={initialData}
        validateEmbeddable={(url) => {
          // Erlaube alle http/https URLs für Web Embeds (nicht nur bekannte Domains)
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            return true;
          }
          return false;
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: { saveFileToDisk: true },
            changeViewBackgroundColor: true,
          },
        }}
        langCode="de"
        theme={theme}
      >
        {/* Leeres Menü: unterdrückt Excalidraws Standardmenü und Willkommensbildschirm */}
        <MainMenu />
      </Excalidraw>
      <ZoomBar />
      <DrawingToolbar />
    </div>
  );
}

/** Notizbuch gewählt, aber keine Seite offen (z. B. leeres Notizbuch) */
function EmptyNotebook() {
  const { notebooks, selectedNotebook, createNote } = useNotebookStore();
  if (selectedNotebook === null) return null;

  const items = selectedNotebook === ''
    ? notebooks
    : notebooks.find((item) => item.path === selectedNotebook)?.children ?? [];
  const taken = items.filter((item) => item.type === 'note').map((item) => pageTitle(item.path));

  return (
    <div className="empty-state">
      <div className="empty-state__body">
        <span style={{ color: 'var(--muted-2)' }}>
          <NotebookIcon size={32} />
        </span>
        <div>
          <h2 className="empty-state__title">Noch keine Seite</h2>
          <p className="empty-state__text">Lege eine Seite an und fang an zu zeichnen. Gespeichert wird automatisch.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          style={{ height: 48 }}
          onClick={() => createNote(selectedNotebook, uniqueName('Unbenannt', taken)).catch((error) => logger.error('Seite konnte nicht angelegt werden', { error }))}
        >
          <PlusIcon size={20} />
          Erste Seite anlegen
        </button>
      </div>
    </div>
  );
}
