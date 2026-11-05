# ExcaliNote iPad – UI-Redesign (Übergabe)

Diese Datei fasst die Design-Entscheidungen für eine neue, iPad-taugliche Oberfläche zusammen,
damit ein neuer Agent (oder Entwickler) sie umsetzen kann, ohne den Chatverlauf zu kennen.

- **Stand:** umgesetzt (Schritte 1–4 der Reihenfolge unten, ohne echte Mini-Vorschauen). Siehe „Umsetzung“ am Ende.
- **Referenz:** `docs/ui-redesign/reference/` enthält die Artboards als `*.dc.html` (Quelltext des Design-Tools) plus `canvas.json` (Positionen). Sie sind Quelltext zum Nachlesen von Maßen, Farben und Markup. Eigenständig im Browser öffnen lassen sie sich nicht, weil `support.js` des Design-Tools fehlt. Das Design-Artifact selbst ist privat beim Besitzer.
- **Sprache der Oberfläche:** Deutsch.
- **Zielgerät:** iPad im Querformat, Entwurfsgröße 1194 × 834 pt (iPad Pro 11"). Hochformat und kleinere iPads sind nicht entworfen.

## Warum eine neue UI

Die bestehende Oberfläche ist eine Desktop-Oberfläche (Electron) und wirkt auf dem iPad schlecht:

- Die Top Bar ist 40 px hoch, die Knöpfe sind zu klein zum Antippen.
- Der Einstellungsknopf besteht aus einem winzigen Zahnrad im Sync-Symbol und lässt sich auf dem iPad nicht zuverlässig bedienen (vom Besitzer gemeldet, im Browser nicht reproduzierbar).
- Die Startseite (leerer Zustand) wirkt verbuggt (vom Besitzer gemeldet, Ursache offen).
- Der Ordnerbaum links ist für Fingerbedienung unhandlich.

## Gestaltungsprinzipien

1. **Notizbuch-Prinzip:** Papierton, Handschrift für Titel, farbige Notizbuch-Reiter wie bei OneNote. Passt zum Logo (violett, Cremepapier).
2. **Touch zuerst:** alle Tippflächen mindestens 44 × 44 pt, Werkzeuge 48 × 48.
3. **Einstellungen immer erreichbar:** ein beschrifteter Knopf unten in der Notizbuch-Leiste, auf jeder Ansicht.
4. **Eine Wahrheit pro Information:** der Speicherstatus steht nur im Kopf-Knopf („Lokal gespeichert“), nicht zusätzlich auf der Zeichenfläche.
5. **Lokal zuerst:** Synchronisation ist optional und standardmäßig aus; alle Daten liegen auf dem Gerät.

## Layout (Notiz-Ansicht, 1194 × 834)

Drei Spalten:

| Spalte | Breite | Inhalt |
|---|---|---|
| Notizbuch-Leiste | 84 px | App-Zeichen oben, Notizbücher als farbige Kacheln (44 px) mit Kürzel und Namen darunter, „+ Neues Notizbuch“ (gestrichelt), unten „Optionen“ (Einstellungen) |
| Seitenliste | 300 px | Notizbuch-Titel in Handschrift (38 px), Suchfeld, Primärknopf „Neue Seite“, Liste der Seiten mit Mini-Vorschau, Titel und Datum |
| Hauptbereich | Rest (810 px) | Kopfzeile 64 px, darunter die Zeichenfläche mit Punktraster |

**Kopfzeile (von links):** Seitenliste ein-/ausblenden · editierbarer Seitentitel (Handschrift 30 px) · Rückgängig · Wiederholen · Trenner · Sync-Knopf „Lokal gespeichert“ (Wolke durchgestrichen) · Dunkles Design · Exportieren/Teilen.

**Zeichenfläche:** Punktraster (`#D9D2C3`, Punkt 1,3 px, Raster 26 px) auf `#FFFEFB`. Zoom-Leiste oben rechts (−, „100 %“, +). Werkzeugleiste unten mittig, schwebend:

Auswählen · Stift · Textmarker · Radierer │ Formen · Text · Bild │ vier Farben (Tinte, Blau, Orange, Grün).

Aktives Werkzeug: Hintergrund `#EDE6F8`, Symbol in Akzentfarbe. Aktive Farbe: Ring.
**Wichtig:** Die Werkzeugleiste ist rund 560 px breit. Alles, was daneben unten links oder rechts sitzt, überlappt sie (war im ersten Entwurf ein Fehler, deshalb sitzen Zoom und Status jetzt oben).

## Weitere Ansichten

**Startseite (leer):** gleiche Leiste und Liste, aber leer (Liste zeigt „Keine Notizbücher“). Im Hauptbereich eine Karte (520 px) mit App-Zeichen, Überschrift „Willkommen bei ExcaliNote“ (Handschrift 54 px), Primärknopf „Erstes Notizbuch anlegen“, Sekundärknopf „Aus Dateien importieren“ und drei Hinweise mit Haken:

- Alles wird automatisch lokal gespeichert
- Sichtbar in der Dateien-App unter „ExcaliNote“
- Synchronisation ist optional und standardmäßig aus

**Einstellungen (Sheet 640 × 834):** Titel „Einstellungen“ mit Knopf „Fertig“. Drei Gruppen:

1. **Speicher:** Speicherort („Dateien › Auf meinem iPad › ExcaliNote“), Belegung („38 Seiten · 14,2 MB“, Beispielwerte), „Backup als ZIP exportieren“.
2. **Synchronisation:** Schalter „Mit CouchDB synchronisieren“ (aus), Zeile „Server einrichten“ mit Hinweis „Nur HTTPS“.
3. **Darstellung:** Hell / Dunkel / Auto, Schalter „Punktraster auf der Seite“, Akzentfarbe (Violett, Blau, Grün, Rosa).

## Design-Tokens

| Zweck | Wert |
|---|---|
| Papier (Seitenliste, Hintergrund) | `#F7F3EA` |
| Leiste | `#EFE9DC` |
| Zeichenfläche | `#FFFEFB` |
| Rahmen | `#E0D8C6` / `#E6DFD0` / Zeilentrenner `#EDE6D6` |
| Tinte (Text) | `#26223A` |
| Gedämpfter Text | `#4F4A63` und `#5F5A73` (beide ≥ 4,5:1 auf Papier) |
| Akzent (Standard) | `#6D4AB0`, Alternativen `#2A6AB0`, `#1B7568`, `#B0386B` |
| Akzent hell | `#EDE6F8`, `#F4EFFB`, Rahmen `#CDBFE6` |
| Erfolg/Haken | `#1B7568` |
| Notizbuch-Farben | Violett `#6D4AB0`, Blau `#2A6AB0`, Grün `#1B7568`, Orange `#B4570F`, Rosa `#B0386B` (weißer Text darauf ≥ 4,8:1) |
| Schrift UI | Inter 400/500/600 |
| Schrift Titel | Caveat 600/700 (Seitentitel, Notizbuch-Titel, Willkommen) |
| Radien | Kacheln 13–14, Karten 18, Pillen 22–26, Eingaben 12 |
| Schatten Werkzeugleiste | `0 10px 28px rgba(38, 34, 58, 0.14)` |

Schriften müssen in der App **lokal gebündelt** werden (kein Google-Fonts-Link), die App soll offline laufen.

Hinweis zu Farben: Farben, die sich unterscheiden müssen (Notizbücher), haben zusätzlich Kürzel und Namen, sie sind nicht allein über den Farbton erkennbar.

## Abbildung auf den vorhandenen Code

Die Vorlage ist React 18 + TypeScript + Tailwind + Zustand (`src/store/notebookStore.ts`). Dateisystemzugriff läuft über `window.electron.fs`, auf iOS über den Adapter `src/platform/capacitorFs.ts`.

| Design | Umsetzung |
|---|---|
| Notizbuch-Leiste | Ordner der obersten Ebene von `Documents/ExcaliNote` = Notizbücher. Kürzel und Farbe sind neue Metadaten pro Ordner (z. B. Datei `.excalinote.json` im Ordner oder Zustand im Store). |
| Seitenliste | `.excalidraw`-Dateien des gewählten Notizbuchs. Offen: wie Unterordner erscheinen (Gruppen? flach?). |
| Mini-Vorschau | im Entwurf Platzhalterlinien. Echt: per Excalidraw `exportToSvg` erzeugen und cachen (optional, später). |
| Kopfzeile | ersetzt `src/components/TopBar.tsx`. Der Sync-Knopf nutzt den vorhandenen `syncStore` (Status, `showSyncDialog`). |
| Einstellungen | neues Sheet, das aus `src/components/Sync/SyncSettingsDialog.tsx` die Verbindungslogik übernimmt. Theme und Raster liegen schon im `notebookStore` (`theme`, `showGrid`). **Neu:** Auto-Design, Akzentfarbe, Speicher-Statistik, ZIP-Export. |
| Werkzeugleiste | Excalidraw 0.17.6 bringt eine eigene Leiste mit. Zwei Wege: (1) deren Oberfläche per CSS umstylen, (2) eigene Leiste bauen und per `excalidrawAPI.setActiveTool(...)` steuern, die eingebaute ausblenden. Empfehlung: erst (1). |

Vorgeschlagene Reihenfolge:

1. Gerüst: Notizbuch-Leiste, Seitenliste, neue Kopfzeile, Startseite (ersetzt `Sidebar`/`FolderTree`/`TopBar`).
2. Einstellungen-Sheet mit Speicher, Sync und Darstellung.
3. Excalidraw-Leiste im neuen Stil, Zoom-Leiste.
4. Mini-Vorschauen, ZIP-Export, Akzentfarbe.

## Technische Randbedingungen (iPad/Capacitor)

- Native Hülle mit Capacitor 8, Projekt in `ios/`. Web-Build: `npm run ios:build`, danach Xcode.
- Sicherheitsbereiche über CSS (`env(safe-area-inset-*)`) und `viewport-fit=cover`, nicht über native Insets.
- Natives Scrollen des WebViews abschalten und die Seite fest verankern, sonst verrutscht das Layout beim Tastaturfokus.
- Textfelder auf iOS mindestens 16 px Schriftgröße, sonst zoomt iOS beim Fokus hinein.
- Excalidraw lädt Schriften und Code-Teile standardmäßig von `unpkg.com`. Für Offline-Betrieb `window.EXCALIDRAW_ASSET_PATH` auf lokale Kopie von `node_modules/@excalidraw/excalidraw/dist/excalidraw-assets` setzen.
- Prüfen ohne Gerät: gebaute App im Browser mit iPad-Viewport (1194 × 834) und einem Mock für `window.electron.fs` (In-Memory) laden. Das zeigt Layoutfehler, ersetzt aber keinen Test auf dem iPad (iOS-spezifisches Verhalten).
- Installation auf einem echten iPad: eigenes Team und eigene Bundle-ID nur per `xcodebuild`-Argumenten (`DEVELOPMENT_TEAM=…`, `PRODUCT_BUNDLE_IDENTIFIER=…`) mitgeben und **nicht** ins Projekt oder ins Repository schreiben. Mit kostenlosem Apple-Konto läuft die App 7 Tage, die Daten bleiben bei gleicher Bundle-ID erhalten.

## Offene Entscheidungen

- Hochformat und iPhone: im Entwurf nicht vorgesehen. Seitenliste müsste dann einklappen.
- Dunkles Design: Farben für Dunkel sind nicht entworfen.
- Unterordner in Notizbüchern: Darstellung offen.
- Auf der Zeichenfläche steht keine Uhrzeit des letzten Speicherns mehr, nur „Lokal gespeichert“. Falls die Zeit gewünscht ist, in den Kopf-Knopf integrieren, nicht zusätzlich einblenden.

## Umsetzung

Code unter `src/components/ipad/` (Leiste, Seitenliste, Kopfzeile, Startseite, Sheets, Werkzeugleiste, `ipad.css`), Tokens in `src/index.css`, Zeichenfläche in `src/components/Editor/Editor.tsx`. `TopBar`, `Sidebar`/`FolderTree` und der alte `SyncSettingsDialog` sind entfernt.

Entscheidungen zu den offenen Punkten:

- **Notizbuch-Metadaten:** Datei `.excalinote.json` (Kürzel, Farbe) im Notizbuch-Ordner. Versteckte Dateien erscheinen nirgends in der Oberfläche. Ohne Datei werden Kürzel und Farbe aus Name und Reihenfolge abgeleitet.
- **Lose Seiten:** `.excalidraw`-Dateien direkt in `ExcaliNote/` erscheinen als eigenes Notizbuch „Lose Seiten“.
- **Unterordner:** flach als Gruppen mit Überschrift („Optik“, tiefer „A / B“) unter den Seiten der obersten Ebene. Neue Seiten landen in der obersten Ebene.
- **Sortierung:** Seiten nach Änderungsdatum, neueste oben. `readDir` liefert dafür jetzt `mtime` und `size` (Electron und iOS).
- **Bearbeiten/Löschen:** langes Drücken (oder Rechtsklick) auf einen Notizbuch-Reiter öffnet das Notizbuch-Sheet (Name, Kürzel, Farbe, Löschen), auf eine Seite das Menü „Seite löschen“. Umbenennen einer Seite über den Titel in der Kopfzeile.
- **Werkzeugleiste:** eigene Leiste (Weg 2), Excalidraws Leiste, Menü, Bibliothek und Fußzeile sind per CSS ausgeblendet. Undo/Redo und Zoom lösen die ausgeblendeten Excalidraw-Knöpfe aus (0.17 hat dafür keine API). Textmarker = Freihand in Gelb, 40 % Deckkraft. Das Eigenschaften-Panel von Excalidraw (Strichstärke usw.) bleibt links oben.
- **Punktraster:** CSS-Hintergrund hinter einer transparenten Zeichenfläche, wandert mit Verschieben und Zoom mit. Seiten mit weißem Hintergrund werden dafür als `transparent` gespeichert; Seiten mit eigener Hintergrundfarbe behalten sie.
- **Speichern:** nur bei echten Inhaltsänderungen (Szenen-Version), nicht beim Verschieben der Ansicht. „Speichert …“ erscheint erst, wenn das Speichern länger als 0,6 s dauert.
- **Dunkles Design:** Tokens unter `:root[data-theme='dark']` aus den hellen abgeleitet (nicht vom Entwurf gedeckt, bei Bedarf nachgestalten).
- **Hochformat / schmale Fenster (< 1000 px):** Seitenliste startet eingeklappt und fährt als Überlagerung ein; nach Auswahl einer Seite schließt sie.
- **ZIP-Backup:** `fflate`. iOS: Datei landet in Dateien › Auf meinem iPad › ExcaliNote; Desktop: Download.
- **Server:** nur `https://` (Ausnahme `http://localhost` zum Testen).
- **Schriften:** `@fontsource/inter` und `@fontsource/caveat`, lokal gebündelt.

Prüfen im Browser ohne Gerät: `CAPACITOR=1 npx vite`, dann `http://localhost:5173/?demo` mit Viewport 1194 × 834. Im Dev-Modus ersetzt `src/platform/memoryFs.ts` das Dateisystem (`?demo` füllt Beispiel-Notizbücher ein, ohne startet die App leer). Nicht im Produktions-Bundle enthalten.

Überarbeitung nach dem Entwurf (unslop-Durchgang):

- Abstände im 4er-Raster, Radien verschachtelt (Leiste 20/Knöpfe 16, Karten 16, Knöpfe 10), keine Pillen mehr bei Status, Zoom und „Fertig“.
- Neutrale Rampe mit Haarlinien aus der Tintenfarbe, Akzent nur für Hauptaktion, Schalter und aktives Werkzeug. Auswahl in Leiste und Seitenliste als Flächenstufe statt Akzentrahmen. Dunkles Design warm statt violettstichig.
- Handschrift (Caveat) nur für Namen von Notizbüchern und Seiten sowie die Überschrift der Startseite. Sheet-Titel und Gruppentitel in Inter, Satzschreibung statt Versalien.
- Startseite: statt zentrierter Willkommenskarte eine Beispielskizze auf dem Punktpapier und eine Überschrift, die sagt, was die App tut.
- Seitenliste mit echten Vorschauen (`exportToSvg`, gecacht pro Datei und Änderungszeit). „lokal gespeichert“ steht nur noch im Kopf-Knopf.
- Bewegung: eine Kurve (`--ease`), Sheets und Menüs blenden kurz ein.

Noch offen: Test auf einem echten iPad (Touch, Apple Pencil, Tastatur).
