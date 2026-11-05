import { useState } from 'react';
import { NOTEBOOK_COLORS, defaultShort, useNotebookStore } from '../../store/notebookStore';
import { logger } from '../../utils/logger';
import { Group, Sheet } from './Overlay';
import { TrashIcon } from './icons';

interface NotebookSheetProps {
  /** Pfad des Notizbuchs zum Bearbeiten, null zum Anlegen */
  path: string | null;
  onClose: () => void;
}

/** Notizbuch anlegen oder bearbeiten: Name, Kürzel, Farbe */
export default function NotebookSheet({ path, onClose }: NotebookSheetProps) {
  const { notebooks, notebookMeta, createNotebook, updateNotebook, deleteItem } = useNotebookStore();
  const existing = path ? notebookMeta[path] : null;
  const folderCount = notebooks.filter((item) => item.type === 'folder').length;

  const [name, setName] = useState(path ?? '');
  const [short, setShort] = useState(existing?.short ?? '');
  const [shortEdited, setShortEdited] = useState(Boolean(existing));
  const [color, setColor] = useState(existing?.color ?? NOTEBOOK_COLORS[folderCount % NOTEBOOK_COLORS.length].value);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const effectiveShort = (shortEdited ? short : defaultShort(trimmed || '?')).slice(0, 2);
  const taken = notebooks.some((item) => item.type === 'folder' && item.name === trimmed && item.path !== path);
  const invalid = !trimmed || /[/\\:]/.test(trimmed) || trimmed.startsWith('.');

  const handleSave = async () => {
    if (invalid || taken) return;
    try {
      const meta = { short: effectiveShort || defaultShort(trimmed), color };
      if (path) {
        await updateNotebook(path, trimmed, meta);
      } else {
        await createNotebook(trimmed, meta);
      }
      onClose();
    } catch (err) {
      logger.error('Notizbuch konnte nicht gespeichert werden', { err });
      setError('Das Notizbuch konnte nicht gespeichert werden');
    }
  };

  const handleDelete = async () => {
    if (!path) return;
    if (!window.confirm(`„${path}“ mit allen Seiten löschen? Das lässt sich nicht rückgängig machen.`)) return;
    try {
      await deleteItem(path);
      onClose();
    } catch (err) {
      logger.error('Notizbuch konnte nicht gelöscht werden', { err });
      setError('Das Notizbuch konnte nicht gelöscht werden');
    }
  };

  return (
    <Sheet
      title={path ? 'Notizbuch' : 'Neues Notizbuch'}
      width={520}
      onClose={onClose}
      doneLabel={path ? 'Sichern' : 'Anlegen'}
      onDone={handleSave}
      doneDisabled={invalid || taken}
    >
      <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
        <span
          aria-hidden="true"
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 64, height: 64, borderRadius: 16, background: color, color: '#FFFFFF', fontWeight: 500, fontSize: 24 }}
        >
          {effectiveShort || '?'}
        </span>
        <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--muted)' }}>
          Ein Notizbuch ist ein Ordner in der Dateien-App. Kürzel und Farbe helfen, es in der Leiste schnell zu finden.
        </p>
      </div>

      <Group title="Name">
        <label className="settings-row">
          <span className="sr-only">Name</span>
          <input
            autoFocus
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="z. B. Physik"
            maxLength={60}
          />
        </label>
        <label className="settings-row">
          <span className="settings-row__label">Kürzel</span>
          <input
            className="settings-input"
            style={{ width: 48, textAlign: 'right', flex: 'none' }}
            value={effectiveShort}
            onChange={(e) => {
              setShortEdited(true);
              setShort(e.target.value.slice(0, 2));
            }}
            maxLength={2}
            aria-label="Kürzel, höchstens zwei Zeichen"
          />
        </label>
      </Group>
      {taken && <p className="settings-error">Ein Notizbuch mit diesem Namen gibt es schon</p>}

      <Group title="Farbe">
        <div className="settings-row" role="radiogroup" aria-label="Farbe" style={{ gap: 8, padding: '8px 12px' }}>
          {NOTEBOOK_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={color === option.value}
              aria-label={option.name}
              onClick={() => setColor(option.value)}
              className="swatch-button"
            >
              <span
                className="swatch"
                style={{
                  background: option.value,
                  boxShadow: color === option.value ? `0 0 0 2px var(--canvas), 0 0 0 4px ${option.value}` : 'none',
                }}
              />
              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--muted-2)', padding: '0 4px' }}>{option.name}</span>
            </button>
          ))}
        </div>
      </Group>

      {error && <p className="settings-error">{error}</p>}

      {path && (
        <Group title="Löschen">
          <button type="button" className="settings-row settings-row--button" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
            <span className="settings-row__icon" style={{ color: 'inherit' }}><TrashIcon /></span>
            <span className="settings-row__label" style={{ fontWeight: 500 }}>Notizbuch löschen</span>
          </button>
        </Group>
      )}
    </Sheet>
  );
}
