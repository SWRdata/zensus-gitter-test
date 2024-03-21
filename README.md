# Zensus-Gitter Test-Repository

Dieses Repository enthält Skripte und Werkzeuge zur Verarbeitung der Gitterdaten des Zensus in Deutschland. Es ermöglicht die Kompression dieser Daten und ihre Konvertierung in GeoJSONL und Vektorkacheln für die Nutzung in MapLibre GL.

## Installation

Klonen Sie das Repository und installieren Sie die Abhängigkeiten mit den folgenden Befehlen:

```bash
git clone https://github.com/SWRdata/zensus-gitter-test.git
cd zensus-gitter-test
npm install
```

## Frontend

Der fertige VersaTiles-Container ist bereits gebaut und in der Cloud des SWR verfügbar. Eine Vorschau ist [hier](https://static.datenhub.net/data/zensus-test/zensus2011e.versatiles?preview) verfügbar und kann mit dem Frontend im Verzeichnis `docs/` betrachtet werden. Das Frontend ist sowohl online auf GitHub Pages verfügbar ([swrdata.github.io/zensus-gitter-test/](https://swrdata.github.io/zensus-gitter-test/)), kann aber auch lokal ausgeführt werden mit dem Befehl:

```bash
npm run start
```

## Daten selbst vorbereiten

### Daten herunterladen

1. Laden Sie die gitterzellenbasierten Ergebnisse des Zensus 2011 von der [offiziellen Website des Zensus 2022](https://www.zensus2022.de/DE/Was-ist-der-Zensus/gitterzellenbasierte_Ergebnisse_Zensus2011.html) herunter. Die richtigen CSV-Dateien erkennen Sie daran, dass sie u.a. die folgenden Spalten enthalten müssen: `Gitter_ID_100m`, `Merkmal`, `Auspraegung_Text` und `Anzahl`.
2. Komprimieren Sie die CSV-Dateien mit Brotli und speichern Sie sie im Verzeichnis `/data/`. Aktuell sind folgende Dateinamen in `src/1_process_zensus2011.js` konfiguriert:
   - `data/zensus2011/zensus2011_demographie_100m.csv.br`
   - `data/zensus2011/zensus2011_gebaeude_100m.csv.br`
   - `data/zensus2011/zensus2011_wohnungen_100m.csv.br`

### Daten verarbeiten

1. Passen Sie ggf. die Dateinamen in `src/1_process_zensus2011.js` entsprechend an.
2. Durch die Ausführung von `node src/1_process_zensus2011.js` werden die CSV-Dateien zu einer großen GeoJSONL-Datei ([zeilengetrennte GeoJSON-Features](https://stevage.github.io/ndgeojson/)) zusammengefasst. Zusätzlich werden skalierte Zoomstufen berechnet, wobei jeweils 4 Gitterzellen zu einer zusammengefasst werden.
3. Mit dem Befehl `node src/2_make_vector_tiles.js` werden die GeoJSONL-Dateien in Vektorkacheln konvertiert. Hierfür wird [tippecanoe](https://github.com/felt/tippecanoe) benötigt ([Installation über Homebrew](https://formulae.brew.sh/formula/tippecanoe)). Die Vektorkacheln unterschiedlicher Zoomstufen werden anschließend in einer großen MBTiles-Datei zusammengefügt und mit [VersaTiles](https://github.com/versatiles-org/versatiles-rs/blob/main/versatiles/README.md) ([Installation über Homebrew](https://github.com/versatiles-org/versatiles-documentation/blob/main/guides/install_versatiles.md#homebrew-for-macos)) in einen VersaTiles-Container konvertiert.

## Konzept

Dieses Repository nutzt die Zensus-Gitterdaten, um Vektorkacheln zu erstellen. Diese Vektorkacheln beinhalten die Geometrie jeder Gitterzelle sowie 12 spezifische Werte wie Alter, Nationalität und Heizungsart. Diese Informationen werden im Frontend dazu verwendet, die Kacheln gemäß der Auswahl durch die Benutzer*innen farblich zu gestalten.

Aufgrund der umfangreichen Datensätze (3 Millionen Gitterzellen, jeweils mit 4 Koordinaten und 12 Werten) würden Kartenkacheln bei geringen Zoomstufen, die eine große Anzahl an Gitterzellen umfassen, entsprechend datenintensiv und groß. Kartenkacheln mit Hunderttausenden von Geometrien sind aber nicht praktikabel.

Um dieses Problem zu adressieren, werden die Gitterdaten in verschiedenen Auflösungen bereitgestellt. Neben der feinsten Auflösung von 100m existieren weitere Auflösungsebenen: 200m (durch Zusammenfassung von je 4 Gitterzellen), 400m, 800m, 1600m und 3200m, insgesamt also sechs Ebenen. Für jede dieser Ebenen wird eine separate GeoJSONL-Datei mit den Geometrien der generierten Gitterzellen erstellt.

Jede dieser sechs GeoJSONL-Dateien wird dann mit dem Tool `tippecanoe` in eine `.mbtiles`-Datei konvertiert, die Vektorkacheln für die jeweiligen Zoomstufen enthält. Dabei werden für die 100m Auflösung Kacheln für die Zoomstufen 10 bis 13 generiert, für 200m Auflösung Zoomstufe 9, 400m für Zoomstufe 8, 800m für Zoomstufe 7, 1600m für Zoomstufe 6, und 3200m für die Zoomstufen 4 und 5. Siehe auch `src/2_make_vector_tiles.js`.

Anschließend werden diese sechs `.mbtiles`-Dateien verschiedener Zoomstufen mit dem Tool `tile-join` (Teil von `tippecanoe`) in eine einzige `.mbtiles`-Datei zusammengeführt, die alle Zoomstufen von 4 bis 13 beinhaltet.

Im letzten Schritt wird die zusammengeführte `.mbtiles`-Datei mit dem Tool `versatiles` in eine `.versatiles`-Datei umgewandelt, die dann auf Servern oder in Buckets bereitgestellt werden kann.

Die fertige Datei ist bereits auf dem SWR-Server unter static.datenhub.net deployt und kann hier mit der [Vorschaufunktion](https://static.datenhub.net/data/zensus-test/zensus2011e.versatiles?preview) angesehen werden.
