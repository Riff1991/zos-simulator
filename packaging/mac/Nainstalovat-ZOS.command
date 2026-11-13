#!/bin/bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$HOME/Applications/ZOS Simulator Test"
VERSION="$(cat "$ROOT/VERSION" 2>/dev/null || echo "?")"
PY_VERSION="3.15"
PKG_URL="https://www.python.org/ftp/python/3.15.2/python-3.15.2-macos11.pkg"
PKG_SHA256="2c6104475535b720b45774c68b0dfc9fcca2235353cf9ff81e05488f89845396"

find_python() {
  local candidate
  candidate="$(command -v python3 2>/dev/null || true)"
  if [[ -n "$candidate" ]] && "$candidate" -c 'import http.server' >/dev/null 2>&1; then
    printf '%s\n' "$candidate"; return 0
  fi
  for candidate in \
    "/Library/Frameworks/Python.framework/Versions/${PY_VERSION}/bin/python3" \
    /Library/Frameworks/Python.framework/Versions/*/bin/python3 \
    /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
    if [[ -x "$candidate" ]] && "$candidate" -c 'import http.server' >/dev/null 2>&1; then
      printf '%s\n' "$candidate"; return 0
    fi
  done
  return 1
}

if ! PYTHON_BIN="$(find_python)"; then
  PKG_PATH="${TMPDIR:-/tmp}/zos-python-3.15.2-macos.pkg"
  echo "Python 3 nenalezen. Stahuji overeny instalator z python.org (asi 80 MB)..."
  if ! /usr/bin/curl --fail --location --retry 2 --output "$PKG_PATH" "$PKG_URL"; then
    echo "Stazeni Pythonu se nepodarilo. Zkontrolujte pripojeni k internetu a spustte instalator znovu."
    read -r -p "Enter ukonci instalator. " _; exit 1
  fi
  ACTUAL_SHA256="$(/usr/bin/shasum -a 256 "$PKG_PATH" | /usr/bin/awk '{print $1}')"
  if [[ "$ACTUAL_SHA256" != "$PKG_SHA256" ]]; then
    echo "Kontrola instalatoru Pythonu neprosla. Nebude spusten."
    /bin/rm -f "$PKG_PATH"
    read -r -p "Enter ukonci instalator. " _; exit 1
  fi
  echo "Oteviram oficialni instalator Pythonu. Dokoncete ho v okne, ktere se otevre."
  /usr/bin/open "$PKG_PATH"
  echo "Cekam, az instalaci dokoncite..."
  PYTHON_BIN=""
  for _ in {1..900}; do
    if PYTHON_BIN="$(find_python)"; then break; fi
    sleep 1
  done
  if [[ -z "$PYTHON_BIN" ]]; then
    echo "Python se zatim nenasel. Po dokonceni instalace spustte Nainstalovat-ZOS.command znovu."
    read -r -p "Enter ukonci instalator. " _; exit 1
  fi
  /bin/rm -f "$PKG_PATH"
fi

mkdir -p "$HOME/Applications"
echo "Instaluji ZOS simulator verze v${VERSION}..."
/bin/rm -rf "$APP_DIR/site"
/usr/bin/ditto "$ROOT/site" "$APP_DIR/site"
[[ -f "$ROOT/VERSION" ]] && /bin/cp "$ROOT/VERSION" "$APP_DIR/VERSION"
[[ -f "$ROOT/CHANGELOG.md" ]] && /bin/cp "$ROOT/CHANGELOG.md" "$APP_DIR/CHANGELOG.md"
cat > "$APP_DIR/Spustit-ZOS.command" <<'LAUNCHER'
#!/bin/bash
set -Eeuo pipefail
APP_DIR="$HOME/Applications/ZOS Simulator Test"
find_python() {
  local candidate
  candidate="$(command -v python3 2>/dev/null || true)"
  if [[ -n "$candidate" ]] && "$candidate" -c 'import http.server' >/dev/null 2>&1; then printf '%s\n' "$candidate"; return 0; fi
  for candidate in /Library/Frameworks/Python.framework/Versions/*/bin/python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
    if [[ -x "$candidate" ]] && "$candidate" -c 'import http.server' >/dev/null 2>&1; then printf '%s\n' "$candidate"; return 0; fi
  done
  return 1
}
if ! PYTHON_BIN="$(find_python)"; then echo "Python 3 chybi. Spustte znovu instalator z puvodni slozky."; read -r -p "Enter ukonci okno. " _; exit 1; fi
PORT="$("$PYTHON_BIN" -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
LOG="${TMPDIR:-/tmp}/zos-simulator-server.log"
"$PYTHON_BIN" -m http.server "$PORT" --bind 127.0.0.1 --directory "$APP_DIR/site" >"$LOG" 2>&1 &
SERVER_PID=$!
trap '/bin/kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
URL="http://127.0.0.1:${PORT}/index.html"
READY=0
for _ in {1..50}; do
  if /usr/bin/curl --silent --fail "$URL" -o /dev/null; then READY=1; break; fi
  sleep 0.2
done
if [[ "$READY" != 1 ]]; then cat "$LOG"; echo "Server se nepodarilo spustit."; read -r -p "Enter ukonci okno. " _; exit 1; fi
echo "Simulator bezi v prohlizeci. Toto okno nechte otevrene; zavrenim simulaci ukoncite."
/usr/bin/open "$URL"
wait "$SERVER_PID"
LAUNCHER
chmod +x "$APP_DIR/Spustit-ZOS.command"
DESKTOP="$HOME/Desktop"
mkdir -p "$DESKTOP"
SHORTCUT="$DESKTOP/ZOS Simulator.command"
# při aktualizaci existující zástupce ponechat (žádné „ZOS Simulator 2“)
if [[ -L "$SHORTCUT" && "$(/usr/bin/readlink "$SHORTCUT")" == "$APP_DIR/Spustit-ZOS.command" ]]; then :
elif [[ -e "$SHORTCUT" || -L "$SHORTCUT" ]]; then /bin/ln -sf "$APP_DIR/Spustit-ZOS.command" "$DESKTOP/ZOS Simulator (v${VERSION}).command"
else /bin/ln -s "$APP_DIR/Spustit-ZOS.command" "$SHORTCUT"; fi
echo "Hotovo. Simulaci spoustim; priste kliknete na ikonu ZOS Simulator na plose."
/usr/bin/open "$APP_DIR/Spustit-ZOS.command"
