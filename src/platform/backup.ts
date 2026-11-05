import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { strToU8, zipSync } from 'fflate';
import type { FileSystemEntry } from '../types';

/**
 * Speicher-Statistik und ZIP-Backup über `window.electron.fs`
 * (Electron-Preload oder iOS-Adapter).
 */

export interface StorageStats {
  pages: number;
  bytes: number;
}

async function walk(path: string, visit: (entry: FileSystemEntry) => Promise<void>): Promise<void> {
  const entries = (await window.electron.fs.readDir(path)) as FileSystemEntry[];
  for (const entry of entries) {
    if (entry.isDirectory) {
      await walk(entry.path, visit);
    } else {
      await visit(entry);
    }
  }
}

export async function getStorageStats(): Promise<StorageStats> {
  const stats: StorageStats = { pages: 0, bytes: 0 };
  await walk('', async (entry) => {
    if (entry.name.endsWith('.excalidraw')) stats.pages++;
    stats.bytes += entry.size ?? (await window.electron.fs.readFile(entry.path)).length;
  });
  return stats;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('de-DE')} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Packt alle Notizbücher in eine ZIP-Datei.
 * iOS: landet neben dem Ordner „ExcaliNote“ in der Dateien-App.
 * Desktop/Browser: normaler Download.
 * @returns Hinweis, wo die Datei liegt
 */
export async function exportBackupZip(): Promise<string> {
  const files: Record<string, Uint8Array> = {};
  await walk('', async (entry) => {
    files[`ExcaliNote/${entry.path}`] = strToU8(await window.electron.fs.readFile(entry.path));
  });

  const zip = zipSync(files, { level: 6 });
  const fileName = `ExcaliNote-Backup-${new Date().toISOString().slice(0, 10)}.zip`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: fileName, data: toBase64(zip), directory: Directory.Documents });
    // Documents ist in der Dateien-App der App-Ordner „ExcaliNote“, die Notizen liegen darin im Unterordner
    return `Gespeichert in Dateien › Auf meinem iPad › ExcaliNote › ${fileName}`;
  }

  const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return `${fileName} wird heruntergeladen`;
}
