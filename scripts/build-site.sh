#!/usr/bin/env bash
# Bundles the demo page (site/) together with the shared engine into _site/.
set -euo pipefail
cd "$(dirname "$0")/.."
ESBUILD="${ESBUILD:-npx --yes esbuild@0.24.0}"
rm -rf _site && mkdir -p _site
$ESBUILD site/app.ts --bundle --format=esm --target=es2020 --minify --sourcemap --outfile=_site/app.js
cp site/index.html site/styles.css _site/
touch _site/.nojekyll
echo "Built _site/"
