#!/usr/bin/env bash
# Kompletní regenerace mapových dat. Spouštět z kořene repozitáře: bash pipeline/run.sh
# Vstup: work/jihocesky.osm.pbf (https://download.geofabrik.de/europe/czech-republic/jihocesky-latest.osm.pbf)
set -euo pipefail
mkdir -p work/out site/t
pip install osmium shapely
[ -d work/cinv ] || git clone --depth 1 https://github.com/CzechInvest/web-data.git work/cinv
[ -d work/glyphs ] || (cd work && curl -sLo gc.tgz https://registry.npmjs.org/@inframaps/glyphs-core/-/glyphs-core-26.10.20.tgz && mkdir glyphs && tar xzf gc.tgz -C glyphs)
[ -d site/lib ] || (mkdir -p site/lib && cd work && npm pack maplibre-gl@4.7.1 && tar xzf maplibre-gl-4.7.1.tgz && cp package/dist/maplibre-gl-csp.js package/dist/maplibre-gl-csp-worker.js ../site/lib/ && sed -i '/sourceMappingURL/d' ../site/lib/*.js)
command -v tippecanoe >/dev/null || (git clone --depth 1 https://github.com/felt/tippecanoe.git work/tippecanoe && make -C work/tippecanoe -j && export PATH="$PWD/work/tippecanoe:$PATH")
export PATH="$PWD/work/tippecanoe:$PATH"
python3 pipeline/extract.py          # vrstvy, adresy, graf (pickle)
python3 pipeline/boundaries.py       # hranice + maska
python3 pipeline/landcover.py
python3 pipeline/graph.py            # site/graph.wasm
python3 pipeline/addr.py             # site/addr.json
(cd work/out && tippecanoe -o ../jc.mbtiles -f -Z5 -z14 --no-tile-compression --clip-bounding-box=13.4,48.5,15.65,49.75 \
  -L roads:roads.geojsonl -L rail:rail.geojsonl -L water:water.geojsonl -L waterway:waterway.geojsonl \
  -L landcover:landcover3.geojsonl -L buildings:buildings.geojsonl -L places:places.geojsonl -L boundary:boundary.geojsonl \
  --drop-densest-as-needed --simplification=4 --detect-shared-borders -B 10 -q)
python3 pipeline/pack.py             # site/t/*.wasm + site/tiles-index.json
python3 build.py                     # site/index.html
