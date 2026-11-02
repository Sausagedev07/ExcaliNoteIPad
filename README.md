# ExcaliNote 📝✨

![Banner](assets/excalinotes_banner.png)
Eine moderne OneNote-Alternative mit Excalidraw als Zeichenkern – perfekt für handschriftliche Notizen, Skizzen und Diagramme.

> 📱 **iPad-Fork:** Dieser Fork erweitert das Original [dclausen01/ExcaliNote](https://github.com/dclausen01/ExcaliNote) um eine **iPad/iOS-Version** (Capacitor, lokaler Speicher, sichtbar in der Dateien-App). Die Desktop-Version bleibt unverändert nutzbar.

![ExcaliNote Banner](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![iPad](https://img.shields.io/badge/iPad-Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

## ✨ Features

- 🎨 **Excalidraw-Integration**: Leistungsstarker Zeicheneditor für Handschrift, Skizzen und Diagramme
- 📁 **Ordnerstruktur**: Organisiere deine Notizen in Ordnern und Unterordnern
- 💾 **Auto-Save**: Automatisches Speichern alle 500ms – nie wieder Arbeit verlieren
- 🖥️ **Desktop-App**: Native Electron-Anwendung für Windows, macOS und Linux
- 📱 **iPad-App**: Läuft per Xcode auf dem iPad (Capacitor), gleiche Oberfläche wie am Desktop
- 🎯 **Lokale Speicherung**: Alle Daten bleiben auf deinem Gerät (Desktop: ~/ExcaliNote, iPad: Documents/ExcaliNote)
- ⚡ **Schnell & Reaktionsschnell**: Dank React und TypeScript
- 🎨 **Modernes UI**: Mit Tailwind CSS gestaltet

## 🚀 Installation

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn

### Setup

1. Repository klonen:

```bash
git clone https://github.com/dclausen01/ExcaliNote.git
cd ExcaliNote
```

2. Abhängigkeiten installieren:

```bash
npm install
```

3. Entwicklungsserver starten:

```bash
npm run electron:dev
```

## 📦 Build

Produktions-Build erstellen:

```bash
npm run electron:build
```

Die fertigen Installationsdateien findest du im `release/` Ordner.

## 📱 iPad-Version (iOS)

Die iPad-Version nutzt [Capacitor](https://capacitorjs.com/) und speichert alle Notizen lokal im App-Ordner `Documents/ExcaliNote`. Der Ordner ist in der **Dateien-App** unter „Auf meinem iPad › ExcaliNote“ sichtbar, sodass du Notizen sichern oder kopieren kannst. Getestet wurde der Build im iPad-Simulator.

### Voraussetzungen

- macOS mit Xcode
- Node.js (v18 oder höher)
- Apple-ID (kostenlos reicht zum Testen)

### Auf dem iPad installieren

```bash
git clone https://github.com/Sausagedev07/ExcaliNoteIPad.git
cd ExcaliNoteIPad
npm install
npm run ios:build   # Web-Build + Sync ins Xcode-Projekt
npm run ios:open    # öffnet Xcode
```

In Xcode dann:

1. Unter *Signing & Capabilities* dein Team wählen und eine **eigene Bundle-ID** setzen (z. B. `de.deinname.excalinote`).
2. iPad anschließen (oder einen Simulator wählen) und auf **Run** klicken.

### Hinweise

- **Zertifikat:** Mit einer kostenlosen Apple-ID läuft die App nur 7 Tage. Danach startet sie nicht mehr, deine Notizen bleiben aber erhalten, solange du die App nicht löschst. Erneutes Installieren aus Xcode mit derselben Bundle-ID behält die Daten. Ein bezahlter Developer-Account verlängert das auf ein Jahr.
- **Web-Embeds:** Manche Webseiten lassen sich auf iOS nicht in Excalidraw einbetten.
- **Sync:** Die CouchDB-Synchronisation funktioniert auf iOS nur über HTTPS.
- **Updates:** Der Auto-Updater ist auf dem iPad deaktiviert.

## 🏗️ Technologie-Stack

- **Frontend**: React 18 + TypeScript
- **Desktop-Framework**: Electron 28
- **iPad/iOS**: Capacitor 8 (`@capacitor/filesystem` für lokalen Speicher)
- **Zeicheneditor**: @excalidraw/excalidraw
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build-Tool**: Vite
- **Icons**: Lucide React

## 📁 Projektstruktur

```
ExcaliNote/
├── electron/              # Electron-Hauptprozess
│   ├── main.ts           # Hauptprozess-Logik
│   └── preload.ts        # Preload-Skript für sichere IPC
├── ios/                   # Xcode-Projekt für die iPad-Version (Capacitor)
├── src/
│   ├── components/       # React-Komponenten
│   │   ├── Editor/       # Excalidraw-Editor-Integration
│   │   └── Sidebar/      # Ordnerstruktur und Navigation
│   ├── platform/         # Dateisystem-Adapter für iOS (capacitorFs.ts)
│   ├── store/            # Zustand State Management
│   ├── types/            # TypeScript-Typdefinitionen
│   ├── App.tsx           # Haupt-App-Komponente
│   └── main.tsx          # React-Einstiegspunkt
├── dist/                 # Vite Build-Ausgabe
└── dist-electron/        # Electron Build-Ausgabe
```

## 🎯 Verwendung

### Notiz erstellen

1. Klicke auf das **+**-Symbol neben "Notizen"
2. Wähle einen Ordner aus oder erstelle einen neuen
3. Gib einen Namen für die Notiz ein
4. Beginne mit dem Zeichnen!

### Ordner erstellen

1. Klicke auf das **Ordner-Symbol** in der Sidebar
2. Gib einen Namen für den neuen Ordner ein
3. Organisiere deine Notizen nach Themen

### Notizen bearbeiten

- Alle Änderungen werden automatisch gespeichert
- Nutze die Excalidraw-Tools für Freihand-Zeichnungen, Text, Formen und mehr
- Unterstützt Bilder, Pfeile und verschiedene Stiftarten

## 🔧 Entwicklung

### Verfügbare Scripts

```bash
# Entwicklungsserver mit Hot-Reload
npm run electron:dev

# Vite Dev-Server (nur Web)
npm run dev

# TypeScript-Kompilierung + Vite Build
npm run build

# Electron-App bauen
npm run electron:build

# iPad: Web-Build erzeugen und ins Xcode-Projekt synchronisieren
npm run ios:build

# iPad: Xcode-Projekt öffnen
npm run ios:open
```

### Code-Struktur

- **IPC-Handler** in `electron/main.ts` für Dateisystem-Operationen
- **State Management** mit Zustand in `src/store/notebookStore.ts`
- **Komponenten** folgen dem React-Hooks-Pattern
- **TypeScript** für Type-Safety überall

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagungen

- [Excalidraw](https://excalidraw.com/) - Für den großartigen Zeicheneditor
- [Electron](https://www.electronjs.org/) - Für das Desktop-Framework
- [Capacitor](https://capacitorjs.com/) - Für die iPad/iOS-Version
- [dclausen01/ExcaliNote](https://github.com/dclausen01/ExcaliNote) - Für das Original, auf dem dieser Fork aufbaut
- [React](https://react.dev/) - Für die UI-Library
- [Tailwind CSS](https://tailwindcss.com/) - Für das Styling-Framework

---

Entwickelt mit ❤️ und TypeScript
