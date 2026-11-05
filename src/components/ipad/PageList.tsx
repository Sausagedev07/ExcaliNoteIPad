import { useEffect, useMemo, useState } from 'react';
import { exportToSvg } from '@excalidraw/excalidraw';
import { useNotebookStore } from '../../store/notebookStore';
import type { NotebookItem, PaperStyle } from '../../types';
import { logger } from '../../utils/logger';
import { ActionMenu } from './Overlay';
import { FolderIcon, PlusIcon, SearchIcon, TrashIcon } from './icons';
import { formatPageDate, groupPages, pageTitle, uniqueName, useLongPress, useNotebookPaper } from './utils';
import { paperClass } from './paper';

interface PageListProps {
  /** Wird nach dem Öffnen oder Anlegen einer Seite aufgerufen (Hochformat: Liste schließen) */
  onPageOpened?: () => void;
}

/** Mittlere Spalte (300 px): Notizbuch-Titel, Suche, „Neue Seite“, Seiten */
export default function PageList({ onPageOpened }: PageListProps) {
  const { notebooks, selectedNotebook, currentNote, setCurrentNote, createNote, deleteItem } = useNotebookStore();
  const [query, setQuery] = useState('');

  const notebookItems = useMemo(() => {
    if (selectedNotebook === null) return null;
    if (selectedNotebook === '') return notebooks.filter((item) => item.type === 'note');
    return notebooks.find((item) => item.path === selectedNotebook)?.children ?? null;
  }, [notebooks, selectedNotebook]);

  const groups = useMemo(
    () => (notebookItems && selectedNotebook !== null ? groupPages(notebookItems, selectedNotebook) : []),
    [notebookItems, selectedNotebook]
  );
  const pageCount = groups.reduce((sum, group) => sum + group.pages.length, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de');
    if (!q) return groups;
    return groups
      .map((group) => ({ ...group, pages: group.pages.filter((page) => pageTitle(page.path).toLocaleLowerCase('de').includes(q)) }))
      .filter((group) => group.pages.length > 0);
  }, [groups, query]);

  const handleNewPage = async () => {
    if (selectedNotebook === null || !notebookItems) return;
    try {
      const taken = notebookItems.filter((item) => item.type === 'note').map((item) => pageTitle(item.path));
      await createNote(selectedNotebook, uniqueName('Unbenannt', taken));
      onPageOpened?.();
    } catch (error) {
      logger.error('Seite konnte nicht angelegt werden', { error });
    }
  };

  const handleDelete = async (page: NotebookItem) => {
    if (!window.confirm(`Seite „${pageTitle(page.path)}“ löschen?`)) return;
    try {
      await deleteItem(page.path);
    } catch (error) {
      logger.error('Seite konnte nicht gelöscht werden', { error });
    }
  };

  // Startseite: noch kein Notizbuch
  if (selectedNotebook === null) {
    return (
      <section aria-label="Seiten" className="page-list">
        <div>
          <h2 className="sheet__title">Seiten</h2>
          <p className="page-list__subtitle">Noch kein Notizbuch gewählt</p>
        </div>
        <div
          className="flex flex-col items-center text-center"
          style={{ marginTop: 8, border: '1.5px dashed var(--dash)', borderRadius: 12, padding: '24px 16px', gap: 8 }}
        >
          <span style={{ color: 'var(--muted-2)' }}>
            <FolderIcon size={24} />
          </span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: '20px' }}>Keine Notizbücher</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--muted-2)' }}>
            Lege links ein Notizbuch an, dann erscheinen hier seine Seiten
          </p>
        </div>
      </section>
    );
  }

  const title = selectedNotebook === '' ? 'Lose Seiten' : selectedNotebook;

  return (
    <section aria-label={`Seiten in ${title}`} className="page-list">
      <div>
        <h1 className="hand-title page-list__title truncate">{title}</h1>
        <p className="page-list__subtitle">{pageCount === 1 ? '1 Seite' : `${pageCount} Seiten`}</p>
      </div>

      <div className="relative flex-shrink-0">
        <label htmlFor="seiten-suche" className="sr-only">Seiten durchsuchen</label>
        <span className="absolute flex" style={{ left: 12, top: 12, color: 'var(--muted-2)', pointerEvents: 'none' }}>
          <SearchIcon size={20} />
        </span>
        <input
          id="seiten-suche"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen"
          className="page-list__search"
        />
      </div>

      <button type="button" className="primary-button flex-shrink-0" onClick={handleNewPage} style={{ height: 44 }}>
        <PlusIcon size={20} />
        Neue Seite
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ margin: '0 -4px', padding: '0 4px 8px' }}>
        {filtered.length === 0 || (pageCount === 0 && !query) ? (
          <p className="page-list__note">
            {query ? `Keine Seite passt zu „${query.trim()}“` : 'Dieses Notizbuch ist noch leer'}
          </p>
        ) : (
          filtered.map((group) => (
            <div key={group.folderPath}>
              {group.label && (
                <h3 className="page-list__group truncate">
                  {group.label}
                </h3>
              )}
              <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 4 }}>
                {group.pages.map((page) => (
                  <PageRow
                    key={page.path}
                    page={page}
                    selected={page.path === currentNote}
                    onOpen={() => {
                      setCurrentNote(page.path);
                      onPageOpened?.();
                    }}
                    onDelete={() => handleDelete(page)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PageRow({ page, selected, onOpen, onDelete }: { page: NotebookItem; selected: boolean; onOpen: () => void; onDelete: () => void }) {
  const paper = useNotebookPaper();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const longPress = useLongPress((x, y) => setMenu({ x, y }));

  return (
    <li>
      <button
        type="button"
        aria-current={selected ? 'page' : undefined}
        onPointerDown={longPress.onPointerDown}
        onPointerMove={longPress.onPointerMove}
        onPointerUp={longPress.onPointerUp}
        onPointerCancel={longPress.onPointerCancel}
        onContextMenu={longPress.onContextMenu}
        onClick={() => {
          if (!longPress.consumeClick()) onOpen();
        }}
        className={`page-row${selected ? ' page-row--selected' : ''}`}
      >
        <PageThumb path={page.path} mtime={page.mtime} paper={paper} />
        <span className="flex flex-col min-w-0">
          <span className="page-row__title truncate">{pageTitle(page.path)}</span>
          <span className="page-row__date">{formatPageDate(page.mtime)}</span>
        </span>
      </button>
      {menu && (
        <ActionMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          actions={[{ label: 'Seite löschen', danger: true, icon: <TrashIcon size={20} />, onSelect: onDelete }]}
        />
      )}
    </li>
  );
}

// Vorschauen pro Datei und Änderungszeit; nacheinander erzeugt, damit lange Listen nicht stocken
const thumbCache = new Map<string, Promise<string | null>>();
let thumbQueue: Promise<unknown> = Promise.resolve();

function loadThumb(path: string, mtime?: number): Promise<string | null> {
  const key = `${path}:${mtime ?? 0}`;
  let entry = thumbCache.get(key);
  if (!entry) {
    entry = thumbQueue.then(async () => {
      const data = JSON.parse(await window.electron.fs.readFile(path));
      const elements = (data.elements || []).filter((element: any) => !element.isDeleted);
      if (elements.length === 0) return null;
      const svg = await exportToSvg({
        elements,
        appState: { exportBackground: false, viewBackgroundColor: 'transparent', exportWithDarkMode: false },
        files: data.files || {},
        exportPadding: 8,
      });
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
    }).catch(() => null);
    thumbQueue = entry;
    thumbCache.set(key, entry);
  }
  return entry;
}

/** Miniatur der Seite: die echte Zeichnung, leere Seiten als Punktpapier */
function PageThumb({ path, mtime, paper }: { path: string; mtime?: number; paper: PaperStyle }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadThumb(path, mtime).then((url) => active && setSrc(url));
    return () => {
      active = false;
    };
  }, [path, mtime]);

  return (
    <span className={`page-thumb ${paperClass(paper)}`} aria-hidden="true">
      {src && <img src={src} alt="" draggable={false} />}
    </span>
  );
}
