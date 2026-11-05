import { create } from 'zustand';
import type { NotebookStore, NotebookItem, FileSystemEntry, NotebookMeta, ThemePreference } from '../types';
import { logger } from '../utils/logger';
import { syncService } from '../services/syncService';
import { generateDocId } from '../types/sync';
import type { NoteDocument, FolderDocument, ExcalidrawContent } from '../types/sync';

// ============================================================================
// Path-to-DocId Mapping (persistent in localStorage)
// ============================================================================

const PATH_DOC_ID_KEY = 'excalinote_path_doc_ids';

function loadPathDocIdMap(): Map<string, string> {
  try {
    const stored = localStorage.getItem(PATH_DOC_ID_KEY);
    if (stored) {
      return new Map(JSON.parse(stored));
    }
  } catch (error) {
    logger.warn('Fehler beim Laden der Path-DocId-Map', { error });
  }
  return new Map();
}

function savePathDocIdMap(map: Map<string, string>): void {
  try {
    localStorage.setItem(PATH_DOC_ID_KEY, JSON.stringify(Array.from(map.entries())));
  } catch (error) {
    logger.warn('Fehler beim Speichern der Path-DocId-Map', { error });
  }
}

const pathToDocId = loadPathDocIdMap();

function getOrCreateDocId(path: string, type: 'note' | 'folder'): string {
  if (pathToDocId.has(path)) {
    return pathToDocId.get(path)!;
  }
  const docId = generateDocId(type);
  pathToDocId.set(path, docId);
  savePathDocIdMap(pathToDocId);
  return docId;
}

function getDocIdForPath(path: string): string | null {
  return pathToDocId.get(path) || null;
}

function updatePathMapping(oldPath: string, newPath: string): void {
  const docId = pathToDocId.get(oldPath);
  if (docId) {
    pathToDocId.delete(oldPath);
    pathToDocId.set(newPath, docId);
    savePathDocIdMap(pathToDocId);
  }
}

function removePathMapping(path: string): void {
  pathToDocId.delete(path);
  savePathDocIdMap(pathToDocId);
}

function getParentDocId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length <= 1) {
    return null;
  }
  const parentPath = parts.slice(0, -1).join('/');
  return getDocIdForPath(parentPath);
}

// Hilfsfunktion: Pfade sicher zusammenfügen
export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

// Rekursiv Ordnerstruktur laden
async function loadFolderRecursive(path: string): Promise<NotebookItem[]> {
  try {
    const entries = await window.electron.fs.readDir(path) as FileSystemEntry[];
    const items: NotebookItem[] = [];

    for (const entry of entries) {
      // Versteckte Dateien (z. B. `.excalinote.json`) gehören nicht in die Ansicht
      if (entry.name.startsWith('.')) continue;

      const item: NotebookItem = {
        id: entry.path,
        name: entry.name,
        path: entry.path,
        type: entry.isDirectory ? 'folder' : 'note',
        mtime: entry.mtime,
        size: entry.size,
      };

      // Rekursiv Unterordner laden
      if (entry.isDirectory) {
        item.children = await loadFolderRecursive(entry.path);
      }

      items.push(item);
    }

    return items.sort((a, b) => {
      // Ordner zuerst, dann Notizen
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Alphabetisch sortieren
      return a.name.localeCompare(b.name, 'de');
    });
  } catch (error) {
    logger.error('Fehler beim Laden des Ordners', { path, error });
    return [];
  }
}

// ============================================================================
// Notizbuch-Metadaten und Einstellungen
// ============================================================================

const META_FILE = '.excalinote.json';
const PREFS_KEY = 'excalinote_prefs';

export const NOTEBOOK_COLORS = [
  { name: 'Violett', value: '#6D4AB0' },
  { name: 'Blau', value: '#2A6AB0' },
  { name: 'Grün', value: '#1B7568' },
  { name: 'Orange', value: '#B4570F' },
  { name: 'Rosa', value: '#B0386B' },
];

export const ACCENT_COLORS = [
  { name: 'Violett', value: '#6D4AB0' },
  { name: 'Blau', value: '#2A6AB0' },
  { name: 'Grün', value: '#1B7568' },
  { name: 'Rosa', value: '#B0386B' },
];

/** Kürzel aus dem Namen: „Physik“ → „Ph“, „Lineare Algebra“ → „LA“ */
export function defaultShort(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const word = words[0] || '?';
  return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase();
}

function fallbackMeta(name: string, index: number): NotebookMeta {
  return { short: defaultShort(name), color: NOTEBOOK_COLORS[index % NOTEBOOK_COLORS.length].value };
}

async function readNotebookMeta(path: string): Promise<NotebookMeta | null> {
  try {
    const data = JSON.parse(await window.electron.fs.readFile(joinPath(path, META_FILE)));
    if (typeof data.short === 'string' && typeof data.color === 'string') {
      return { short: data.short, color: data.color };
    }
  } catch {
    // Keine Metadaten vorhanden
  }
  return null;
}

async function writeNotebookMeta(path: string, meta: NotebookMeta): Promise<void> {
  await window.electron.fs.writeFile(joinPath(path, META_FILE), JSON.stringify(meta, null, 2));
}

interface Prefs {
  themePreference: ThemePreference;
  accent: string;
  showGrid: boolean;
  selectedNotebook: string | null;
}

function loadPrefs(): Prefs {
  const defaults: Prefs = { themePreference: 'light', accent: ACCENT_COLORS[0].value, showGrid: true, selectedNotebook: null };
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch (error) {
    logger.warn('Fehler beim Laden der Einstellungen', { error });
  }
  return defaults;
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    logger.warn('Fehler beim Speichern der Einstellungen', { error });
  }
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'auto') return pref;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const initialPrefs = loadPrefs();

// ============================================================================
// Sync-Hilfsfunktionen (fail-safe, non-blocking)
// ============================================================================

async function syncSaveNote(path: string, data: ExcalidrawContent): Promise<void> {
  try {
    const docId = getOrCreateDocId(path, 'note');
    const fileName = path.split('/').pop()?.replace('.excalidraw', '') || 'Unbenannt';

    const noteDoc: Omit<NoteDocument, '_rev'> = {
      _id: docId,
      type: 'note',
      name: fileName,
      parentId: getParentDocId(path),
      localPath: path,
      content: data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'local',
      modifiedBy: 'local',
    };

    await syncService.saveNote(noteDoc);
    logger.debug('Notiz in PouchDB gespeichert', { path, docId });
  } catch (error) {
    logger.warn('Fehler beim Sync-Speichern der Notiz (non-blocking)', { path, error });
  }
}

async function syncSaveFolder(path: string, name: string): Promise<void> {
  try {
    const docId = getOrCreateDocId(path, 'folder');

    const folderDoc: Omit<FolderDocument, '_rev'> = {
      _id: docId,
      type: 'folder',
      name: name,
      parentId: getParentDocId(path),
      localPath: path,
      folderType: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'local',
      modifiedBy: 'local',
    };

    await syncService.saveFolder(folderDoc);
    logger.debug('Ordner in PouchDB gespeichert', { path, docId });
  } catch (error) {
    logger.warn('Fehler beim Sync-Speichern des Ordners (non-blocking)', { path, error });
  }
}

async function syncDeleteItem(path: string): Promise<void> {
  try {
    const docId = getDocIdForPath(path);
    if (docId) {
      await syncService.deleteDocument(docId);
      removePathMapping(path);
      logger.debug('Element aus PouchDB gelöscht', { path, docId });
    }
  } catch (error) {
    logger.warn('Fehler beim Sync-Löschen des Elements (non-blocking)', { path, error });
  }
}

async function syncRenameItem(oldPath: string, newPath: string, isFolder: boolean): Promise<void> {
  try {
    const docId = getDocIdForPath(oldPath);
    if (docId) {
      const doc = isFolder
        ? await syncService.getFolder(docId)
        : await syncService.getNote(docId);

      if (doc) {
        const newName = newPath.split('/').pop()?.replace('.excalidraw', '') || 'Unbenannt';
        const newParentId = getParentDocId(newPath);

        if (isFolder) {
          await syncService.saveFolder({
            ...(doc as FolderDocument),
            name: newName,
            parentId: newParentId,
            localPath: newPath,
          });
        } else {
          await syncService.saveNote({
            ...(doc as NoteDocument),
            name: newName,
            parentId: newParentId,
            localPath: newPath,
          });
        }

        updatePathMapping(oldPath, newPath);
        logger.debug('Element in PouchDB umbenannt', { oldPath, newPath, docId });
      }
    }
  } catch (error) {
    logger.warn('Fehler beim Sync-Umbenennen (non-blocking)', { oldPath, newPath, error });
  }
}

// ============================================================================
// Notebook Store
// ============================================================================

export const useNotebookStore = create<NotebookStore>((set, get) => {
  const persist = () => {
    const { themePreference, accent, showGrid, selectedNotebook } = get();
    savePrefs({ themePreference, accent, showGrid, selectedNotebook });
  };

  return {
  currentNote: null,
  notebooks: [],
  baseDir: '',
  theme: resolveTheme(initialPrefs.themePreference),
  themePreference: initialPrefs.themePreference,
  accent: initialPrefs.accent,
  selectedNotebook: initialPrefs.selectedNotebook,
  notebookMeta: {},
  isLoading: false,
  sidebarDocked: true,
  showGrid: initialPrefs.showGrid,
  expandedFolders: new Set<string>(),
  renamingPath: null,

  setRenamingPath: (path) => set({ renamingPath: path }),

  setCurrentNote: (path) => set({ currentNote: path }),

  setNotebooks: (notebooks) => set({ notebooks }),

  setBaseDir: (dir) => set({ baseDir: dir }),

  setTheme: (theme) => {
    set({ theme, themePreference: theme });
    persist();
  },

  setThemePreference: (pref) => {
    set({ themePreference: pref, theme: resolveTheme(pref) });
    persist();
  },

  setAccent: (accent) => {
    set({ accent });
    persist();
  },

  setSelectedNotebook: (path) => {
    if (path === get().selectedNotebook) return;
    set({ selectedNotebook: path, currentNote: null });
    persist();
  },

  setSidebarDocked: (docked) => set({ sidebarDocked: docked }),

  setShowGrid: (show) => {
    set({ showGrid: show });
    persist();
  },

  toggleFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    return { expandedFolders: newExpanded };
  }),

  loadNotebooks: async () => {
    set({ isLoading: true });
    try {
      // Basis-Verzeichnis abrufen
      const baseDir = await window.electron.fs.getBaseDir();
      set({ baseDir });

      // Ordnerstruktur laden
      const notebooks = await loadFolderRecursive('');

      // Metadaten der Notizbücher (Ordner oberster Ebene)
      const folders = notebooks.filter((item) => item.type === 'folder');
      const metaEntries = await Promise.all(
        folders.map(async (folder, index) => [
          folder.path,
          (await readNotebookMeta(folder.path)) || fallbackMeta(folder.name, index),
        ] as const)
      );
      const notebookMeta = Object.fromEntries(metaEntries);

      // Gewähltes Notizbuch gültig halten
      const hasLooseNotes = notebooks.some((item) => item.type === 'note');
      let { selectedNotebook } = get();
      const exists = selectedNotebook === ''
        ? hasLooseNotes
        : folders.some((folder) => folder.path === selectedNotebook);
      if (!exists) {
        selectedNotebook = folders[0]?.path ?? (hasLooseNotes ? '' : null);
      }

      set({ notebooks, notebookMeta, selectedNotebook, isLoading: false });
      persist();
    } catch (error) {
      logger.error('Fehler beim Laden der Notizbücher', { error });
      set({ isLoading: false });
    }
  },

  createFolder: async (parentPath, name) => {
    try {
      const newPath = joinPath(parentPath, name);

      // 1. Im Dateisystem erstellen
      await window.electron.fs.createDir(newPath);

      // 2. In PouchDB speichern (non-blocking)
      syncSaveFolder(newPath, name);

      // Ordnerstruktur neu laden
      await get().loadNotebooks();

      // Parent Folder expanden
      if (parentPath) {
        const newExpanded = new Set(get().expandedFolders);
        newExpanded.add(parentPath);
        set({ expandedFolders: newExpanded });
      }

      // Rename Mode aktivieren
      set({ renamingPath: newPath });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Ordners', { parentPath, name, error });
      throw error;
    }
  },

  createNotebook: async (name, meta) => {
    try {
      const path = name.trim();
      await window.electron.fs.createDir(path);
      await writeNotebookMeta(path, meta);
      syncSaveFolder(path, path);
      set({ selectedNotebook: path, currentNote: null });
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Erstellen des Notizbuchs', { name, error });
      throw error;
    }
  },

  updateNotebook: async (path, name, meta) => {
    try {
      let target = path;
      const newName = name.trim();
      if (newName && newName !== path) {
        await get().renameItem(path, newName);
        target = newName;
      }
      await writeNotebookMeta(target, meta);
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Bearbeiten des Notizbuchs', { path, name, error });
      throw error;
    }
  },

  createNote: async (parentPath, name) => {
    try {
      // Stelle sicher, dass der Name die .excalidraw-Erweiterung hat
      const noteName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`;
      const newPath = joinPath(parentPath, noteName);

      // Erstelle eine leere Excalidraw-Datei
      const emptyData: ExcalidrawContent = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalinote.app',
        elements: [],
        appState: {
          gridSize: null,
          viewBackgroundColor: '#ffffff',
        },
        files: {},
      };

      // 1. Im Dateisystem speichern
      await window.electron.fs.writeFile(newPath, JSON.stringify(emptyData, null, 2));

      // 2. In PouchDB speichern (non-blocking)
      syncSaveNote(newPath, emptyData);

      // Ordnerstruktur neu laden
      await get().loadNotebooks();

      // Parent Folder expanden
      if (parentPath) {
        const newExpanded = new Set(get().expandedFolders);
        newExpanded.add(parentPath);
        set({ expandedFolders: newExpanded });
      }

      // Rename Mode aktivieren
      set({ renamingPath: newPath });

      // Neue Notiz öffnen
      set({ currentNote: newPath });
    } catch (error) {
      logger.error('Fehler beim Erstellen der Notiz', { parentPath, name, error });
      throw error;
    }
  },

  deleteItem: async (path) => {
    try {
      // 1. Im Dateisystem löschen
      await window.electron.fs.delete(path);

      // 2. Aus PouchDB löschen (non-blocking)
      syncDeleteItem(path);

      // Wenn die gelöschte Datei die aktuell geöffnete war, schließe sie
      const currentNote = get().currentNote;
      if (currentNote && (currentNote === path || currentNote.startsWith(path + '/'))) {
        set({ currentNote: null });
      }
      if (get().selectedNotebook === path) {
        set({ selectedNotebook: null });
      }

      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Löschen', { path, error });
      throw error;
    }
  },

  renameItem: async (oldPath, newPath) => {
    try {
      const isFolder = !oldPath.endsWith('.excalidraw');

      // 1. Im Dateisystem umbenennen
      await window.electron.fs.rename(oldPath, newPath);

      // 2. In PouchDB aktualisieren (non-blocking)
      syncRenameItem(oldPath, newPath, isFolder);

      // Bei Ordnern: Auch alle Kinder-Pfade aktualisieren
      if (isFolder) {
        const keysToUpdate: [string, string][] = [];
        pathToDocId.forEach((_, path) => {
          if (path.startsWith(oldPath + '/')) {
            const newChildPath = newPath + path.substring(oldPath.length);
            keysToUpdate.push([path, newChildPath]);
          }
        });
        keysToUpdate.forEach(([oldP, newP]) => {
          updatePathMapping(oldP, newP);
        });
      }

      // Wenn die umbenannte Datei die aktuell geöffnete war, aktualisiere den Pfad
      const currentNote = get().currentNote;
      if (currentNote) {
        if (currentNote === oldPath) {
          set({ currentNote: newPath });
        } else if (currentNote.startsWith(oldPath + '/')) {
          const newNotePath = newPath + currentNote.substring(oldPath.length);
          set({ currentNote: newNotePath });
        }
      }
      if (get().selectedNotebook === oldPath) {
        set({ selectedNotebook: newPath });
      }

      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Umbenennen', { oldPath, newPath, error });
      throw error;
    }
  },

  saveNote: async (path, data) => {
    try {
      // 1. Im Dateisystem speichern
      await window.electron.fs.writeFile(path, JSON.stringify(data, null, 2));

      // 2. In PouchDB speichern (non-blocking)
      syncSaveNote(path, data as ExcalidrawContent);

      // 3. Änderungsdatum in der Seitenliste aktualisieren
      const touch = (items: NotebookItem[]): NotebookItem[] =>
        items.map((item) =>
          item.path === path
            ? { ...item, mtime: Date.now() }
            : item.children && path.startsWith(item.path + '/')
              ? { ...item, children: touch(item.children) }
              : item
        );
      set({ notebooks: touch(get().notebooks) });
    } catch (error) {
      logger.error('Fehler beim Speichern der Notiz', { path, error });
      throw error;
    }
  },
  };
});
