#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/_bmad-output/test-artifacts"
JSON_ARTIFACT="$ARTIFACT_DIR/epic-f-dr-drill-evidence.json"
MD_ARTIFACT="$ARTIFACT_DIR/epic-f-dr-drill-evidence.md"
BACKEND_LOG="$ARTIFACT_DIR/epic-f-dr-drill-backend.log"
PID_FILE="$ARTIFACT_DIR/.epic-f-dr-drill-backend.pid"

BACKEND_PORT="${DR_DRILL_PORT:-3301}"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"
RTO_TARGET_MS="${DR_RTO_TARGET_MS:-30000}"
HEALTH_TIMEOUT_SECONDS="${DR_HEALTH_TIMEOUT_SECONDS:-60}"
HEALTH_POLL_SECONDS=0.25

BACKEND_PID=""

mkdir -p "$ARTIFACT_DIR"

if [[ -f "$ROOT_DIR/apps/moneyshyft-api/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/apps/moneyshyft-api/.env"
  set +a
fi

now_ms() {
  node -e 'process.stdout.write(String(Date.now()))'
}

health_status() {
  curl -sS -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" || true
}

wait_for_health_state() {
  local expected="$1"
  local timeout_seconds="$2"
  local started_at
  started_at="$(now_ms)"

  while true; do
    local code
    code="$(health_status)"

    if [[ "$expected" == "up" && "$code" == "200" ]]; then
      local done_at
      done_at="$(now_ms)"
      echo $((done_at - started_at))
      return 0
    fi

    if [[ "$expected" == "down" && "$code" != "200" ]]; then
      local done_at
      done_at="$(now_ms)"
      echo $((done_at - started_at))
      return 0
    fi

    local current elapsed
    current="$(now_ms)"
    elapsed=$((current - started_at))
    if (( elapsed > timeout_seconds * 1000 )); then
      echo "Timed out waiting for backend health state '${expected}'" >&2
      return 1
    fi

    sleep "$HEALTH_POLL_SECONDS"
  done
}

start_backend() {
  rm -f "$PID_FILE"
  (
    cd "$ROOT_DIR/apps/moneyshyft-api"
    PORT="$BACKEND_PORT" npm run dev > "$BACKEND_LOG" 2>&1 &
    echo $! > "$PID_FILE"
  )

  BACKEND_PID="$(cat "$PID_FILE")"
  wait_for_health_state "up" "$HEALTH_TIMEOUT_SECONDS" >/dev/null
}

stop_backend() {
  if [[ -z "$BACKEND_PID" ]]; then
    return 0
  fi

  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  stop_backend
  rm -f "$PID_FILE"
}
trap cleanup EXIT

insert_probe_row() {
  (
    cd "$ROOT_DIR/apps/moneyshyft-api"
    node - <<'NODE'
const crypto = require('crypto');
const { Client } = require('pg');

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moneyshyft',
      user: process.env.DB_USER || 'jeremiahotis',
      password: process.env.DB_PASSWORD,
    };

(async () => {
  const client = new Client(connection);
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.dr_drill_probe (
      id uuid PRIMARY KEY,
      note text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const id = crypto.randomUUID();
  await client.query(
    'INSERT INTO public.dr_drill_probe (id, note) VALUES ($1, $2)',
    [id, 'epic-f-dr-drill'],
  );
  process.stdout.write(id);
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
  )
}

query_probe_exists() {
  local probe_id="$1"
  (
    cd "$ROOT_DIR/src"
    DR_DRILL_PROBE_ID="$probe_id" node - <<'NODE'
const { Client } = require('pg');

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moneyshyft',
      user: process.env.DB_USER || 'jeremiahotis',
      password: process.env.DB_PASSWORD,
    };

(async () => {
  const client = new Client(connection);
  await client.connect();
  const result = await client.query(
    'SELECT COUNT(*)::int AS count FROM public.dr_drill_probe WHERE id = $1',
    [process.env.DR_DRILL_PROBE_ID],
  );
  process.stdout.write(String(result.rows[0].count));
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
  )
}

delete_probe_row() {
  local probe_id="$1"
  (
    cd "$ROOT_DIR/src"
    DR_DRILL_PROBE_ID="$probe_id" node - <<'NODE'
const { Client } = require('pg');

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moneyshyft',
      user: process.env.DB_USER || 'jeremiahotis',
      password: process.env.DB_PASSWORD,
    };

(async () => {
  const client = new Client(connection);
  await client.connect();
  await client.query('DELETE FROM public.dr_drill_probe WHERE id = $1', [process.env.DR_DRILL_PROBE_ID]);
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
  )
}

started_at_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

start_backend
probe_id="$(insert_probe_row)"
probe_inserted_at_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

outage_started_ms="$(now_ms)"
stop_backend
down_detection_ms="$(wait_for_health_state "down" "$HEALTH_TIMEOUT_SECONDS")"

restart_started_ms="$(now_ms)"
start_backend
restart_recovery_ms="$(wait_for_health_state "up" "$HEALTH_TIMEOUT_SECONDS")"
recovered_at_ms="$(now_ms)"

probe_exists_count="$(query_probe_exists "$probe_id")"
delete_probe_row "$probe_id"

rto_ms=$((recovered_at_ms - restart_started_ms))
rpo_records_lost=1
if [[ "$probe_exists_count" == "1" ]]; then
  rpo_records_lost=0
fi

dr_gate_pass="false"
if (( rto_ms <= RTO_TARGET_MS )) && (( rpo_records_lost == 0 )); then
  dr_gate_pass="true"
fi

generated_at_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$JSON_ARTIFACT" <<JSON
{
  "generatedAt": "${generated_at_iso}",
  "storyScope": "epic-f",
  "drillType": "backend-crash-restart-with-persistence-probe",
  "backend": {
    "url": "${BACKEND_URL}",
    "port": ${BACKEND_PORT}
  },
  "probe": {
    "table": "public.dr_drill_probe",
    "probeId": "${probe_id}",
    "insertedAt": "${probe_inserted_at_iso}",
    "existsAfterRecovery": ${probe_exists_count}
  },
  "metrics": {
    "outageStartedAtMs": ${outage_started_ms},
    "restartStartedAtMs": ${restart_started_ms},
    "recoveredAtMs": ${recovered_at_ms},
    "healthDownDetectionMs": ${down_detection_ms},
    "healthRecoveryDetectionMs": ${restart_recovery_ms},
    "rtoMs": ${rto_ms},
    "rpoRecordsLost": ${rpo_records_lost}
  },
  "targets": {
    "rtoMsMax": ${RTO_TARGET_MS},
    "rpoRecordsLostMax": 0
  },
  "gate": {
    "rtoWithinTarget": $([[ $rto_ms -le $RTO_TARGET_MS ]] && echo true || echo false),
    "rpoWithinTarget": $([[ $rpo_records_lost -eq 0 ]] && echo true || echo false),
    "drDrillPass": ${dr_gate_pass}
  },
  "evidenceSources": [
    "scripts/epic-f-dr-drill.sh",
    "apps/moneyshyft-api/src/app.ts",
    "apps/moneyshyft-api/src/config/database.ts"
  ]
}
JSON

cat > "$MD_ARTIFACT" <<MD
# Epic F DR Drill Evidence

- Generated at: ${generated_at_iso}
- Drill type: backend crash/restart with persistence probe verification
- Backend URL: ${BACKEND_URL}

| Metric | Value |
| --- | --- |
| RTO target (ms) | ${RTO_TARGET_MS} |
| RTO observed (ms) | ${rto_ms} |
| RPO target (records lost) | 0 |
| RPO observed (records lost) | ${rpo_records_lost} |
| Health down detection (ms) | ${down_detection_ms} |
| Health recovery detection (ms) | ${restart_recovery_ms} |
| Probe exists after recovery | ${probe_exists_count} |
| DR drill pass | ${dr_gate_pass} |
MD

echo "Epic F DR drill evidence generated:"
echo "  - $JSON_ARTIFACT"
echo "  - $MD_ARTIFACT"
