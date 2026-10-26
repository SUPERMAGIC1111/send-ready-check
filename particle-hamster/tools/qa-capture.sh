#!/usr/bin/env bash
# Real-browser QA captures (views + 6 run frames per character), then labelled sheets.
# Usage: tools/qa-capture.sh <baseUrl> <outDir>
#   CHARS="orangeV3 purpleV3 goldenV3"  VIEWS="side three-quarter front opposite-side back"
set -e
BASE=$1; OUT=$2
cd "$(dirname "$0")/.."
CHARS=${CHARS:-"orange purple golden"}
VIEWS=${VIEWS:-"side three-quarter front back profile"}
JOBS=()
for c in $CHARS; do
  per=$(node -e "import('./src/hamsterModel.js').then(m=>console.log(m.runPeriod('$c')))")
  for v in $VIEWS; do JOBS+=("$c-$v=character=$c&view=$v&paused=1&t=10.5&auto=0"); done
  for k in 0 1 2 3 4 5; do t=$(python3 -c "print(round($per*$k/6+10,4))"); JOBS+=("$c-run$k=character=$c&view=profile&paused=1&t=$t&auto=0"); done
done
NO_UI=1 SIZE=640x640 SETTLE=900 node tools/capture.cjs "$BASE" "$OUT/raw" "${JOBS[@]}" | tail -1
CHARS="$CHARS" VIEWS="$VIEWS" python3 tools/qa-sheets.py "$OUT/raw" "$OUT"
