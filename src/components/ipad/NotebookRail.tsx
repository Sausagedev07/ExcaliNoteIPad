import { useNotebookStore } from '../../store/notebookStore';
import type { NotebookMeta } from '../../types';
import { NotebookIcon, PlusIcon, SlidersIcon } from './icons';
import { useLongPress } from './utils';

interface NotebookRailProps {
  onNewNotebook: () => void;
  onEditNotebook: (path: string) => void;
  onOpenSettings: () => void;
}

/** Linke Leiste (84 px): Notizbücher als farbige Reiter, unten „Optionen“ */
export default function NotebookRail({ onNewNotebook, onEditNotebook, onOpenSettings }: NotebookRailProps) {
  const { notebooks, notebookMeta, selectedNotebook, setSelectedNotebook } = useNotebookStore();
  const folders = notebooks.filter((item) => item.type === 'folder');
  const hasLooseNotes = notebooks.some((item) => item.type === 'note');

  return (
    <nav aria-label="Notizbücher" className="rail">
      <div
        aria-hidden="true"
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', color: '#FFFFFF', marginBottom: 12 }}
      >
        <NotebookIcon size={24} />
      </div>

      <div className="flex flex-col items-center min-h-0 overflow-y-auto w-full" style={{ gap: 4, scrollbarWidth: 'none' }}>
        {hasLooseNotes && (
          <NotebookTab
            meta={{ short: '…', color: 'var(--muted-2)' }}
            name="Lose Seiten"
            selected={selectedNotebook === ''}
            onSelect={() => setSelectedNotebook('')}
          />
        )}
        {folders.map((folder) => (
          <NotebookTab
            key={folder.path}
            meta={notebookMeta[folder.path]}
            name={folder.name}
            selected={selectedNotebook === folder.path}
            onSelect={() => setSelectedNotebook(folder.path)}
            onEdit={() => onEditNotebook(folder.path)}
          />
        ))}

        <button
          type="button"
          aria-label="Neues Notizbuch"
          title="Neues Notizbuch"
          onClick={onNewNotebook}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            border: '1.5px dashed var(--dash)',
            borderRadius: 12,
            background: 'transparent',
            color: 'var(--muted)',
            marginTop: 8,
            cursor: 'pointer',
          }}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        aria-label="Einstellungen"
        onClick={onOpenSettings}
        className="rail__tab"
        style={{ width: 80, color: 'var(--ink)' }}
      >
        <SlidersIcon size={24} />
        <span className="rail__label" style={{ maxWidth: 76 }}>Einstellungen</span>
      </button>
    </nav>
  );
}

interface NotebookTabProps {
  meta: NotebookMeta | undefined;
  name: string;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

function NotebookTab({ meta, name, selected, onSelect, onEdit }: NotebookTabProps) {
  // Langes Drücken (oder Rechtsklick) öffnet die Notizbuch-Einstellungen
  const longPress = useLongPress(() => onEdit?.());

  return (
    <button
      type="button"
      aria-label={name}
      aria-current={selected ? 'true' : undefined}
      title={name}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onContextMenu={longPress.onContextMenu}
      onClick={() => {
        if (!longPress.consumeClick()) onSelect();
      }}
      className="rail__tab flex-shrink-0"
    >
      <span className="rail__tile" style={{ background: meta?.color }}>
        {meta?.short}
      </span>
      <span className="rail__label">{name}</span>
    </button>
  );
}
