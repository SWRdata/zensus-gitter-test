# Zensus Gitter Test Repository

Dieses Repository enthält Skripte und Werkzeuge zur Verarbeitung der Gitterdaten des Zensus in Deutschland. Es ermöglicht die Kompression dieser Daten und ihre Konvertierung in GeoJSONL und Vektorkacheln für die Nutzung in MapLibre GL.

## Installation

Klonen Sie das Repository und installieren Sie die Abhängigkeiten mit folgenden Befehlen:

```bash
git clone https://github.com/SWRdata/zensus-gitter-test.git
cd zensus-gitter-test
npm install
```

## Frontend

Der fertige VersaTiles-Container ist bereits gebaut und in der Cloud des SWR verfügbar ([Vorschau](https://static.datenhub.net/data/zensus-test/zensus2011e.versatiles?preview)) und kann mit dem Frontend im Verzeichnis `docs/` betrachtet werden. Das Frontend ist online auf GitHub Pages verfügbar, kann aber auch lokal ausgeführt werden mit dem Befehl:

```bash
npm run start
```

## Daten selbst vorbereiten

### Daten herunterladen

1. Laden Sie die gitterzellenbasierten Ergebnisse des Zensus 2011 von der [offiziellen Website des Zensus 2022](https://www.zensus2022.de/DE/Was-ist-der-Zensus/gitterzellenbasierte_Ergebnisse_Zensus2011.html) herunter.  
   Die richtigen CSV-Dateien erkennt man daran, dass u.a. die folgenden Spalten definiert sein müssen: `Gitter_ID_100m`, `Merkmal`, `Auspraegung_Text` und `Anzahl`
2. Komprimieren Sie die CSV-Dateien mit Brotli und speichern Sie sie im Verzeichnis `/data/`.
   Aktuell sind folgende Dateinamen in `src/1_process_zensus2011.js` konfiguriert:
	- `data/zensus2011/zensus2011_bevoelkerung_100m.csv.br`
	- `data/zensus2011/zensus2011_gebaeude_100m.csv.br`
	- `data/zensus2011/zensus2011_wohnungen_100m.csv.br`

### Daten verarbeiten

1. Passen Sie ggf. die Dateinamen in `src/1_process_zensus2011.js` entsprechend an.
2. Durch Ausführung von `node src/1_process_zensus2011.js` werden die CSV-Dateien zu einer großen GeoJSONL-Datei ([zeilengetrennte GeoJSON-Features](https://stevage.github.io/ndgeojson/)) zusammengefasst. Zusätzlich werden skalierte Zoomstufen berechnet, wobei jeweils 4 Gitterzellen zu einer zusammengefasst werden.
3. Mit dem Befehl `node src/2_make_vector_tiles.js` werden die GeoJSONL-Dateien in Vektorkacheln konvertiert. Hierfür wird [tippecanoe](https://github.com/felt/tippecanoe) benötigt ([Homebrew](https://formulae.brew.sh/formula/tippecanoe)). Die Vektorkacheln unterschiedlicher Zoomstufen werden anschließend in einer großen MBTiles-Datei zusammengefügt und mit [VersaTiles](https://github.com/versatiles-org/versatiles-rs/blob/main/versatiles/README.md) ([Homebrew](https://github.com/versatiles-org/versatiles-documentation/blob/main/guides/install_versatiles.md#homebrew-for-macos)) in einen VersaTiles-Container konvertiert.
