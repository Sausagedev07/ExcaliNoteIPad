import { useEffect, useRef } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import type { NotebookItem } from '../../types';

/** Seitenname ohne Dateiendung */
export function pageTitle(path: string): string {
  return (path.split('/').pop() || '').replace(/\.excalidraw$/, '');
}

/** „Heute, 12:05“ · „Gestern“ · „Mo., 2. Nov.“ · „28. Okt.“ · „28. Okt. 2025“ */
export function formatPageDate(mtime?: number, now = new Date()): string {
  if (!mtime) return '';
  const date = new Date(mtime);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days === 0) {
    return `Heute, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days === 1) return 'Gestern';
  if (days > 1 && days < 7) {
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export interface PageGroup {
  /** Unterordner relativ zum Notizbuch, '' für die oberste Ebene */
  label: string;
  folderPath: string;
  pages: NotebookItem[];
}

/**
 * Seiten eines Notizbuchs: oberste Ebene zuerst, Unterordner als eigene Gruppen
 * (tiefere Ebenen flach als „A / B“). Neueste Seiten oben.
 */
export function groupPages(items: NotebookItem[], folderPath: string): PageGroup[] {
  const groups: PageGroup[] = [];

  const walk = (children: NotebookItem[], path: string, label: string) => {
    const pages = children
      .filter((item) => item.type === 'note' && item.name.endsWith('.excalidraw'))
      .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name, 'de'));
    if (pages.length > 0 || label === '') groups.push({ label, folderPath: path, pages });

    for (const folder of children.filter((item) => item.type === 'folder')) {
      walk(folder.children || [], folder.path, label ? `${label} / ${folder.name}` : folder.name);
    }
  };

  walk(items, folderPath, '');
  return groups;
}

/** Eindeutiger Name im Ordner: „Unbenannt“, „Unbenannt (1)“, … */
export function uniqueName(base: string, taken: string[]): string {
  let candidate = base;
  let counter = 1;
  while (taken.includes(candidate)) {
    candidate = `${base} (${counter})`;
    counter++;
  }
  return candidate;
}

/** Langes Drücken (Touch) und Rechtsklick (Maus) lösen dieselbe Aktion aus */
export function useLongPress(onLongPress: (x: number, y: number) => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const { clientX, clientY } = e;
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress(clientX, clientY);
      }, delay);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      clear();
      fired.current = true;
      onLongPress(e.clientX, e.clientY);
    },
    /** true, wenn der folgende Klick zum langen Drücken gehört und ignoriert werden soll */
    consumeClick: () => {
      const wasLongPress = fired.current;
      fired.current = false;
      return wasLongPress;
    },
  };
}

/** Ist im gewählten Notizbuch keine Seite offen, die neueste öffnen */
export function useAutoOpenPage() {
  const { notebooks, selectedNotebook, currentNote, setCurrentNote } = useNotebookStore();

  let firstPage: string | undefined;
  if (selectedNotebook !== null) {
    const items = selectedNotebook === ''
      ? notebooks.filter((item) => item.type === 'note')
      : notebooks.find((item) => item.path === selectedNotebook)?.children ?? [];
    firstPage = groupPages(items, selectedNotebook).find((group) => group.pages.length > 0)?.pages[0]?.path;
  }

  useEffect(() => {
    if (!currentNote && firstPage) setCurrentNote(firstPage);
  }, [currentNote, firstPage, setCurrentNote]);
}
