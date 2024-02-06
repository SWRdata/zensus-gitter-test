
# Installation

```bash
git clone https://github.com/SWRdata/zensus-gitter-test.git
cd zensus-gitter-test
npm i
```

# Daten vorbereiten

- Daten runterladen von https://www.zensus2022.de/DE/Was-ist-der-Zensus/gitterzellenbasierte_Ergebnisse_Zensus2011.html
- Die CSV Dateien mit Brotli komprimiert ablegen
- Dateinamen in `src/1_process_zensus2011.js` anpassen
- Wenn man `node src/1_process_zensus2011.js` ausführt, werden die CSV-Dateien zu einem großen GeoJSONL (line delimited) zusammengefasst. Zusätzlich werden noch skalierte Zoomstufen berechnet, alo wo je 4 Gitterzellen zu einer zusammengefasst werden.
- Mit `node src/2_make_vector_tiles.js` werden die GeoJSONL-Dateien zu Vektorkacheln konvertiert. Dafür wird [tippecanoe](https://github.com/felt/tippecanoe) benötigt. Außerdem werden die Vektorkacheln der unterschiedlichen Zoomstufen in einem großen mbtiles-Datei zusammengefügt und mit [VersaTiles](https://github.com/versatiles-org/versatiles-rs/blob/main/versatiles/README.md) zu einem VersaTiles-Container konvertiert.

# Frontend

Der fertige VersaTiles-Container liegt bereits beim SWR in der Cloud ([Vorschau](https://static.datenhub.net/data/zensus-test/zensus2011e.versatiles?preview)) und kann mit dem Frontend in `docs/` betrachtet werden. Das Frontend ist online auf GitHub-Pages, kann aber auch lokal ausgeführt werden mit: `npm run start`.

