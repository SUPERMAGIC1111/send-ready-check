#!/bin/sh
# Assembles everything from the shared parts (_body.html, _page.css, ui-kit.*):
#   ui-kit/index.html           standalone demo, open it directly in a browser
#   ui-kit/.artifact.html       same page without the document skeleton, for publishing
#   send-ready-ui-kit.html      single self-contained file, nothing external but the font
#   send-ready-ui-kit.zip       the ui-kit folder, for handing to someone
# The last three are generated and git-ignored. Re-run this after editing any part.
set -e
d=$(dirname "$0")
root=$d/..
FONTS='<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap">'
HEAD='<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'

# 1. demo page, linking the kit as two files
{
  printf '%s\n' '<!doctype html>' "$HEAD" '<title>Send-ready UI-Kit</title>' "$FONTS"
  printf '%s\n' '<link rel="stylesheet" href="ui-kit.css"><style>'
  cat "$d/_page.css"
  printf '%s\n' '</style></head><body>'
  cat "$d/_body.html"
  printf '%s\n' '<script src="ui-kit.js"></script><script>UIKit.mount()</script></body></html>'
} > "$d/index.html"

# 2. publishable fragment (no doctype/html/head/body — the artifact host adds them)
{
  printf '%s\n' '<title>Send-ready UI-Kit</title>' "$FONTS" '<style>'
  cat "$d/ui-kit.css" "$d/_page.css"
  printf '%s\n' '</style>'
  cat "$d/_body.html"
  printf '%s\n' '<script>'
  cat "$d/ui-kit.js"
  printf '%s\n' 'UIKit.mount()</script>'
} > "$d/.artifact.html"

# 3. single self-contained file
{
  printf '%s\n' '<!doctype html>' "$HEAD" '<title>Send-ready UI-Kit</title>' "$FONTS" '<style>'
  cat "$d/ui-kit.css" "$d/_page.css"
  printf '%s\n' '</style></head><body>'
  cat "$d/_body.html"
  printf '%s\n' '<script>'
  cat "$d/ui-kit.js"
  printf '%s\n' 'UIKit.mount()</script></body></html>'
} > "$root/send-ready-ui-kit.html"

# 4. zip of the folder, sources only
if command -v zip >/dev/null 2>&1; then
  (cd "$root" && rm -f send-ready-ui-kit.zip && zip -rq send-ready-ui-kit.zip ui-kit -x 'ui-kit/.artifact.html')
fi

echo "built: ui-kit/index.html, ui-kit/.artifact.html, send-ready-ui-kit.html, send-ready-ui-kit.zip"
