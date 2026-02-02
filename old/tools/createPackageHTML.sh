#!/bin/sh

# Usage: ./createPackageHTML.sh geogram-html

BASE="$1"
OUTPUT="geogram-html.zip"

if [ -z "$BASE" ]; then
  echo "Usage: $0 <base-folder>"
  exit 1
fi

if [ -f "$OUTPUT" ]; then
    rm -f "$OUTPUT"
fi

if [ -f "$OUTPUT" ]; then
    echo "Error: Unable to remove existing $OUTPUT file."
    exit 1
fi

zip -r "$OUTPUT" \
  "$BASE/CNAME" \
  "$BASE/CONTRIBUTORS.md" \
  "$BASE/data/IGATE.js" \
  "$BASE/data/unique_devices.json" \
  "$BASE/data/WEATHER_STATION.js" \
  "$BASE/index.html" \
  "$BASE/lib/all.min.css" \
  "$BASE/lib/fonts/Audiowide-Regular.ttf" \
  "$BASE/lib/fonts/FasterOne-Regular.ttf" \
  "$BASE/lib/fonts/Inter-Regular.ttf" \
  "$BASE/lib/lame.min.js" \
  "$BASE/lib/logo_small.png" \
  "$BASE/lib/logo_small.svg" \
  "$BASE/lib/main.js" \
  "$BASE/lib/map/Control.Geocoder.css" \
  "$BASE/lib/map/Control.Geocoder.js" \
  "$BASE/lib/map/images/antenna.png" \
  "$BASE/lib/map/images/layers.png" \
  "$BASE/lib/map/images/marker-icon.png" \
  "$BASE/lib/map/images/marker-shadow.png" \
  "$BASE/lib/map/images/weather.png" \
  "$BASE/lib/map/leaflet.css" \
  "$BASE/lib/map/leaflet.js" \
  "$BASE/lib/map/leaflet.markercluster.js" \
  "$BASE/lib/map/MarkerCluster.Default.css" \
  "$BASE/lib/morsecode.js" \
  "$BASE/lib/navigation.js" \
  "$BASE/lib/nostr.bundle.js" \
  "$BASE/lib/programming.js" \
  "$BASE/lib/recordings.js" \
  "$BASE/lib/style.css" \
  "$BASE/LICENSE" \
  "$BASE/README.md" \
  "$BASE/tabs/activity.js" \
  "$BASE/tabs/config.js" \
  "$BASE/tabs/docs.js" \
  "$BASE/tabs/downloads.js" \
  "$BASE/tabs/map.js" \
  "$BASE/tabs/radio.js"

echo "Created archive: $OUTPUT"
