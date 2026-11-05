import { useState, type ReactNode } from 'react';
import { clickExcalidrawButton, useEditorStore } from '../../store/editorStore';
import {
  ArrowIcon, CompassIcon, DiamondIcon, EllipseIcon, EraserIcon, FunctionIcon, HighlighterIcon, ImageIcon, LineIcon,
  MinusIcon, ParabolaIcon, PenIcon, PlusIcon, RectangleIcon, RulerIcon, SelectIcon, SetSquareIcon, ShapesIcon, TextIcon,
} from './icons';
import type { Instrument } from '../../store/editorStore';

export const INK_COLORS = [
  { name: 'Tinte', value: '#26223A' },
  { name: 'Blau', value: '#2A6AB0' },
  { name: 'Orange', value: '#B4570F' },
  { name: 'Grün', value: '#1B7568' },
];

const HIGHLIGHTER_COLOR = '#F5C518';

const SHAPES = [
  { type: 'rectangle', label: 'Rechteck', icon: <RectangleIcon /> },
  { type: 'ellipse', label: 'Ellipse', icon: <EllipseIcon /> },
  { type: 'diamond', label: 'Raute', icon: <DiamondIcon /> },
  { type: 'arrow', label: 'Pfeil', icon: <ArrowIcon /> },
  { type: 'line', label: 'Linie', icon: <LineIcon /> },
];
const SHAPE_TYPES = SHAPES.map((shape) => shape.type);

const INSTRUMENTS: { type: Instrument; label: string; icon: JSX.Element }[] = [
  { type: 'ruler', label: 'Lineal', icon: <RulerIcon /> },
  { type: 'setsquare', label: 'Geodreieck', icon: <SetSquareIcon /> },
  { type: 'parabola', label: 'Parabelschablone', icon: <ParabolaIcon /> },
  { type: 'compass', label: 'Zirkel', icon: <CompassIcon /> },
];

/**
 * Schwebende Werkzeugleiste unten mittig. Ersetzt Excalidraws eigene Leiste
 * (per CSS ausgeblendet) und steuert sie über `setActiveTool`.
 */
export default function DrawingToolbar() {
  const { api, activeTool, penMode, setPenMode, strokeColor, setStrokeColor, instrument, setInstrument, setFunctionSheetOpen } = useEditorStore();
  const [shapesOpen, setShapesOpen] = useState(false);
  const [instrumentsOpen, setInstrumentsOpen] = useState(false);
  const [lastShape, setLastShape] = useState('rectangle');

  if (!api) return null;

  const selectTool = (type: string) => {
    setShapesOpen(false);
    setInstrumentsOpen(false);
    api.setActiveTool({ type: type as any });
  };

  const selectPen = (mode: 'pen' | 'highlighter') => {
    setShapesOpen(false);
    setInstrumentsOpen(false);
    setPenMode(mode);
    api.updateScene({
      appState:
        mode === 'highlighter'
          ? { currentItemStrokeColor: HIGHLIGHTER_COLOR, currentItemStrokeWidth: 4, currentItemOpacity: 40 }
          : { currentItemStrokeColor: strokeColor, currentItemStrokeWidth: 2, currentItemOpacity: 100 },
    });
    api.setActiveTool({ type: 'freedraw' });
  };

  const selectColor = (color: string) => {
    setStrokeColor(color);
    if (penMode === 'highlighter') setPenMode('pen');
    api.updateScene({ appState: { currentItemStrokeColor: color, currentItemOpacity: 100 } });

    // Ausgewählte Elemente direkt umfärben
    const selected = api.getAppState().selectedElementIds;
    if (Object.keys(selected).length > 0) {
      api.updateScene({
        elements: api.getSceneElements().map((element) =>
          selected[element.id]
            ? { ...element, strokeColor: color, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31) }
            : element
        ),
        commitToHistory: true,
      });
    }
  };

  const isFreedraw = activeTool === 'freedraw';
  const shapeActive = SHAPE_TYPES.includes(activeTool);
  const shapeIcon = SHAPES.find((shape) => shape.type === (shapeActive ? activeTool : lastShape))?.icon ?? <ShapesIcon />;

  return (
    <div
      role="toolbar"
      aria-label="Zeichenwerkzeuge"
      className="drawing-toolbar"
    >
      <ToolButton label="Auswählen" active={activeTool === 'selection'} onClick={() => selectTool('selection')}>
        <SelectIcon />
      </ToolButton>
      <ToolButton label="Stift" active={isFreedraw && penMode === 'pen'} onClick={() => selectPen('pen')}>
        <PenIcon />
      </ToolButton>
      <ToolButton label="Textmarker" active={isFreedraw && penMode === 'highlighter'} onClick={() => selectPen('highlighter')}>
        <HighlighterIcon />
      </ToolButton>
      <ToolButton label="Radierer" active={activeTool === 'eraser'} onClick={() => selectTool('eraser')}>
        <EraserIcon />
      </ToolButton>

      <Divider />

      <div className="relative">
        <ToolButton
          label="Formen"
          active={shapeActive}
          expanded={shapesOpen}
          onClick={() => {
            setInstrumentsOpen(false);
            if (shapeActive || shapesOpen) {
              setShapesOpen(!shapesOpen);
            } else {
              selectTool(lastShape);
              setShapesOpen(true);
            }
          }}
        >
          {shapeActive ? shapeIcon : <ShapesIcon />}
        </ToolButton>
        {shapesOpen && (
          <div role="menu" aria-label="Formen" className="drawing-toolbar__popover">
            {SHAPES.map((shape) => (
              <ToolButton
                key={shape.type}
                label={shape.label}
                active={activeTool === shape.type}
                onClick={() => {
                  setLastShape(shape.type);
                  selectTool(shape.type);
                }}
              >
                {shape.icon}
              </ToolButton>
            ))}
          </div>
        )}
      </div>
      <ToolButton label="Text" active={activeTool === 'text'} onClick={() => selectTool('text')}>
        <TextIcon />
      </ToolButton>
      <ToolButton label="Bild einfügen" active={activeTool === 'image'} onClick={() => selectTool('image')}>
        <ImageIcon />
      </ToolButton>

      <Divider />

      <div className="relative">
        <ToolButton
          label="Instrumente"
          active={instrument !== null}
          expanded={instrumentsOpen}
          onClick={() => {
            setShapesOpen(false);
            setInstrumentsOpen(!instrumentsOpen);
          }}
        >
          {INSTRUMENTS.find((item) => item.type === instrument)?.icon ?? <RulerIcon />}
        </ToolButton>
        {instrumentsOpen && (
          <div role="menu" aria-label="Instrumente" className="drawing-toolbar__popover">
            {INSTRUMENTS.map((item) => (
              <ToolButton
                key={item.type}
                label={item.label}
                active={instrument === item.type}
                onClick={() => {
                  setInstrumentsOpen(false);
                  setInstrument(instrument === item.type ? null : item.type);
                }}
              >
                {item.icon}
              </ToolButton>
            ))}
          </div>
        )}
      </div>
      <ToolButton
        label="Funktionsgraph"
        active={false}
        onClick={() => {
          setShapesOpen(false);
          setInstrumentsOpen(false);
          setFunctionSheetOpen(true);
        }}
      >
        <FunctionIcon />
      </ToolButton>

      <Divider />

      {INK_COLORS.map((color) => {
        const active = strokeColor === color.value && penMode === 'pen';
        // Excalidraw invertiert im Dunkelmodus die Zeichnung: Tinte erscheint dann hell
        const shown = color.value === INK_COLORS[0].value ? 'var(--ink)' : color.value;
        return (
          <button
            key={color.value}
            type="button"
            aria-label={`Farbe: ${color.name}`}
            aria-pressed={active}
            title={color.name}
            onClick={() => selectColor(color.value)}
            className="swatch-button"
          >
            <span
              className="swatch"
              style={{
                background: shown,
                boxShadow: active ? `0 0 0 2px var(--surface), 0 0 0 4px ${shown}` : 'none',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ToolButton({ label, active, expanded, onClick, children }: { label: string; active: boolean; expanded?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      aria-expanded={expanded}
      onClick={onClick}
      className={`tool-button${active ? ' tool-button--active' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div aria-hidden="true" className="drawing-toolbar__divider" />;
}

/** Zoom-Leiste oben rechts; nutzt Excalidraws (ausgeblendete) Zoom-Knöpfe */
export function ZoomBar() {
  const { api, zoom } = useEditorStore();
  if (!api) return null;

  return (
    <div className="zoom-bar">
      <button type="button" className="zoom-bar__button" aria-label="Verkleinern" title="Verkleinern" onClick={() => clickExcalidrawButton('.zoom-actions button', 0)}>
        <MinusIcon size={18} />
      </button>
      <button
        type="button"
        className="zoom-bar__value"
        aria-label={`Zoom ${Math.round(zoom * 100)} Prozent, auf 100 Prozent zurücksetzen`}
        title="Auf 100 % zurücksetzen"
        onClick={() => clickExcalidrawButton('.zoom-actions button', 1)}
      >
        {Math.round(zoom * 100)} %
      </button>
      <button type="button" className="zoom-bar__button" aria-label="Vergrößern" title="Vergrößern" onClick={() => clickExcalidrawButton('.zoom-actions button', 2)}>
        <PlusIcon size={18} />
      </button>
    </div>
  );
}
