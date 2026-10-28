#!/usr/bin/env sh
# Refreshes the vendored front-end libraries in app/public/vendor (they are committed; the
# site never loads anything from a CDN at runtime).
#
#   OL_VERSION=10.11.0 ./scripts/vendor-download.sh
#
# OpenLayers comes from the npm registry. W3Schools answers scripted downloads with
# HTTP 403, so for W3.CSS / W3.JS / themes the script tries once and otherwise prints
# the URLs to save from a browser into the listed folders. Record the new versions
# in app/public/vendor/VENDOR.md.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
VENDOR="$ROOT/app/public/vendor"
OL_VERSION=${OL_VERSION:-$(npm view ol version)}
THEMES="red pink purple deep-purple indigo blue light-blue cyan teal green light-green lime khaki yellow amber orange deep-orange blue-grey brown grey dark-grey black"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "OpenLayers $OL_VERSION"
(cd "$TMP" && npm pack "ol@$OL_VERSION" --silent >/dev/null && tar -xzf "ol-$OL_VERSION.tgz")
mkdir -p "$VENDOR/ol"
cp "$TMP/package/dist/ol.js" "$TMP/package/ol.css" "$TMP/package/LICENSE.md" "$VENDOR/ol/"

fetch() { # url target
  if curl -fsS "$1" -o "$TMP/dl" 2>/dev/null; then mv "$TMP/dl" "$2"; else echo "  handmatig downloaden: $1 -> $2"; fi
}

echo "W3.CSS, W3.JS en thema's"
mkdir -p "$VENDOR/w3css" "$VENDOR/w3js"
fetch https://www.w3schools.com/w3css/5/w3.css "$VENDOR/w3css/w3.css"
fetch https://www.w3schools.com/lib/w3.js "$VENDOR/w3js/w3.js"
for t in $THEMES; do fetch "https://www.w3schools.com/lib/w3-theme-$t.css" "$VENDOR/w3css/w3-theme-$t.css"; done
echo "Klaar. Werk app/public/vendor/VENDOR.md bij."
