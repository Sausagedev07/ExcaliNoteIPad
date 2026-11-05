import { create } from 'zustand';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

/**
 * Editor Store - Zustand der Zeichenfläche, den die eigene Oberfläche
 * (Kopfzeile, Werkzeugleiste, Zoom-Leiste) außerhalb von Excalidraw braucht.
 */

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

/** Stift und Textmarker sind beide Excalidraw-`freedraw`, unterscheiden sich nur im Stil */
export type PenMode = 'pen' | 'highlighter';

interface EditorStore {
  api: ExcalidrawImperativeAPI | null;
  setApi: (api: ExcalidrawImperativeAPI | null) => void;

  activeTool: string;
  setActiveTool: (tool: string) => void;

  penMode: PenMode;
  setPenMode: (mode: PenMode) => void;

  strokeColor: string;
  setStrokeColor: (color: string) => void;

  zoom: number;
  setZoom: (zoom: number) => void;

  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  api: null,
  setApi: (api) => set({ api }),

  activeTool: 'selection',
  setActiveTool: (activeTool) => set({ activeTool }),

  penMode: 'pen',
  setPenMode: (penMode) => set({ penMode }),

  strokeColor: '#26223A',
  setStrokeColor: (strokeColor) => set({ strokeColor }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  saveStatus: 'saved',
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}));

/**
 * Löst eine Aktion über die (ausgeblendeten) Excalidraw-Knöpfe aus.
 * Excalidraw 0.17 hat für Undo/Redo und Zoom keine öffentliche API.
 */
export function clickExcalidrawButton(selector: string, index = 0): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(`.excalidraw ${selector}`);
  buttons[index]?.click();
}
