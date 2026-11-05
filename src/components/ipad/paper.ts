import type { PaperStyle } from '../../types';

/**
 * Papierarten für die Zeichenfläche.
 *
 * Maße bei 100 % Zoom: iPad Pro 11" und iPad Air zeigen 132 pt pro Zoll,
 * also 5,2 pt pro Millimeter. Ein Kästchen von 0,5 cm sind damit 26 pt.
 * Auf Geräten mit anderer Punktdichte (iPad mini, Desktop) weicht das physische Maß leicht ab.
 */
export const PT_PER_MM = 132 / 25.4;

export const PAPER_STYLES: { value: PaperStyle; label: string; spacingMm: number }[] = [
  { value: 'grid', label: 'Kariert', spacingMm: 5 },
  { value: 'lined', label: 'Liniert', spacingMm: 8 },
  { value: 'dots', label: 'Punkte', spacingMm: 5 },
  { value: 'blank', label: 'Blanko', spacingMm: 5 },
];

/** Rasterabstand in CSS-Pixeln bei 100 % Zoom */
export function paperSpacing(style: PaperStyle): number {
  const entry = PAPER_STYLES.find((paper) => paper.value === style) ?? PAPER_STYLES[0];
  return Math.round(entry.spacingMm * PT_PER_MM);
}

export function paperClass(style: PaperStyle): string {
  return `paper paper--${style}`;
}
