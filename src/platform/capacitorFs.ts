import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

/**
 * iOS/iPadOS-Adapter: stellt dieselbe `window.electron.fs`-API bereit wie der
 * Electron-Preload, speichert aber lokal im App-Container (Documents/ExcaliNote).
 * Der Ordner ist per Info.plist (UIFileSharingEnabled) auch in der Dateien-App sichtbar.
 */

const ROOT = 'ExcaliNote';
const DIRECTORY = Directory.Documents;

function validate(relativePath: string): string {
  const parts = (relativePath || '').split('/').filter((p) => p !== '' && p !== '.');
  if (parts.includes('..')) {
    throw new Error('Invalid path: Path traversal detected');
  }
  return parts.join('/');
}

function full(relativePath: string): string {
  const clean = validate(relativePath);
  return clean ? `${ROOT}/${clean}` : ROOT;
}

async function exists(relativePath: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path: full(relativePath), directory: DIRECTORY });
    return true;
  } catch {
    return false;
  }
}

async function createDir(relativePath: string) {
  try {
    await Filesystem.mkdir({ path: full(relativePath), directory: DIRECTORY, recursive: true });
  } catch (error) {
    // mkdir wirft, wenn der Ordner schon existiert
    if (!(await exists(relativePath))) throw error;
  }
  return { success: true };
}

function parentOf(relativePath: string): string {
  const parts = validate(relativePath).split('/');
  parts.pop();
  return parts.join('/');
}

const fs = {
  async readDir(dirPath: string) {
    const clean = validate(dirPath);
    const result = await Filesystem.readdir({ path: full(clean), directory: DIRECTORY });
    return result.files
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => ({
        name: entry.name,
        isDirectory: entry.type === 'directory',
        path: clean ? `${clean}/${entry.name}` : entry.name,
      }));
  },

  async readFile(filePath: string) {
    const result = await Filesystem.readFile({
      path: full(filePath),
      directory: DIRECTORY,
      encoding: Encoding.UTF8,
    });
    return typeof result.data === 'string' ? result.data : await (result.data as Blob).text();
  },

  async writeFile(filePath: string, content: string) {
    await Filesystem.writeFile({
      path: full(filePath),
      directory: DIRECTORY,
      data: content,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return { success: true };
  },

  createDir,

  async delete(itemPath: string) {
    const target = full(itemPath);
    const info = await Filesystem.stat({ path: target, directory: DIRECTORY });
    if (info.type === 'directory') {
      await Filesystem.rmdir({ path: target, directory: DIRECTORY, recursive: true });
    } else {
      await Filesystem.deleteFile({ path: target, directory: DIRECTORY });
    }
    return { success: true };
  },

  async rename(oldPath: string, newPath: string) {
    await createDir(parentOf(newPath));
    await Filesystem.rename({
      from: full(oldPath),
      to: full(newPath),
      directory: DIRECTORY,
      toDirectory: DIRECTORY,
    });
    return { success: true };
  },

  async getBaseDir() {
    await createDir('');
    return 'Dateien › Auf meinem iPad › ExcaliNote';
  },

  exists,
};

/** Installiert `window.electron` auf nativen Capacitor-Plattformen (iOS). */
export async function installNativePlatform(): Promise<void> {
  if (!Capacitor.isNativePlatform() || (window as any).electron) return;
  await createDir('');
  // `updates` fehlt bewusst: die Update-UI prüft `window.electron?.updates` und bleibt aus.
  (window as any).electron = { fs };
}
