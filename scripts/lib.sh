fix_hint() {
  case "$1" in
    format:check) printf '  Fix with: \033[1mnpm run format\033[0m\n' ;;
    lint)         printf '  Fix with: \033[1mnpm run lint:fix\033[0m\n' ;;
    lint:shell)   printf '  Each finding links to a wiki page with the fix. Missing ShellCheck? \033[1mbrew install shellcheck\033[0m\n' ;;
    lint:editor)  printf '  Rename or drop the setting VS Code marks as deprecated in .vscode/settings.json\n' ;;
  esac
}

step() {
  printf '\n\033[1m▶ %s\033[0m\n' "$1"
}

skip() {
  printf '\n\033[2m▶ %s — skipped, %s\033[0m\n' "$1" "$2"
}

pass() {
  printf '\n\033[32m✔ %s\033[0m\n\n' "$1"
}

failures=""

try_step() {
  label="$1"
  shift
  step "$label"
  if ! "$@"; then
    printf '\n\033[31m✖ %s failed\033[0m\n' "$label"
    fix_hint "$label"
    failures="$failures $label"
  fi
}

summarize() {
  if [ -n "$failures" ]; then
    printf '\n\033[31m✖ failed:\033[0m\033[1m%s\033[0m\n\n' "$failures"
    exit 1
  fi
  pass "$1"
}
