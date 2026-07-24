#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/services/api"
WEB_DIR="$ROOT_DIR/apps/web"
LOGS_DIR="$ROOT_DIR/.local/run-logs"
PGLITE_DIR="$ROOT_DIR/.local/pglite-runtime"
WEB_PORT=3000
API_PORT=3001
PORT_SEARCH_LIMIT=20
NO_BROWSER=0
REUSE=0
KILL_EXISTING=0
RESET_PGLITE=0
AUTO_INSTALL=0

usage() {
	cat <<'USAGE'
AI Novel Diagnosis macOS local launcher

Usage:
  scripts/start-local-mac.sh [options]
  scripts/start-local-mac.command [options]

Options:
  --web-port <port>          Preferred Web port. Default: 3000
  --api-port <port>          Preferred API port. Default: 3001
  --port-search-limit <n>    Search this many ports after the preferred port. Default: 20
  --no-browser               Start services without opening the browser
  --reuse                    Reuse healthy services on the selected ports
  --kill                     Stop existing project-owned dev processes before start
  --reset-pglite             Reset local PGlite runtime before start
  -a, --auto-install         Allow dependency installation without prompting
  -h, --help                 Show help

PowerShell-style aliases are also accepted:
  -NoBrowser -Reuse -Kill -ResetPglite -WebPort -ApiPort -PortSearchLimit
USAGE
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--)
			shift
			;;
		--web-port|-WebPort)
			WEB_PORT="${2:-}"
			shift 2
			;;
		--api-port|-ApiPort)
			API_PORT="${2:-}"
			shift 2
			;;
		--port-search-limit|-PortSearchLimit)
			PORT_SEARCH_LIMIT="${2:-}"
			shift 2
			;;
		--no-browser|-NoBrowser)
			NO_BROWSER=1
			shift
			;;
		--reuse|-Reuse)
			REUSE=1
			shift
			;;
		--kill|-Kill)
			KILL_EXISTING=1
			shift
			;;
		--reset-pglite|-ResetPglite)
			RESET_PGLITE=1
			shift
			;;
		-a|--auto-install|-AutoInstall)
			AUTO_INSTALL=1
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "[error] Unknown option: $1" >&2
			usage
			exit 1
			;;
	esac
done

if [[ "$REUSE" == "1" && "$KILL_EXISTING" == "1" ]]; then
	echo "[error] Use either --reuse or --kill, not both." >&2
	exit 1
fi

mkdir -p "$LOGS_DIR" "$PGLITE_DIR"

if [[ "$RESET_PGLITE" == "1" ]]; then
	echo "[start-local] Resetting local PGlite runtime: $PGLITE_DIR"
	rm -rf "$PGLITE_DIR"
	mkdir -p "$PGLITE_DIR"
fi

on_exit() {
	local exit_code=$?
	trap - EXIT INT TERM
	if [[ "${API_PID:-}" != "" ]]; then
		kill "$API_PID" 2>/dev/null || true
	fi
	if [[ "${WEB_PID:-}" != "" ]]; then
		kill "$WEB_PID" 2>/dev/null || true
	fi
	exit "$exit_code"
}
trap on_exit EXIT INT TERM

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "[error] Missing command: $1" >&2
		return 1
	fi
}

check_node_version() {
	require_command node
	node <<'NODE'
const version = process.versions.node.split(".").map(Number);
const atLeastBaseline = version[0] > 20 || (version[0] === 20 && (version[1] > 11 || (version[1] === 11 && version[2] >= 0)));
if (!atLeastBaseline) {
  console.error(`[error] Node.js ${process.versions.node} detected. This project expects >=20.11.0.`);
  process.exit(1);
}
if (version[0] >= 21) {
  console.warn(`[warn] Node.js ${process.versions.node} is newer than the declared project range (<21). Continuing because local dev scripts may still work.`);
}
NODE
}

resolve_pnpm() {
	if command -v corepack >/dev/null 2>&1; then
		corepack enable >/dev/null 2>&1 || true
		corepack prepare pnpm@10.14.0 --activate >/dev/null 2>&1 || true
		if corepack pnpm --version >/dev/null 2>&1; then
			PNPM=(corepack pnpm)
			return
		fi
	fi
	if command -v pnpm >/dev/null 2>&1; then
		PNPM=(pnpm)
		return
	fi
	echo "[error] pnpm not found. Install pnpm or enable Corepack, then run this script again." >&2
	exit 1
}

dependencies_ready() {
	[[ -d "$ROOT_DIR/node_modules" ]] || return 1
	[[ -x "$WEB_DIR/node_modules/.bin/next" ]] || return 1
	[[ -x "$API_DIR/node_modules/.bin/nest" ]] || return 1
	[[ -f "$API_DIR/node_modules/@ai-novel-diagnosis/ai-core/package.json" ]] || return 1
	[[ -f "$WEB_DIR/node_modules/@ai-novel-diagnosis/ai-core/package.json" ]] || return 1
	return 0
}

ensure_dependencies() {
	if dependencies_ready; then
		return
	fi

	if [[ "$AUTO_INSTALL" != "1" ]]; then
		echo "[start-local] Workspace dependencies are missing."
		printf "Run pnpm install now? [y/N] "
		read -r answer
		case "$answer" in
			y|Y|yes|YES) ;;
			*)
				echo "[error] Dependencies are required. Re-run with --auto-install to install automatically." >&2
				exit 1
				;;
		esac
	fi

	echo "[start-local] Installing dependencies..."
	(cd "$ROOT_DIR" && "${PNPM[@]}" install)
}

port_available() {
	local port="$1"
	! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

api_healthy() {
	local port="$1"
	curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1
}

web_healthy() {
	local port="$1"
	curl -fsS "http://127.0.0.1:$port" >/dev/null 2>&1
}

find_port() {
	local preferred="$1"
	local kind="$2"
	local port
	local last=$((preferred + PORT_SEARCH_LIMIT))

	for ((port = preferred; port <= last; port++)); do
		if port_available "$port"; then
			echo "$port:start"
			return
		fi
		if [[ "$REUSE" == "1" ]]; then
			if [[ "$kind" == "api" ]] && api_healthy "$port"; then
				echo "$port:reuse"
				return
			fi
			if [[ "$kind" == "web" ]] && web_healthy "$port"; then
				echo "$port:reuse"
				return
			fi
		fi
	done

	echo "[error] No available $kind port found from $preferred to $last." >&2
	exit 1
}

kill_project_processes() {
	echo "[start-local] Stopping existing project dev processes..."
	pgrep -f "$ROOT_DIR" | while read -r pid; do
		[[ "$pid" == "$$" ]] && continue
		kill "$pid" 2>/dev/null || true
	done
}

wait_for_api() {
	local port="$1"
	local waited=0
	echo -n "[start-local] Waiting for API"
	while [[ "$waited" -lt 60 ]]; do
		if api_healthy "$port"; then
			echo " ready."
			return 0
		fi
		sleep 1
		waited=$((waited + 1))
		echo -n "."
	done
	echo ""
	echo "[warn] API did not answer /health within 60 seconds. Check $API_LOG"
	return 1
}

wait_for_web() {
	local port="$1"
	local waited=0
	echo -n "[start-local] Waiting for Web"
	while [[ "$waited" -lt 60 ]]; do
		if web_healthy "$port"; then
			echo " ready."
			return 0
		fi
		sleep 1
		waited=$((waited + 1))
		echo -n "."
	done
	echo ""
	echo "[warn] Web did not answer within 60 seconds. Check $WEB_LOG"
	return 1
}

check_node_version
resolve_pnpm
ensure_dependencies

if [[ "$KILL_EXISTING" == "1" ]]; then
	kill_project_processes
fi

api_selection="$(find_port "$API_PORT" api)"
API_PORT="${api_selection%%:*}"
API_MODE="${api_selection##*:}"

web_selection="$(find_port "$WEB_PORT" web)"
WEB_PORT="${web_selection%%:*}"
WEB_MODE="${web_selection##*:}"

if [[ "$WEB_PORT" == "$API_PORT" ]]; then
	web_selection="$(find_port "$((WEB_PORT + 1))" web)"
	WEB_PORT="${web_selection%%:*}"
	WEB_MODE="${web_selection##*:}"
fi

API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1"
WEB_URL="http://127.0.0.1:$WEB_PORT"
ALLOWED_ORIGINS="http://localhost:$WEB_PORT,http://127.0.0.1:$WEB_PORT"
API_LOG="$LOGS_DIR/api-dev.log"
WEB_LOG="$LOGS_DIR/web-dev.log"

rm -f "$API_LOG" "$WEB_LOG"

if [[ "$API_MODE" == "start" ]]; then
	echo "[start-local] Starting API on http://127.0.0.1:$API_PORT"
	(
		cd "$API_DIR"
		PORT="$API_PORT" \
			ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
			PGLITE_DATA_DIR="$PGLITE_DIR" \
			NEXT_TELEMETRY_DISABLED=1 \
			"${PNPM[@]}" run start:dev
	) >"$API_LOG" 2>&1 &
	API_PID=$!
else
	echo "[start-local] Reusing API on http://127.0.0.1:$API_PORT"
fi

if [[ "$WEB_MODE" == "start" ]]; then
	echo "[start-local] Starting Web on $WEB_URL"
	(
		cd "$WEB_DIR"
		NEXT_PUBLIC_API_BASE_URL="/api/v1" \
			API_INTERNAL_BASE_URL="$API_BASE_URL" \
			NEXT_TELEMETRY_DISABLED=1 \
			"${PNPM[@]}" run dev --hostname 127.0.0.1 --port "$WEB_PORT"
	) >"$WEB_LOG" 2>&1 &
	WEB_PID=$!
else
	echo "[start-local] Reusing Web on $WEB_URL"
fi

echo ""
echo "Local app:"
echo "  Web: $WEB_URL"
echo "  API: $API_BASE_URL"
echo "  Logs: $LOGS_DIR"
echo ""

wait_for_api "$API_PORT" || true
wait_for_web "$WEB_PORT" || true

if [[ "$NO_BROWSER" != "1" ]]; then
	echo "[start-local] Opening $WEB_URL"
	open "$WEB_URL" >/dev/null 2>&1 || true
fi

echo ""
echo "Services are running. Press Ctrl+C in this window to stop services started by this launcher."
echo "Logs:"
echo "  API: $API_LOG"
echo "  Web: $WEB_LOG"
echo ""

wait
