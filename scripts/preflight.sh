#!/bin/sh
set -u

root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd) || exit 1
cd "$root" || exit 1
. "$root/scripts/lib.sh"

with_build=1
case "${1:-}" in
  "") ;;
  --no-build) with_build=0 ;;
  *)
    printf 'usage: %s [--no-build]\n' "$0" >&2
    exit 2
    ;;
esac

run() {
  try_step "$1" npm run --silent "$1"
}

run format:check
run typecheck
run lint
run lint:shell
run lint:editor
run test

if [ "$with_build" -eq 1 ]; then
  run build
  run build:desktop
else
  skip build "--no-build"
fi

summarize "all checks passed"
