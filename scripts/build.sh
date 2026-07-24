#!/usr/bin/env bash
# Sentinel — Chrome Web Store yayın paketi üretir.
# Versiyon şeması: tarih-saat damgası (örn. 20260724.141013)
#   - manifest "version_name": 20260724.141013  (görünen sürüm)
#   - manifest "version":      2026.724.1410.13 (Chrome kuralı: her parça 0-65535)
# Kullanım: bash scripts/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Manifest'e güncel tarih-saat versiyonunu damgala
STAMP=$(python3 - <<'PY'
import json, datetime
now = datetime.datetime.now()
version_name = now.strftime("%Y%m%d.%H%M%S")
# Chrome: 1-4 nokta ayrılmış parça, her biri 0-65535 → YYYY.MDD.HHMM.SS
version = f"{now.year}.{now.month}{now.day:02d}.{now.hour}{now.minute:02d}.{now.second:02d}"
m = json.load(open("manifest.json", encoding="utf-8"))
m["version"] = version
m["version_name"] = version_name
json.dump(m, open("manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(version_name)
PY
)

OUT="dist/sentinel-aidblock-v${STAMP}.zip"
mkdir -p dist
rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  background.js \
  content.js \
  popup.html popup.js \
  options.html options.js \
  rules_static.json \
  icons \
  _locales \
  -x "*.DS_Store"

echo ""
echo "✅ Sürüm: $STAMP — Paket hazır: $OUT"
unzip -l "$OUT"
