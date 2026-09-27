#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v anvil >/dev/null 2>&1 || { echo "Anvil is required. Install Foundry in WSL first." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required." >&2; exit 1; }

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set -a
source .env
set +a

pids=()
cleanup() {
  trap - EXIT INT TERM
  for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

anvil --host 127.0.0.1 --port 8545 > /tmp/amanat-anvil.log 2>&1 &
pids+=("$!")

(
  cd services/gateway
  npm install --silent
  npm run dev
) &
pids+=("$!")

(
  python3 -m pip install -q -r services/agent/requirements.txt
  python3 -m uvicorn app.main:app --app-dir services/agent --host 127.0.0.1 --port "${AGENT_PORT:-8000}"
) &
pids+=("$!")

(
  cd frontend
  npm install --silent
  npm run dev -- --host 127.0.0.1
) &
pids+=("$!")

echo "Amanat local demo running at http://localhost:5173"
echo "Gateway: http://localhost:${PORT:-4000}"
echo "Agent:   http://localhost:${AGENT_PORT:-8000}"
echo "Press Ctrl-C to stop all services."
wait
