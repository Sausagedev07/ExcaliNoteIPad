import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ACCENT_COLORS, useNotebookStore } from '../../store/notebookStore';
import { useSyncStore } from '../../store/syncStore';
import type { SyncServerConfig } from '../../types/sync';
import type { ThemePreference } from '../../types';
import { exportBackupZip, formatBytes, getStorageStats, type StorageStats } from '../../platform/backup';
import { logger } from '../../utils/logger';
import packageJson from '../../../package.json';
import { Group, Sheet, Switch } from './Overlay';
import { ChevronLeftIcon, ChevronRightIcon, CloudIcon, CloudOffIcon, FolderIcon, NotebookIcon, RefreshIcon, ServerIcon, ShareIcon } from './icons';

export type SettingsView = 'main' | 'server';

interface SettingsSheetProps {
  initialView?: SettingsView;
  onClose: () => void;
}

/** Einstellungen (Sheet 640 px): Speicher, Synchronisation, Darstellung */
export default function SettingsSheet({ initialView = 'main', onClose }: SettingsSheetProps) {
  const [view, setView] = useState<SettingsView>(initialView);

  if (view === 'server') {
    return (
      <Sheet
        title="Server"
        onClose={onClose}
        leading={
          <button type="button" className="icon-button" aria-label="Zurück zu den Einstellungen" onClick={() => setView('main')} style={{ marginLeft: -12 }}>
            <ChevronLeftIcon size={24} />
          </button>
        }
      >
        <ServerSettings />
      </Sheet>
    );
  }

  return (
    <Sheet title="Einstellungen" onClose={onClose}>
      <StorageGroup />
      <SyncGroup onOpenServer={() => setView('server')} />
      <AppearanceGroup />
      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 13, lineHeight: '20px', color: 'var(--muted-2)' }}>
        ExcaliNote {packageJson.version} · {Capacitor.isNativePlatform() ? 'iPad-Version' : 'Desktop-Version'}
      </p>
    </Sheet>
  );
}

function StorageGroup() {
  const baseDir = useNotebookStore((s) => s.baseDir);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getStorageStats()
      .then(setStats)
      .catch((error) => logger.warn('Speicher-Statistik nicht verfügbar', { error }));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      setMessage(await exportBackupZip());
    } catch (error) {
      logger.error('Backup fehlgeschlagen', { error });
      setMessage('Das Backup konnte nicht erstellt werden');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Group title="Speicher">
      <div className="settings-row">
        <span className="settings-row__icon"><FolderIcon /></span>
        <div className="settings-row__label">
          Speicherort
          <span className="settings-row__hint truncate">{baseDir || '…'}</span>
        </div>
      </div>
      <div className="settings-row">
        <span className="settings-row__icon"><NotebookIcon /></span>
        <div className="settings-row__label">Belegt</div>
        <div className="settings-row__value">
          {stats ? `${stats.pages === 1 ? '1 Seite' : `${stats.pages} Seiten`} · ${formatBytes(stats.bytes)}` : '…'}
        </div>
      </div>
      <button type="button" className="settings-row settings-row--button" onClick={handleExport} disabled={exporting}>
        <span className="settings-row__icon">{exporting ? <RefreshIcon className="animate-spin" /> : <ShareIcon />}</span>
        <span className="settings-row__label" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>
          {exporting ? 'Backup wird erstellt …' : 'Backup als ZIP exportieren'}
          {message && <span role="status" className="settings-row__hint" style={{ fontWeight: 400 }}>{message}</span>}
        </span>
      </button>
    </Group>
  );
}

function SyncGroup({ onOpenServer }: { onOpenServer: () => void }) {
  const { settings, syncState, disconnect } = useSyncStore();
  const connected = settings.enabled && syncState.status !== 'disconnected';

  const subtitle = !settings.enabled
    ? `Aus · alle Notizen bleiben nur auf diesem ${Capacitor.isNativePlatform() ? 'iPad' : 'Gerät'}`
    : syncState.status === 'error'
      ? `Fehler · ${syncState.error ?? 'Verbindung fehlgeschlagen'}`
      : `An · ${settings.server?.serverUrl ?? ''}`;

  return (
    <Group title="Synchronisation">
      <div className="settings-row" style={{ minHeight: 64 }}>
        <span className="settings-row__icon">{connected ? <CloudIcon /> : <CloudOffIcon />}</span>
        <div className="settings-row__label">
          Mit CouchDB synchronisieren
          <span className="settings-row__hint truncate" style={syncState.status === 'error' && settings.enabled ? { color: 'var(--danger)' } : undefined}>
            {subtitle}
          </span>
        </div>
        <Switch
          label="Synchronisation"
          checked={settings.enabled}
          onChange={(checked) => (checked ? onOpenServer() : disconnect())}
        />
      </div>
      <button type="button" className="settings-row settings-row--button" onClick={onOpenServer}>
        <span className="settings-row__icon"><ServerIcon /></span>
        <span className="settings-row__label">Server einrichten</span>
        <span className="settings-row__value" style={{ fontSize: 14, color: 'var(--muted-2)' }}>Nur HTTPS</span>
        <span className="settings-row__icon"><ChevronRightIcon size={20} /></span>
      </button>
    </Group>
  );
}

function AppearanceGroup() {
  const { themePreference, setThemePreference, showGrid, setShowGrid, accent, setAccent } = useNotebookStore();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Hell' },
    { value: 'dark', label: 'Dunkel' },
    { value: 'auto', label: 'Auto' },
  ];

  return (
    <Group title="Darstellung">
      <div className="settings-row" style={{ minHeight: 64 }}>
        <div className="settings-row__label">Design</div>
        <div role="group" aria-label="Design" className="segmented">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="segmented__option"
              aria-pressed={themePreference === option.value}
              onClick={() => setThemePreference(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row__label">Punktraster auf der Seite</div>
        <Switch label="Punktraster" checked={showGrid} onChange={setShowGrid} />
      </div>
      <div className="settings-row" style={{ gap: 4, paddingRight: 8 }}>
        <div className="settings-row__label">Akzentfarbe</div>
        {ACCENT_COLORS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`Akzentfarbe ${option.name}`}
            aria-pressed={accent === option.value}
            onClick={() => setAccent(option.value)}
            className="swatch-button"
          >
            <span
              className="swatch"
              style={{
                background: option.value,
                boxShadow: accent === option.value ? `0 0 0 2px var(--canvas), 0 0 0 4px ${option.value}` : 'none',
              }}
            />
          </button>
        ))}
      </div>
    </Group>
  );
}

/** Erlaubt nur HTTPS; http nur für lokale Testserver */
function validateServerUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return null;
    return 'Bitte eine HTTPS-Adresse angeben (https://…)';
  } catch {
    return 'Das ist keine gültige Adresse';
  }
}

function ServerSettings() {
  const { syncState, settings, connect, disconnect, forceSync, startMigration, checkMigrationNeeded } = useSyncStore();
  const [serverUrl, setServerUrl] = useState(settings.server?.serverUrl || '');
  const [username, setUsername] = useState(settings.server?.username || '');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    checkMigrationNeeded().then(setShowMigration).catch(() => setShowMigration(false));
  }, [checkMigrationNeeded]);

  const isConnected = settings.enabled && syncState.status !== 'disconnected' && syncState.status !== 'error';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlError = validateServerUrl(serverUrl.trim());
    if (urlError) {
      setError(urlError);
      return;
    }
    setError(null);
    setIsConnecting(true);
    try {
      const config: SyncServerConfig = { serverUrl: serverUrl.trim(), username: username.trim(), password };
      await connect(config);
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Verbindung fehlgeschlagen');
    } finally {
      setIsConnecting(false);
    }
  };

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err: any) {
      setError(err?.message || 'Aktion fehlgeschlagen');
    }
  };

  if (isConnected) {
    return (
      <>
        <Group title="Verbunden">
          <div className="settings-row">
            <span className="settings-row__icon"><ServerIcon /></span>
            <div className="settings-row__label">
              <span className="block truncate">{settings.server?.serverUrl}</span>
              <span className="settings-row__hint">
                {settings.server?.username}
                {syncState.lastSyncedAt && ` · zuletzt ${new Date(syncState.lastSyncedAt).toLocaleString('de-DE')}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="settings-row settings-row--button"
            disabled={syncState.status === 'syncing'}
            onClick={() => run(forceSync)}
          >
            <span className="settings-row__icon"><RefreshIcon className={syncState.status === 'syncing' ? 'animate-spin' : ''} /></span>
            <span className="settings-row__label" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>Jetzt synchronisieren</span>
          </button>
          {showMigration && (
            <button type="button" className="settings-row settings-row--button" onClick={() => run(startMigration)}>
              <span className="settings-row__icon"><ShareIcon /></span>
              <span className="settings-row__label">
                Lokale Seiten hochladen
                <span className="settings-row__hint">Bestehende Notizen in die Sync-Datenbank übernehmen</span>
              </span>
            </button>
          )}
          <button type="button" className="settings-row settings-row--button" style={{ color: 'var(--danger)' }} onClick={disconnect}>
            <span className="settings-row__icon" style={{ color: 'inherit' }}><CloudOffIcon /></span>
            <span className="settings-row__label" style={{ fontWeight: 500 }}>Verbindung trennen</span>
          </button>
        </Group>
        {error && <p className="settings-error">{error}</p>}
      </>
    );
  }

  return (
    <form onSubmit={handleConnect}>
      <p style={{ margin: '0 4px 24px', fontSize: 15, lineHeight: '22px', color: 'var(--muted)' }}>
        Optional: Mit einem eigenen CouchDB-Server lassen sich Notizen zwischen Geräten abgleichen. Ohne Server bleibt alles lokal.
      </p>
      <Group title="Zugang">
        <label className="settings-row">
          <span style={{ width: 128, fontSize: 16 }}>Server</span>
          <input
            className="settings-input"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://sync.example.com"
            required
          />
        </label>
        <label className="settings-row">
          <span style={{ width: 128, fontSize: 16 }}>Benutzer</span>
          <input
            className="settings-input"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="benutzername"
            required
          />
        </label>
        <label className="settings-row">
          <span style={{ width: 128, fontSize: 16 }}>Passwort</span>
          <input
            className="settings-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
      </Group>
      {(error || (settings.enabled && syncState.error)) && (
        <p className="settings-error" role="alert">{error || syncState.error}</p>
      )}
      <button type="submit" className="primary-button w-full" disabled={isConnecting} style={{ height: 48, opacity: isConnecting ? 0.7 : 1 }}>
        {isConnecting ? <RefreshIcon size={20} className="animate-spin" /> : <CloudIcon size={20} />}
        {isConnecting ? 'Verbinde …' : 'Verbinden'}
      </button>
    </form>
  );
}
