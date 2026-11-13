# Pipeline mapových dat

Regeneruje `site/t/*.wasm`, `site/tiles-index.json`, `site/graph.wasm`, `site/addr.json`, `src/mask.geojson` a znovu sestaví `site/index.html`.

1. Stáhni `https://download.geofabrik.de/europe/czech-republic/jihocesky-latest.osm.pbf` do `work/jihocesky.osm.pbf`.
2. Z kořene repa: `bash pipeline/run.sh` (Python 3 + osmium + shapely, Node/npm, C++ toolchain pro tippecanoe, git).

Skripty:
- `extract.py` – osmium: silnice (s třídou, názvem, ref, minzoom), železnice, vody, landcover, budovy, sídla, adresy; uloží i surová data pro graf (`work/out/graph.pkl`).
- `boundaries.py` – hranice 7 okresů + kraj, maska okolí (`src/mask.geojson`).
- `landcover.py` – zjednodušení landcover (bez polí a luk).
- `graph.py` – kontrakce na křižovatky, největší komponenta, Douglas-Peucker mezibodů → `site/graph.wasm`.
- `addr.py` – deduplikace adres, přiřazení okresu a export všech nalezených adresních bodů → `site/addr.json` (bez původního limitu 70 000).
- tippecanoe (příkaz v `run.sh`) → `work/jc.mbtiles`.
- `pack.py` – gzip dlaždic, chunky, glyfy → `site/t/`, `site/tiles-index.json`.
- `basemap_svg_fallback.py` – historický skript pro zjednodušenou SVG mapu (`src/basemap.js`); vyžaduje Natural Earth a CzechInvest data, cesty jsou z původního prostředí (/tmp/geo).

Velikost výstupu ~42 MB. Při úpravách hlídej limity hostingu (viz HANDOFF).
