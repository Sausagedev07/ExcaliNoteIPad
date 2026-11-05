/**
 * Nur Entwicklung: In-Memory-Ersatz für `window.electron.fs`, damit sich die
 * Oberfläche im Browser (z. B. mit iPad-Viewport 1194 × 834) prüfen lässt.
 * `?demo` füllt Beispiel-Notizbücher ein, sonst startet die App leer.
 */

interface Entry {
  content?: string;
  mtime: number;
}

const DAY = 86_400_000;

function emptyPage(): string {
  return JSON.stringify({ type: 'excalidraw', version: 2, source: 'https://excalinote.app', elements: [], appState: {}, files: {} });
}

function seed(store: Map<string, Entry>) {
  const now = Date.now();
  const dir = (path: string) => store.set(path, { mtime: now });
  const page = (path: string, ageDays: number) => store.set(path, { content: emptyPage(), mtime: now - ageDays * DAY });
  const meta = (path: string, short: string, color: string) => store.set(`${path}/.excalinote.json`, { content: JSON.stringify({ short, color }), mtime: now });

  dir('Physik'); meta('Physik', 'Ph', '#6D4AB0');
  page('Physik/Schiefe Ebene.excalidraw', 0);
  page('Physik/Newtonsche Axiome.excalidraw', 1);
  page('Physik/Energieerhaltung.excalidraw', 3);
  page('Physik/Kreisbewegung.excalidraw', 8);
  page('Physik/Schwingungen und Wellen.excalidraw', 15);
  dir('Physik/Optik');
  page('Physik/Optik/Brechung.excalidraw', 22);
  dir('Mathe'); meta('Mathe', 'Ma', '#2A6AB0');
  page('Mathe/Ableitungen.excalidraw', 2);
  dir('Bio'); meta('Bio', 'Bi', '#1B7568');
  dir('Deutsch'); meta('Deutsch', 'De', '#B4570F');
  dir('Englisch'); meta('Englisch', 'En', '#B0386B');
}

function clean(path: string): string {
  const parts = (path || '').split('/').filter((p) => p && p !== '.');
  if (parts.includes('..')) throw new Error('Invalid path: Path traversal detected');
  return parts.join('/');
}

export function installMemoryFs(): void {
  const store = new Map<string, Entry>();
  if (location.search.includes('demo')) seed(store);

  const ensureParents = (path: string) => {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('/');
      if (!store.has(parent)) store.set(parent, { mtime: Date.now() });
    }
  };

  const fs = {
    async readDir(dirPath: string) {
      const base = clean(dirPath);
      const prefix = base ? `${base}/` : '';
      return [...store.entries()]
        .filter(([path]) => path.startsWith(prefix) && path !== base && !path.slice(prefix.length).includes('/'))
        .map(([path, entry]) => ({
          name: path.slice(prefix.length),
          path,
          isDirectory: entry.content === undefined,
          mtime: entry.mtime,
          size: entry.content?.length ?? 0,
        }));
    },
    async readFile(filePath: string) {
      const entry = store.get(clean(filePath));
      if (entry?.content === undefined) throw new Error(`ENOENT: ${filePath}`);
      return entry.content;
    },
    async writeFile(filePath: string, content: string) {
      const path = clean(filePath);
      ensureParents(path);
      store.set(path, { content, mtime: Date.now() });
      return { success: true };
    },
    async createDir(dirPath: string) {
      const path = clean(dirPath);
      if (path) {
        ensureParents(path);
        if (!store.has(path)) store.set(path, { mtime: Date.now() });
      }
      return { success: true };
    },
    async delete(itemPath: string) {
      const path = clean(itemPath);
      for (const key of [...store.keys()]) {
        if (key === path || key.startsWith(`${path}/`)) store.delete(key);
      }
      return { success: true };
    },
    async rename(oldPath: string, newPath: string) {
      const from = clean(oldPath);
      const to = clean(newPath);
      ensureParents(to);
      for (const [key, entry] of [...store.entries()]) {
        if (key === from || key.startsWith(`${from}/`)) {
          store.delete(key);
          store.set(to + key.slice(from.length), entry);
        }
      }
      return { success: true };
    },
    async getBaseDir() {
      return 'Arbeitsspeicher (Entwicklung)';
    },
    async exists(path: string) {
      return store.has(clean(path));
    },
  };

  (window as any).electron = { fs };
}
