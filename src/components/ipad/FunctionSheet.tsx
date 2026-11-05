import { useMemo, useState } from 'react';
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/types/data/transform';
import { useEditorStore } from '../../store/editorStore';
import { Group, Sheet } from './Overlay';
import { PlusIcon, TrashIcon } from './icons';
import { parseFunction, ParseError, type Fn } from './mathParser';
import { paperSpacing } from './paper';
import { addElements, polyline, UNITS_PER_CM, viewportCenter, type Point } from './scene';

/**
 * Funktionsgraph: Terme eingeben, Bereich wählen, als Koordinatensystem mit
 * Graphen in die Seite einfügen. 1 Einheit = 1 cm (2 Kästchen), wählbar.
 */

const COLORS = ['#2A6AB0', '#B4570F', '#1B7568', '#B0386B'];
const UNITS = [
  { label: '0,5 cm', cm: 0.5 },
  { label: '1 cm', cm: 1 },
  { label: '2 cm', cm: 2 },
];

interface Range {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface Curve {
  term: string;
  fn: Fn | null;
  error: string | null;
}

/** Punkte des Graphen in Funktionskoordinaten, getrennt an Lücken und Polstellen */
function sampleSegments(fn: Fn, range: Range): Point[][] {
  const steps = 600;
  const span = range.yMax - range.yMin;
  const segments: Point[][] = [];
  let current: Point[] = [];
  let last: Point | null = null;
  for (let i = 0; i <= steps; i++) {
    const x = range.xMin + ((range.xMax - range.xMin) * i) / steps;
    const y = fn(x);
    const inside = Number.isFinite(y) && y >= range.yMin - span * 0.02 && y <= range.yMax + span * 0.02;
    const jump = last && Number.isFinite(y) && Math.abs(y - last.y) > span;
    if (!inside || jump) {
      if (current.length > 1) segments.push(current);
      current = inside ? [{ x, y }] : [];
    } else {
      current.push({ x, y });
    }
    last = Number.isFinite(y) ? { x, y } : null;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/** Term zum Anzeigen: x^2 → x², * → ·, - → − */
function prettyTerm(term: string): string {
  const sup: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return term
    .trim()
    .replace(/\^(\d+)/g, (_, d: string) => [...d].map((c) => sup[c]).join(''))
    .replace(/\*/g, ' · ')
    .replace(/-/g, '−')
    .replace(/\s+/g, ' ');
}

const formatTick = (v: number) => String(v).replace('.', ',').replace('-', '−');

/** Schrittweite der Achsenbeschriftung, damit höchstens etwa 12 Zahlen pro Achse stehen */
function tickStep(span: number): number {
  for (const step of [1, 2, 5, 10, 20, 50]) if (span / step <= 12) return step;
  return 100;
}

function ticks(min: number, max: number): number[] {
  const step = tickStep(max - min);
  const values: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) if (v !== 0) values.push(v);
  return values;
}

function buildElements(curves: Curve[], range: Range, unitCm: number, center: Point): ExcalidrawElementSkeleton[] {
  const u = unitCm * UNITS_PER_CM;
  // Ursprung auf das Papierraster legen
  const grid = paperSpacing('grid');
  const xc = (range.xMin + range.xMax) / 2;
  const yc = (range.yMin + range.yMax) / 2;
  const origin = {
    x: Math.round((center.x - xc * u) / grid) * grid,
    y: Math.round((center.y + yc * u) / grid) * grid,
  };
  const at = (x: number, y: number): Point => ({ x: origin.x + x * u, y: origin.y - y * u });

  const ink = { strokeColor: '#26223A', strokeWidth: 1, roughness: 0 };
  const label = { strokeColor: '#26223A', fontSize: 14, fontFamily: 2 };
  const axisY = Math.min(Math.max(0, range.yMin), range.yMax);
  const axisX = Math.min(Math.max(0, range.xMin), range.xMax);
  const pad = 0.4;
  const elements: ExcalidrawElementSkeleton[] = [];

  const xStart = at(range.xMin - pad, axisY);
  const xEnd = at(range.xMax + pad, axisY);
  const yStart = at(axisX, range.yMin - pad);
  const yEnd = at(axisX, range.yMax + pad);
  elements.push({ type: 'arrow', x: xStart.x, y: xStart.y, points: [[0, 0], [xEnd.x - xStart.x, 0]], endArrowhead: 'triangle', ...ink } as any);
  elements.push({ type: 'arrow', x: yStart.x, y: yStart.y, points: [[0, 0], [0, yEnd.y - yStart.y]], endArrowhead: 'triangle', ...ink } as any);
  elements.push({ type: 'text', x: xEnd.x - 6, y: xEnd.y + 8, text: 'x', ...label, fontSize: 18 } as any);
  elements.push({ type: 'text', x: yEnd.x + 10, y: yEnd.y - 4, text: 'y', ...label, fontSize: 18 } as any);

  const tick = 0.12 * UNITS_PER_CM;
  for (const x of ticks(range.xMin, range.xMax)) {
    const p = at(x, axisY);
    elements.push(polyline([{ x: p.x, y: p.y - tick }, { x: p.x, y: p.y + tick }], ink));
    elements.push({ type: 'text', x: p.x - 4 * String(x).length, y: p.y + tick + 4, text: formatTick(x), ...label } as any);
  }
  for (const y of ticks(range.yMin, range.yMax)) {
    const p = at(axisX, y);
    elements.push(polyline([{ x: p.x - tick, y: p.y }, { x: p.x + tick, y: p.y }], ink));
    elements.push({ type: 'text', x: p.x - tick - 8 - 8 * String(y).length, y: p.y - 9, text: formatTick(y), ...label } as any);
  }

  curves.forEach((curve, i) => {
    if (!curve.fn) return;
    const color = COLORS[i % COLORS.length];
    const segments = sampleSegments(curve.fn, range);
    for (const segment of segments) {
      elements.push(polyline(segment.map((p) => at(p.x, p.y)), { strokeColor: color, strokeWidth: 2, roughness: 0 }));
    }
    const last = segments[segments.length - 1]?.[segments[segments.length - 1].length - 1];
    if (last) {
      const p = at(last.x, last.y);
      const name = String.fromCharCode('f'.charCodeAt(0) + i);
      elements.push({ type: 'text', x: p.x + 8, y: p.y - 24, text: `${name}(x) = ${prettyTerm(curve.term)}`, strokeColor: color, fontSize: 18, fontFamily: 1 } as any);
    }
  });
  return elements;
}

export default function FunctionSheet() {
  const { api, setFunctionSheetOpen } = useEditorStore();
  const [terms, setTerms] = useState(['x^2 - 2']);
  const [range, setRange] = useState<Range>({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
  const [unitCm, setUnitCm] = useState(1);

  const curves: Curve[] = useMemo(
    () =>
      terms.map((term) => {
        if (!term.trim()) return { term, fn: null, error: null };
        try {
          return { term, fn: parseFunction(term), error: null };
        } catch (error) {
          return { term, fn: null, error: error instanceof ParseError ? error.message : 'Der Term ist ungültig' };
        }
      }),
    [terms]
  );

  const rangeError =
    range.xMin >= range.xMax ? 'x von muss kleiner als x bis sein' :
    range.yMin >= range.yMax ? 'y von muss kleiner als y bis sein' :
    range.xMax - range.xMin > 60 || range.yMax - range.yMin > 60 ? 'Der Bereich darf höchstens 60 Einheiten breit sein' : null;
  const valid = !rangeError && curves.some((c) => c.fn) && curves.every((c) => !c.error);

  const close = () => setFunctionSheetOpen(false);
  const insert = () => {
    if (!api || !valid) return;
    addElements(api, buildElements(curves.filter((c) => c.fn), range, unitCm, viewportCenter(api)), true);
    api.setActiveTool({ type: 'selection' });
    close();
  };

  const setNumber = (key: keyof Range) => (value: string) => {
    const n = Number(value.replace(',', '.'));
    if (value.trim() !== '' && Number.isFinite(n)) setRange((r) => ({ ...r, [key]: n }));
  };

  return (
    <Sheet title="Funktionsgraph" onClose={close} doneLabel="Einfügen" onDone={insert} doneDisabled={!valid}>
      <Preview curves={curves} range={range} />

      <Group title="Funktionen">
        {terms.map((term, i) => (
          <div key={i} className="settings-row">
            <span className="settings-row__icon" style={{ color: COLORS[i % COLORS.length] }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: 'currentColor', display: 'block' }} />
            </span>
            <label className="flex items-center flex-1 min-w-0" style={{ gap: 8 }}>
              <span style={{ fontSize: 16, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{String.fromCharCode(102 + i)}(x) =</span>
              <input
                className="settings-input"
                value={term}
                autoFocus={i === terms.length - 1}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                placeholder="z. B. 0,5x^2 - 3"
                onChange={(e) => setTerms((list) => list.map((t, j) => (j === i ? e.target.value : t)))}
                onKeyDown={(e) => e.key === 'Enter' && insert()}
                style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
              />
            </label>
            {terms.length > 1 && (
              <button type="button" className="icon-button" aria-label={`Funktion ${i + 1} entfernen`} onClick={() => setTerms((list) => list.filter((_, j) => j !== i))}>
                <TrashIcon size={20} />
              </button>
            )}
          </div>
        ))}
        {terms.length < COLORS.length && (
          <button type="button" className="settings-row settings-row--button" onClick={() => setTerms((list) => [...list, ''])}>
            <span className="settings-row__icon"><PlusIcon size={20} /></span>
            <span className="settings-row__label" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>Weitere Funktion</span>
          </button>
        )}
      </Group>
      {curves.find((c) => c.error) && <p className="settings-error" role="alert">{curves.find((c) => c.error)!.error}</p>}

      <Group title="Bereich">
        <div className="settings-row">
          <RangeInput label="x von" value={range.xMin} onChange={setNumber('xMin')} />
          <RangeInput label="bis" value={range.xMax} onChange={setNumber('xMax')} />
        </div>
        <div className="settings-row">
          <RangeInput label="y von" value={range.yMin} onChange={setNumber('yMin')} />
          <RangeInput label="bis" value={range.yMax} onChange={setNumber('yMax')} />
        </div>
        <div className="settings-row" style={{ minHeight: 64 }}>
          <div className="settings-row__label">1 Einheit</div>
          <div role="group" aria-label="Einheit" className="segmented">
            {UNITS.map((unit) => (
              <button key={unit.cm} type="button" className="segmented__option" aria-pressed={unitCm === unit.cm} onClick={() => setUnitCm(unit.cm)}>
                {unit.label}
              </button>
            ))}
          </div>
        </div>
      </Group>
      {rangeError && <p className="settings-error" role="alert">{rangeError}</p>}

      <p style={{ margin: '0 4px', fontSize: 13, lineHeight: '20px', color: 'var(--muted-2)' }}>
        Erlaubt: + − · / ^, Klammern, sin cos tan, sqrt, abs, ln, log, exp, pi und e. Zum Beispiel 2x^3 − x, sin(x), 1/x oder e^(−x^2)
      </p>
    </Sheet>
  );
}

function RangeInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  const [text, setText] = useState(String(value).replace('.', ','));
  return (
    <label className="flex items-center flex-1" style={{ gap: 12 }}>
      <span style={{ fontSize: 16, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <input
        className="settings-input"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </label>
  );
}

/** Vorschau im Sheet: dasselbe Koordinatensystem, verkleinert */
function Preview({ curves, range }: { curves: Curve[]; range: Range }) {
  const width = 592;
  const height = 240;
  const valid = range.xMin < range.xMax && range.yMin < range.yMax;
  const scale = valid ? Math.min((width - 32) / (range.xMax - range.xMin), (height - 32) / (range.yMax - range.yMin)) : 1;
  const cx = width / 2 - ((range.xMin + range.xMax) / 2) * scale;
  const cy = height / 2 + ((range.yMin + range.yMax) / 2) * scale;
  const at = (x: number, y: number) => `${cx + x * scale} ${cy - y * scale}`;
  const axisY = Math.min(Math.max(0, range.yMin), range.yMax);
  const axisX = Math.min(Math.max(0, range.xMin), range.xMax);

  return (
    <div className="function-preview" style={{ marginBottom: 24 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Vorschau des Funktionsgraphen">
        {valid && (
          <>
            <path d={`M${at(range.xMin, axisY)} L${at(range.xMax, axisY)} M${at(axisX, range.yMin)} L${at(axisX, range.yMax)}`} className="function-preview__axis" />
            {curves.map((curve, i) =>
              curve.fn
                ? sampleSegments(curve.fn, range).map((segment, j) => (
                    <path
                      key={`${i}-${j}`}
                      d={segment.map((p, k) => `${k ? 'L' : 'M'}${at(p.x, p.y)}`).join(' ')}
                      fill="none"
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  ))
                : null
            )}
          </>
        )}
      </svg>
    </div>
  );
}
