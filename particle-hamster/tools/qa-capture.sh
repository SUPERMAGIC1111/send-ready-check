#!/usr/bin/env bash
# Real-browser QA captures for all three characters (5 views + 6 run frames each), then sheets.
# Usage: tools/qa-capture.sh <baseUrl> <outDir>
set -e
BASE=$1; OUT=$2
cd "$(dirname "$0")/.."
declare -A P=([orange]=0.42 [purple]=0.5 [golden]=0.34)
JOBS=()
for c in orange purple golden; do
  for v in side three-quarter front back profile; do JOBS+=("$c-$v=character=$c&view=$v&paused=1&t=0.1&auto=0"); done
  for k in 0 1 2 3 4 5; do t=$(python3 -c "print(round(${P[$c]}*$k/6+10,4))"); JOBS+=("$c-run$k=character=$c&paused=1&t=$t&auto=0"); done
done
SIZE=640x640 SETTLE=900 node tools/capture.cjs "$BASE" "$OUT/raw" "${JOBS[@]}" | tail -1
python3 tools/qa-sheets.py "$OUT/raw" "$OUT"
