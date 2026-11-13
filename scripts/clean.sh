#!/bin/sh
set -u

root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd) || exit 1
cd "$root" || exit 1
. "$root/scripts/lib.sh"

compose_file='docker-compose.dev.yml'

force=0
dry_run=0
for arg in "$@"; do
  case "$arg" in
    -f | --force)   force=1 ;;
    -n | --dry-run) dry_run=1 ;;
    *)
      printf 'usage: %s [--force] [--dry-run]\n' "$0" >&2
      exit 2
      ;;
  esac
done

count() {
  printf '%s\n' "$1" | sed '/^$/d' | wc -l | tr -d ' '
}

git_clean() {
  git clean -xdff "$@" -e '/.env*' -e '/*/.env*'
}

compose_down() {
  docker compose -f "$compose_file" "$@" down --volumes --remove-orphans
}

restore_hint() {
  [ -n "$removals" ] &&
    printf '\033[2mDependencies and the git hooks went too — restore them with \033[0m\033[1mnpm install\033[0m\n'
  return 0
}

removals=$(git_clean --dry-run | sed 's/^Would remove //')
untracked=$(git ls-files --others --exclude-standard)

db_reachable=0
db_removals=''
db_error=''
if ! command -v docker >/dev/null 2>&1; then
  db_error='docker is not installed'
elif db_plan=$(compose_down --dry-run 2>&1 >/dev/null); then
  db_reachable=1
  db_removals=$(printf '%s\n' "$db_plan" | sed -En 's/^.*(Container|Network|Volume) ([^ ]+) +Removing *$/\1 \2/p' | sort -u)
else
  db_error=$(printf '%s\n' "$db_plan" | sed '/^$/d; /level=warning/d' | tail -1)
  [ -n "$db_error" ] || db_error='docker compose could not be reached'
fi

if [ -z "$removals" ] && [ -z "$db_removals" ] && [ -z "$db_error" ]; then
  printf '\n\033[2mNothing to clean.\033[0m\n\n'
  exit 0
fi

if [ -n "$removals" ]; then
  step "clean — $(count "$removals") path(s)"
  printf '%s\n' "$removals" | sed 's/^/  /'
fi

if [ -n "$db_removals" ]; then
  step "database — $(count "$db_removals") docker resource(s)"
  printf '%s\n' "$db_removals" | sed 's/^/  /'
fi

if [ -n "$db_error" ]; then
  printf '\n\033[31m✖ the database cannot be reset — %s\033[0m\n' "$db_error"
fi

if [ -n "$untracked" ]; then
  printf '\n\033[31m✖ %s uncommitted file(s) would be destroyed:\033[0m\n\n' "$(count "$untracked")"
  printf '%s\n' "$untracked" | sed 's/^/  /'

  if [ "$force" -eq 0 ]; then
    printf '\nGit has no copy of these — cleaning loses them for good.\n'
    printf 'Commit or stash them first, or repeat with: \033[1mnpm run clean:force\033[0m\n\n'
    if [ "$dry_run" -eq 1 ]; then
      printf '\033[2mDry run — nothing deleted.\033[0m\n\n'
      exit 0
    fi
    exit 1
  fi

  printf '\n\033[2m--force given; deleting them anyway.\033[0m\n'
fi

if [ "$dry_run" -eq 1 ]; then
  printf '\n\033[2mDry run — nothing deleted.\033[0m\n\n'
  exit 0
fi

rm -rf node_modules ./*/node_modules || exit 1
git_clean >/dev/null || exit 1

summary="cleaned $(count "$removals") path(s)"

if [ "$db_reachable" -eq 1 ] && ! compose_down >/dev/null 2>&1; then
  printf '\n\033[31m✖ %s, but docker compose -f %s down --volumes --remove-orphans failed\033[0m\n\n' \
    "$summary" "$compose_file"
  restore_hint
  exit 1
fi

if [ -n "$db_error" ]; then
  printf '\n\033[31m✖ %s, but the database was left as it is — %s\033[0m\n' "$summary" "$db_error"
  printf '\n  Reset it once docker is up with: \033[1mdocker compose -f %s down --volumes --remove-orphans\033[0m\n\n' "$compose_file"
  restore_hint
  exit 1
fi

[ -n "$db_removals" ] && summary="$summary and reset the database"

pass "$summary"
restore_hint
[ -n "$db_removals" ] &&
  printf '\033[2mStart the database again, migrations included, with \033[0m\033[1mnpm run db:start\033[0m\n'
printf '\n'
