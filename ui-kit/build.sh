#!/bin/sh
# Assembles the demo from the shared parts:
#   index.html      standalone page, open it directly in a browser
#   .artifact.html  same page without the document skeleton, for publishing
set -e
d=$(dirname "$0")
FONTS='<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap">'

{
  printf '%s\n' '<!doctype html>'
  printf '%s\n' '<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '%s\n' '<title>Send-ready UI-Kit</title>'
  printf '%s\n' "$FONTS"
  printf '%s\n' '<link rel="stylesheet" href="ui-kit.css"><style>'
  cat "$d/_page.css"
  printf '%s\n' '</style></head><body>'
  cat "$d/_body.html"
  printf '%s\n' '<script src="ui-kit.js"></script><script>UIKit.mount()</script></body></html>'
} > "$d/index.html"

{
  printf '%s\n' '<title>Send-ready UI-Kit</title>'
  printf '%s\n' "$FONTS"
  printf '%s\n' '<style>'
  cat "$d/ui-kit.css" "$d/_page.css"
  printf '%s\n' '</style>'
  cat "$d/_body.html"
  printf '%s\n' '<script>'
  cat "$d/ui-kit.js"
  printf '%s\n' 'UIKit.mount()</script>'
} > "$d/.artifact.html"

echo "built index.html and .artifact.html"
