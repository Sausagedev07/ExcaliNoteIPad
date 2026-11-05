import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useEditorStore, type Instrument, type InstrumentPose } from '../../store/editorStore';
import { PT_PER_MM } from './paper';
import { addElements, formatCm, penStyle, polyline, toScene, UNITS_PER_CM, viewportCenter, type Point } from './scene';
import { CloseIcon, RefreshIcon } from './icons';

/**
 * Zeicheninstrumente über der Zeichenfläche. Maße in Szeneneinheiten,
 * 1 mm = PT_PER_MM, also maßstabsgetreu zu Kästchen von 5 mm.
 *
 * Bedienung: Finger oder Maus verschieben das Instrument, zwei Finger oder der
 * Drehknopf drehen es. Der Apple Pencil zeichnet überall auf dem Instrument
 * entlang der nächsten Kante; Finger und Maus zeichnen, wenn sie an der Kante ansetzen.
 */

const MM = PT_PER_MM;
const CM = UNITS_PER_CM;

const RULER = { length: 160 * MM, height: 32 * MM };
const SETSQUARE = { half: 80 * MM };
const PARABOLA = { range: 2.5 };

/** Abstand in Bildschirmpunkten, ab dem Finger/Maus an der Kante zeichnen statt verschieben */
const EDGE_GRAB = 28;

interface Edge {
  a: Point;
  b: Point;
}

const EDGES: Record<'ruler' | 'setsquare', Edge[]> = {
  ruler: [
    { a: { x: -RULER.length / 2, y: -RULER.height / 2 }, b: { x: RULER.length / 2, y: -RULER.height / 2 } },
    { a: { x: -RULER.length / 2, y: RULER.height / 2 }, b: { x: RULER.length / 2, y: RULER.height / 2 } },
  ],
  setsquare: [
    { a: { x: -SETSQUARE.half, y: 0 }, b: { x: SETSQUARE.half, y: 0 } },
    { a: { x: -SETSQUARE.half, y: 0 }, b: { x: 0, y: SETSQUARE.half } },
    { a: { x: SETSQUARE.half, y: 0 }, b: { x: 0, y: SETSQUARE.half } },
  ],
};

const LABELS: Record<Instrument, { name: string; hint: string }> = {
  ruler: { name: 'Lineal', hint: 'Verschieben mit einem Finger, an der Kante entlang zeichnen' },
  setsquare: { name: 'Geodreieck', hint: 'An einer der drei Kanten zeichnen, drehen zum Winkelmessen' },
  parabola: { name: 'Parabelschablone', hint: 'Normalparabel y = x², 1 Einheit = 1 cm' },
  compass: { name: 'Zirkel', hint: 'Einstechen, Radius ziehen, Bögen schlagen. Tippen zeichnet den Kreis' },
};

// ---------- Geometrie ----------

const rad = (deg: number) => (deg * Math.PI) / 180;

function rotate(p: Point, deg: number): Point {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function toLocal(p: Point, pose: InstrumentPose): Point {
  return rotate({ x: p.x - pose.x, y: p.y - pose.y }, -pose.angle);
}

function fromLocal(p: Point, pose: InstrumentPose): Point {
  const r = rotate(p, pose.angle);
  return { x: r.x + pose.x, y: r.y + pose.y };
}

/** Parameter t (0…1) der Projektion auf die Kante und Abstand dazu */
function project(p: Point, edge: Edge) {
  const dx = edge.b.x - edge.a.x;
  const dy = edge.b.y - edge.a.y;
  const t = Math.max(0, Math.min(1, ((p.x - edge.a.x) * dx + (p.y - edge.a.y) * dy) / (dx * dx + dy * dy)));
  const q = { x: edge.a.x + t * dx, y: edge.a.y + t * dy };
  return { t, point: q, distance: Math.hypot(p.x - q.x, p.y - q.y) };
}

const lerp = (edge: Edge, t: number): Point => ({ x: edge.a.x + (edge.b.x - edge.a.x) * t, y: edge.a.y + (edge.b.y - edge.a.y) * t });

/** Parabel y = x² in cm; lokal zeigt y nach unten, die Öffnung also nach oben */
const parabolaPoint = (u: number): Point => ({ x: u * CM, y: -u * u * CM });

function parabolaPoints(u0: number, u1: number): Point[] {
  const steps = Math.max(2, Math.ceil(Math.abs(u1 - u0) / 0.04));
  return Array.from({ length: steps + 1 }, (_, i) => parabolaPoint(u0 + ((u1 - u0) * i) / steps));
}

/** Zeiger festhalten, damit Bewegungen außerhalb des Instruments ankommen (kann bei synthetischen Events fehlschlagen) */
function capture(e: ReactPointerEvent<Element>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // ohne Capture weiter: Bewegungen über dem Instrument kommen trotzdem an
  }
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Ganze Grad, nahe 15°-Schritten einrasten */
function snapAngle(deg: number): number {
  const step = Math.round(deg / 15) * 15;
  return Math.abs(deg - step) < 2 ? step : Math.round(deg);
}

function defaultPose(instrument: Instrument, center: Point): InstrumentPose {
  if (instrument === 'setsquare') return { x: center.x, y: center.y - 30 * MM, angle: 0 };
  if (instrument === 'parabola') return { x: center.x, y: center.y + 30 * MM, angle: 0 };
  return { x: center.x, y: center.y, angle: 0 };
}

// ---------- Ebene ----------

type Gesture =
  | { kind: 'move'; start: Point; pose: InstrumentPose }
  | { kind: 'rotate'; startAngle: number; pose: InstrumentPose }
  | { kind: 'pinch'; ids: [number, number]; startPoints: [Point, Point]; pose: InstrumentPose }
  | { kind: 'edge'; edge: Edge; t0: number; t1: number }
  | { kind: 'curve'; u0: number; u1: number };

interface Preview {
  points: Point[];
  label: string;
  at: Point;
}

export default function InstrumentLayer() {
  const { api, instrument, setInstrument, poses, setPose, compass, setCompass } = useEditorStore();

  // Beim ersten Hinlegen mitten in den sichtbaren Bereich
  useEffect(() => {
    if (api && instrument && instrument !== 'compass' && !poses[instrument]) {
      setPose(instrument, defaultPose(instrument, viewportCenter(api)));
    }
  }, [api, instrument, poses, setPose]);

  if (!api || !instrument) return null;
  const pose = poses[instrument] ?? defaultPose(instrument, viewportCenter(api));

  return (
    <div className="instrument-layer">
      <svg className="instrument-layer__svg" width="100%" height="100%">
        {instrument === 'compass' ? (
          <Compass />
        ) : (
          <PlacedInstrument key={instrument} instrument={instrument} pose={pose} />
        )}
      </svg>
      <div className="instrument-hint" role="status">
        <span className="instrument-hint__name">{LABELS[instrument].name}</span>
        <span className="instrument-hint__text">{LABELS[instrument].hint}</span>
        {instrument !== 'compass' && (
          <span className="instrument-hint__value">{Math.round(normalizeAngle(-pose.angle)) % 180}°</span>
        )}
        {instrument === 'compass' && compass && (
          <button type="button" className="instrument-hint__action" onClick={() => setCompass(null)}>
            <RefreshIcon size={18} />
            Neu einstechen
          </button>
        )}
        <button type="button" className="icon-button" aria-label={`${LABELS[instrument].name} weglegen`} onClick={() => setInstrument(null)} style={{ width: 36, height: 36 }}>
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  );
}

/** Lineal, Geodreieck oder Parabelschablone an einer Stelle der Szene */
function PlacedInstrument({ instrument, pose }: { instrument: Exclude<Instrument, 'compass'>; pose: InstrumentPose }) {
  const { api, view, setPose } = useEditorStore();
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const [preview, setPreview] = useState<Preview | null>(null);
  if (!api) return null;

  const sx = (pose.x + view.scrollX) * view.zoom;
  const sy = (pose.y + view.scrollY) * view.zoom;

  const scenePoint = (e: ReactPointerEvent) => toScene(api, e.clientX, e.clientY);

  const updateDraw = (local: Point) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'edge') {
      g.t1 = project(local, g.edge).t;
      const a = fromLocal(lerp(g.edge, g.t0), pose);
      const b = fromLocal(lerp(g.edge, g.t1), pose);
      setPreview({ points: [a, b], label: formatCm(Math.hypot(b.x - a.x, b.y - a.y)), at: b });
    } else if (g.kind === 'curve') {
      g.u1 = Math.max(-PARABOLA.range, Math.min(PARABOLA.range, local.x / CM));
      const points = parabolaPoints(g.u0, g.u1).map((p) => fromLocal(p, pose));
      setPreview({ points, label: `x = ${g.u1.toLocaleString('de-DE', { maximumFractionDigits: 1 })}`, at: points[points.length - 1] });
    }
  };

  const onPointerDown = (e: ReactPointerEvent<SVGGElement>) => {
    e.stopPropagation();
    capture(e);
    const p = scenePoint(e);
    pointers.current.set(e.pointerId, p);
    const local = toLocal(p, pose);

    // Zweiter Finger: drehen und verschieben
    if (pointers.current.size === 2 && e.pointerType === 'touch') {
      const ids = [...pointers.current.keys()] as [number, number];
      setPreview(null);
      gesture.current = { kind: 'pinch', ids, startPoints: [pointers.current.get(ids[0])!, pointers.current.get(ids[1])!], pose };
      return;
    }

    const target = e.target as Element;
    if (target.closest('[data-rotate]')) {
      gesture.current = { kind: 'rotate', startAngle: Math.atan2(p.y - pose.y, p.x - pose.x) * (180 / Math.PI), pose };
      return;
    }

    const pen = e.pointerType === 'pen';
    const grab = EDGE_GRAB / view.zoom;
    if (instrument === 'parabola') {
      const u = Math.max(-PARABOLA.range, Math.min(PARABOLA.range, local.x / CM));
      if (pen || Math.abs(local.y - parabolaPoint(u).y) < grab) {
        gesture.current = { kind: 'curve', u0: u, u1: u };
        updateDraw(local);
        return;
      }
    } else {
      const nearest = EDGES[instrument]
        .map((edge) => ({ edge, ...project(local, edge) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (pen || nearest.distance < grab) {
        gesture.current = { kind: 'edge', edge: nearest.edge, t0: nearest.t, t1: nearest.t };
        updateDraw(local);
        return;
      }
    }
    gesture.current = { kind: 'move', start: p, pose };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = scenePoint(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;

    if (g.kind === 'move') {
      setPose(instrument, { ...g.pose, x: g.pose.x + p.x - g.start.x, y: g.pose.y + p.y - g.start.y });
    } else if (g.kind === 'rotate') {
      const now = Math.atan2(p.y - g.pose.y, p.x - g.pose.x) * (180 / Math.PI);
      setPose(instrument, { ...g.pose, angle: snapAngle(g.pose.angle + now - g.startAngle) });
    } else if (g.kind === 'pinch') {
      const [a0, b0] = g.startPoints;
      const a1 = pointers.current.get(g.ids[0]);
      const b1 = pointers.current.get(g.ids[1]);
      if (!a1 || !b1) return;
      const turn = (Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x)) * (180 / Math.PI);
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
      // um die Fingermitte drehen, dann mit ihr verschieben
      const offset = rotate({ x: g.pose.x - mid0.x, y: g.pose.y - mid0.y }, turn);
      setPose(instrument, { x: mid1.x + offset.x, y: mid1.y + offset.y, angle: snapAngle(g.pose.angle + turn) });
    } else {
      updateDraw(toLocal(p, pose));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    gesture.current = null;
    setPreview(null);
    if (!g) return;

    if (g.kind === 'edge') {
      const a = fromLocal(lerp(g.edge, g.t0), pose);
      const b = fromLocal(lerp(g.edge, g.t1), pose);
      if (Math.hypot(b.x - a.x, b.y - a.y) > 2) addElements(api, [polyline([a, b], penStyle(api))]);
    } else if (g.kind === 'curve' && Math.abs(g.u1 - g.u0) > 0.02) {
      addElements(api, [polyline(parabolaPoints(g.u0, g.u1).map((p) => fromLocal(p, pose)), penStyle(api))]);
    }
  };

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <>
      <g transform={`translate(${sx} ${sy}) rotate(${pose.angle}) scale(${view.zoom})`} className="instrument" {...handlers}>
        {instrument === 'ruler' && <RulerShape />}
        {instrument === 'setsquare' && <SetSquareShape />}
        {instrument === 'parabola' && <ParabolaShape />}
      </g>
      {preview && <PreviewStroke preview={preview} />}
    </>
  );
}

function PreviewStroke({ preview }: { preview: Preview }) {
  const { view } = useEditorStore();
  const screen = (p: Point) => ({ x: (p.x + view.scrollX) * view.zoom, y: (p.y + view.scrollY) * view.zoom });
  const d = preview.points.map((p, i) => `${i ? 'L' : 'M'}${screen(p).x} ${screen(p).y}`).join(' ');
  const at = screen(preview.at);
  return (
    <g pointerEvents="none">
      <path d={d} className="instrument-preview" />
      <text x={at.x + 12} y={at.y - 12} className="instrument-readout">
        {preview.label}
      </text>
    </g>
  );
}

// ---------- Formen ----------

/** Millimeterskala entlang der x-Achse; `from`/`to` in mm, `inward` 1 = nach unten, −1 = nach oben */
function Scale({ from, to, y, inward, labels = true, zero = 0 }: { from: number; to: number; y: number; inward: 1 | -1; labels?: boolean; zero?: number }) {
  const ticks: ReactNode[] = [];
  for (let mm = from; mm <= to; mm++) {
    const len = mm % 10 === 0 ? 4 * MM : mm % 5 === 0 ? 2.8 * MM : 1.6 * MM;
    const x = (mm - zero) * MM;
    ticks.push(<line key={mm} x1={x} y1={y} x2={x} y2={y + inward * len} className="instrument__tick" />);
    if (labels && mm % 10 === 0) {
      ticks.push(
        <text key={`l${mm}`} x={x} y={y + inward * 7.5 * MM} className="instrument__label" textAnchor="middle" dominantBaseline="middle">
          {Math.abs(mm - zero) / 10}
        </text>
      );
    }
  }
  return <>{ticks}</>;
}

function RotateKnob({ x, y }: { x: number; y: number }) {
  return (
    <g data-rotate transform={`translate(${x} ${y})`} className="instrument__knob">
      <circle r={5 * MM} />
      <g transform={`scale(${(6 * MM) / 24}) translate(-12 -12)`}>
        <RefreshIconPath />
      </g>
    </g>
  );
}

function RefreshIconPath() {
  return <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" className="instrument__knob-icon" />;
}

function RulerShape() {
  const { length: L, height: H } = RULER;
  const start = -L / 2 + 5 * MM;
  return (
    <>
      <rect x={-L / 2} y={-H / 2} width={L} height={H} rx={2 * MM} className="instrument__body" />
      <g transform={`translate(${start} 0)`}>
        <Scale from={0} to={150} y={-H / 2} inward={1} />
        <Scale from={0} to={150} y={H / 2} inward={-1} labels={false} />
      </g>
      <RotateKnob x={L / 2 - 9 * MM} y={0} />
    </>
  );
}

function SetSquareShape() {
  const h = SETSQUARE.half;
  const arc: ReactNode[] = [];
  const r = 48 * MM;
  for (let deg = 0; deg <= 180; deg++) {
    const len = deg % 10 === 0 ? 4 * MM : deg % 5 === 0 ? 2.8 * MM : 1.6 * MM;
    const a = rad(deg);
    const p1 = { x: -Math.cos(a) * r, y: Math.sin(a) * r };
    const p2 = { x: -Math.cos(a) * (r - len), y: Math.sin(a) * (r - len) };
    // nur innerhalb des Dreiecks zeichnen
    if (Math.abs(p1.x) + p1.y > h - 1.5 * MM) continue;
    arc.push(<line key={deg} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="instrument__tick" />);
    if (deg % 30 === 0) {
      const pl = { x: -Math.cos(a) * (r - 8 * MM), y: Math.sin(a) * (r - 8 * MM) };
      arc.push(
        <text key={`l${deg}`} x={pl.x} y={pl.y} className="instrument__label" textAnchor="middle" dominantBaseline="middle">
          {deg}°
        </text>
      );
    }
  }
  return (
    <>
      <path d={`M${-h} 0 L${h} 0 L0 ${h} Z`} className="instrument__body" strokeLinejoin="round" />
      <Scale from={-70} to={70} y={0} inward={1} labels zero={0} />
      {arc}
      <line x1={0} y1={0} x2={0} y2={h - 12 * MM} className="instrument__tick" strokeDasharray="4 4" />
      <RotateKnob x={0} y={h - 14 * MM} />
    </>
  );
}

function ParabolaShape() {
  const R = PARABOLA.range;
  const top = -R * R * CM;
  const curve = parabolaPoints(-R, R).map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const ticks: ReactNode[] = [];
  for (let u = -2; u <= 2; u++) {
    const p = parabolaPoint(u);
    ticks.push(<circle key={u} cx={p.x} cy={p.y} r={0.8 * MM} className="instrument__dot" />);
  }
  for (let v = 1; v <= Math.floor(R * R); v++) {
    ticks.push(<line key={`y${v}`} x1={-1.5 * MM} y1={-v * CM} x2={1.5 * MM} y2={-v * CM} className="instrument__tick" />);
  }
  return (
    <>
      <path d={`${curve} L${-R * CM} ${top} Z`} className="instrument__body" />
      <line x1={0} y1={0} x2={0} y2={top + 4 * MM} className="instrument__tick" strokeDasharray="4 4" />
      {ticks}
      <text x={6 * MM} y={-2.2 * CM} className="instrument__label">y = x²</text>
      <RotateKnob x={0} y={top + 10 * MM} />
    </>
  );
}

// ---------- Zirkel ----------

interface CompassSetting {
  center: Point;
  radius: number;
}

type CompassGesture =
  | { kind: 'set'; center: Point }
  | { kind: 'move-center'; start: Point; center: Point }
  | { kind: 'arc'; startAngle: number; last: number; sweep: number };

/**
 * Zirkel: erst einstechen und den Radius aufziehen, dann wie mit einem echten
 * Zirkel Bögen schlagen. Antippen zeichnet den vollen Kreis, am Einstich ziehen verschiebt ihn.
 */
function Compass() {
  const { api, view, compass: setting, setCompass: setSetting } = useEditorStore();
  const [draft, setDraft] = useState<CompassSetting | null>(null);
  const [arc, setArc] = useState<{ start: number; sweep: number } | null>(null);
  const gesture = useRef<CompassGesture | null>(null);
  if (!api) return null;

  const screen = (p: Point) => ({ x: (p.x + view.scrollX) * view.zoom, y: (p.y + view.scrollY) * view.zoom });
  const angleOf = (c: Point, p: Point) => Math.atan2(p.y - c.y, p.x - c.x);

  const arcPoints = (s: CompassSetting, start: number, sweep: number): Point[] => {
    const steps = Math.max(8, Math.ceil(Math.abs(sweep) / rad(2)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = start + (sweep * i) / steps;
      return { x: s.center.x + Math.cos(a) * s.radius, y: s.center.y + Math.sin(a) * s.radius };
    });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGRectElement>) => {
    capture(e);
    const p = toScene(api, e.clientX, e.clientY);
    if (setting && Math.hypot(p.x - setting.center.x, p.y - setting.center.y) * view.zoom < 24) {
      gesture.current = { kind: 'move-center', start: p, center: setting.center };
    } else if (setting) {
      const a = angleOf(setting.center, p);
      gesture.current = { kind: 'arc', startAngle: a, last: a, sweep: 0 };
      setArc({ start: a, sweep: 0 });
    } else {
      gesture.current = { kind: 'set', center: p };
      setDraft({ center: p, radius: 0 });
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const g = gesture.current;
    if (!g) return;
    const p = toScene(api, e.clientX, e.clientY);
    if (g.kind === 'set') {
      setDraft({ center: g.center, radius: Math.hypot(p.x - g.center.x, p.y - g.center.y) });
    } else if (g.kind === 'move-center' && setting) {
      setSetting({ ...setting, center: { x: g.center.x + p.x - g.start.x, y: g.center.y + p.y - g.start.y } });
    } else if (g.kind === 'arc' && setting) {
      const a = angleOf(setting.center, p);
      let delta = a - g.last;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      g.last = a;
      g.sweep = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, g.sweep + delta));
      setArc({ start: g.startAngle, sweep: g.sweep });
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === 'set') {
      if (draft && draft.radius > 4) setSetting(draft);
      setDraft(null);
    } else if (g.kind === 'arc' && setting) {
      setArc(null);
      const full = Math.abs(g.sweep) < rad(3) || Math.abs(g.sweep) >= 2 * Math.PI - rad(1);
      if (full) {
        const { center, radius } = setting;
        addElements(api, [
          { type: 'ellipse', x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2, backgroundColor: 'transparent', ...penStyle(api) } as any,
        ]);
      } else {
        addElements(api, [polyline(arcPoints(setting, g.startAngle, g.sweep), penStyle(api))]);
      }
    }
  };

  const shown = draft ?? setting;
  const c = shown ? screen(shown.center) : null;
  const r = shown ? shown.radius * view.zoom : 0;
  const arcPath = setting && arc ? arcPoints(setting, arc.start, arc.sweep).map((p, i) => `${i ? 'L' : 'M'}${screen(p).x} ${screen(p).y}`).join(' ') : null;

  return (
    <>
      <rect width="100%" height="100%" fill="transparent" className="instrument-capture" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
      {shown && c && (
        <g pointerEvents="none">
          <circle cx={c.x} cy={c.y} r={r} className="instrument-guide" />
          <line x1={c.x} y1={c.y} x2={c.x + r} y2={c.y} className="instrument-guide" />
          <circle cx={c.x} cy={c.y} r={5} className="instrument-pin" />
          <text x={c.x + r / 2} y={c.y - 10} textAnchor="middle" className="instrument-readout">
            r = {formatCm(shown.radius)}
          </text>
        </g>
      )}
      {arcPath && <path d={arcPath} className="instrument-preview" pointerEvents="none" />}
    </>
  );
}
