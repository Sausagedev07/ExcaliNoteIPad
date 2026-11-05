import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/types/data/transform';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { PT_PER_MM } from './paper';

/** Szeneneinheiten pro Zentimeter bei 100 % Zoom (passt zu Kästchen von 5 mm) */
export const UNITS_PER_CM = PT_PER_MM * 10;

export interface Point {
  x: number;
  y: number;
}

/** Bildschirmkoordinaten (clientX/Y) → Szenenkoordinaten */
export function toScene(api: ExcalidrawImperativeAPI, clientX: number, clientY: number): Point {
  const { zoom, scrollX, scrollY, offsetLeft, offsetTop } = api.getAppState();
  return {
    x: (clientX - offsetLeft) / zoom.value - scrollX,
    y: (clientY - offsetTop) / zoom.value - scrollY,
  };
}

/** Mitte des sichtbaren Bereichs in Szenenkoordinaten */
export function viewportCenter(api: ExcalidrawImperativeAPI): Point {
  const { zoom, scrollX, scrollY, width, height } = api.getAppState();
  return { x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY };
}

export function formatCm(units: number): string {
  return `${(units / UNITS_PER_CM).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`;
}

/** Strichstil für Konstruktionen: aktuelle Farbe und Stärke, aber ohne Handzeichen-Zittern */
export function penStyle(api: ExcalidrawImperativeAPI) {
  const state = api.getAppState();
  return {
    strokeColor: state.currentItemStrokeColor,
    strokeWidth: state.currentItemStrokeWidth,
    opacity: state.currentItemOpacity,
    roughness: 0,
  };
}

/** Polylinie aus Szenenpunkten als Excalidraw-Linie */
export function polyline(points: Point[], extra: Record<string, unknown> = {}): ExcalidrawElementSkeleton {
  const [first] = points;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    type: 'line',
    x: first.x,
    y: first.y,
    // Ausmaße selbst setzen: convertToExcalidrawElements leitet sie nicht aus den Punkten ab
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    points: points.map((p) => [p.x - first.x, p.y - first.y]),
    ...extra,
  } as ExcalidrawElementSkeleton;
}

/** Fügt Elemente als ein Schritt der Rückgängig-Historie ein; mit `group` bleiben sie zusammen */
export function addElements(api: ExcalidrawImperativeAPI, skeletons: ExcalidrawElementSkeleton[], group = false) {
  const groupId = group ? `g-${Math.random().toString(36).slice(2, 10)}` : null;
  const created = convertToExcalidrawElements(
    skeletons.map((skeleton) => (groupId ? { ...skeleton, groupIds: [groupId] } : skeleton)) as ExcalidrawElementSkeleton[]
  );
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...created],
    commitToHistory: true,
  });
  return created;
}
