import { create } from 'zustand';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

/**
 * Editor Store - Zustand der Zeichenfläche, den die eigene Oberfläche
 * (Kopfzeile, Werkzeugleiste, Zoom-Leiste) außerhalb von Excalidraw braucht.
 */

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

/** Stift und Textmarker sind beide Excalidraw-`freedraw`, unterscheiden sich nur im Stil */
export type PenMode = 'pen' | 'highlighter';

/** Zeicheninstrumente, die über der Zeichenfläche liegen */
export type Instrument = 'ruler' | 'setsquare' | 'parabola' | 'compass';

/** Lage eines Instruments in Szenenkoordinaten, Winkel in Grad */
export interface InstrumentPose {
  x: number;
  y: number;
  angle: number;
}

/** Sichtbarer Ausschnitt, damit Instrumente mit Zoom und Verschiebung mitgehen */
export interface View {
  scrollX: number;
  scrollY: number;
  zoom: number;
  offsetLeft: number;
  offsetTop: number;
}

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

  view: View;
  setView: (view: View) => void;

  instrument: Instrument | null;
  setInstrument: (instrument: Instrument | null) => void;
  poses: Partial<Record<Instrument, InstrumentPose>>;
  setPose: (instrument: Instrument, pose: InstrumentPose) => void;

  /** Zirkel: Einstich und Radius in Szenenkoordinaten */
  compass: { center: { x: number; y: number }; radius: number } | null;
  setCompass: (compass: { center: { x: number; y: number }; radius: number } | null) => void;

  functionSheetOpen: boolean;
  setFunctionSheetOpen: (open: boolean) => void;

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

  view: { scrollX: 0, scrollY: 0, zoom: 1, offsetLeft: 0, offsetTop: 0 },
  setView: (view) => set({ view }),

  instrument: null,
  setInstrument: (instrument) => set({ instrument }),
  poses: {},
  setPose: (instrument, pose) => set((state) => ({ poses: { ...state.poses, [instrument]: pose } })),

  compass: null,
  setCompass: (compass) => set({ compass }),

  functionSheetOpen: false,
  setFunctionSheetOpen: (functionSheetOpen) => set({ functionSheetOpen }),

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
