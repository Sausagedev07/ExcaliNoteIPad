import { useEffect, type ReactNode } from 'react';
import type { PaperStyle } from '../../types';
import { PAPER_STYLES, paperClass } from './paper';

interface SheetProps {
  title: string;
  onClose: () => void;
  /** Breite des Sheets, Entwurf: 640 */
  width?: number;
  /** Knopf rechts im Kopf, Standard „Fertig“ */
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  /** Knopf links im Kopf, z. B. „Zurück“ */
  leading?: ReactNode;
  children: ReactNode;
}

/** Modales Sheet in der Mitte, wie ein iPadOS-Formular-Sheet */
export function Sheet({ title, onClose, width = 640, doneLabel = 'Fertig', onDone, doneDisabled, leading, children }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop fixed inset-0 z-[100] flex items-center justify-center"
      style={{ padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet flex flex-col overflow-hidden"
        style={{ width, maxWidth: '100%', maxHeight: '100%' }}
      >
        <header className="flex items-center gap-2 flex-shrink-0" style={{ padding: '16px 16px 8px 24px' }}>
          {leading}
          <h1 className="sheet__title flex-1 min-w-0 truncate">{title}</h1>
          <button type="button" className="primary-button" onClick={onDone ?? onClose} disabled={doneDisabled} style={{ height: 44, minWidth: 88 }}>
            {doneLabel}
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '16px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Gruppe mit Überschrift und Karte (Einstellungen) */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      <h2 className="settings-group__title">{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 56, height: 44, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
    >
      <span
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          background: checked ? 'var(--accent)' : 'var(--switch-off)',
          position: 'relative',
          display: 'block',
          transition: 'background-color 160ms var(--ease)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(38, 34, 58, 0.25)',
            transform: checked ? 'translateX(20px)' : 'none',
            transition: 'transform 160ms var(--ease)',
          }}
        />
      </span>
    </button>
  );
}

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

/** Kleines Aktionsmenü an einer Position (nach langem Drücken) */
export function ActionMenu({ x, y, actions, onClose }: { x: number; y: number; actions: MenuAction[]; onClose: () => void }) {
  const left = Math.min(x, window.innerWidth - 236);
  const top = Math.min(y, window.innerHeight - actions.length * 48 - 24);

  return (
    <div className="fixed inset-0 z-[110]" onPointerDown={onClose}>
      <div
        role="menu"
        onPointerDown={(e) => e.stopPropagation()}
        className="action-menu"
        style={{ left, top }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              action.onSelect();
            }}
            className="action-menu__item"
            style={action.danger ? { color: 'var(--danger)' } : undefined}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Papierwahl als Kacheln mit Musterprobe */
export function PaperPicker({ value, onChange }: { value: PaperStyle; onChange: (paper: PaperStyle) => void }) {
  return (
    <div role="radiogroup" aria-label="Papier" className="paper-options">
      {PAPER_STYLES.map((paper) => (
        <button
          key={paper.value}
          type="button"
          role="radio"
          aria-checked={value === paper.value}
          onClick={() => onChange(paper.value)}
          className="paper-option"
        >
          <span className={`paper-option__sample ${paperClass(paper.value)}`} aria-hidden="true" />
          {paper.label}
        </button>
      ))}
    </div>
  );
}
