#!/usr/bin/env bash
set -euo pipefail

runtime_dir="${RUNTIME_DIR:-tests/artifacts/runtime}"
backend_pid_file="${runtime_dir}/managed-backend.pid"
frontend_pid_file="${runtime_dir}/managed-frontend.pid"

cleanup_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "No managed ${label} pid file found"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$pid_file"
    echo "Removed empty ${label} pid file"
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    echo "Stopped managed ${label} process (pid=$pid)"
  else
    echo "Managed ${label} process already stopped (pid=$pid)"
  fi

  rm -f "$pid_file"
}

cleanup_pid_file "$frontend_pid_file" "frontend"
cleanup_pid_file "$backend_pid_file" "backend"
