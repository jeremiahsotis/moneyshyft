#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass_count=0
LAST_OUTPUT_FILE="/tmp/verified-patch-test.out"

log_pass() {
  local name="$1"
  echo "[PASS] $name"
  pass_count=$((pass_count + 1))
}

run_expect_success() {
  local name="$1"
  shift

  if "$@" >"$LAST_OUTPUT_FILE" 2>&1; then
    log_pass "$name"
    return 0
  fi

  echo "[FAIL] $name (expected success)"
  cat "$LAST_OUTPUT_FILE"
  return 1
}

run_expect_failure() {
  local name="$1"
  shift

  if "$@" >"$LAST_OUTPUT_FILE" 2>&1; then
    echo "[FAIL] $name (expected failure)"
    cat "$LAST_OUTPUT_FILE"
    return 1
  fi

  log_pass "$name"
}

assert_last_output_contains() {
  local needle="$1"

  if grep -Fq "$needle" "$LAST_OUTPUT_FILE"; then
    log_pass "output contains: $needle"
    return 0
  fi

  echo "[FAIL] expected output to contain: $needle"
  cat "$LAST_OUTPUT_FILE"
  return 1
}

assert_file_contains() {
  local file="$1"
  local needle="$2"

  if grep -Fq "$needle" "$file"; then
    log_pass "file contains expected content: $file"
    return 0
  fi

  echo "[FAIL] expected file to contain '$needle': $file"
  cat "$file"
  return 1
}

create_patch_fixture_repo() {
  local repo="$TMP_DIR/patch-fixture-repo"
  mkdir -p "$repo/docs"

  (
    cd "$repo"
    git init -q
    git config user.email "patch-fixture@example.com"
    git config user.name "Patch Fixture"

    cat > docs/ci.md <<'DOC'
# CI Pipeline Guide

This repository uses GitHub Actions at `.github/workflows/test.yml`.

DOC

    cat > package.json <<'JSON'
{
  "name": "patch-fixture",
  "scripts": {
    "policy:check": "echo policy-check-ok"
  }
}
JSON

    git add docs/ci.md package.json
    git commit -qm "init patch fixture repo"
  )

  echo "$repo"
}

cd "$ROOT_DIR"
PATCH_REPO="$(create_patch_fixture_repo)"

PATCH_CLASS_01="$TMP_DIR/class-01.patch"
PATCH_CLASS_07="$TMP_DIR/class-07.patch"
PATCH_CLASS_08_BAD="$TMP_DIR/class-08-bad.patch"
PATCH_CLASS_08_FIXED="$TMP_DIR/class-08-fixed.patch"

cat > "$PATCH_CLASS_01" <<'PATCH'
diff --git a/one/two/three/docs/ci.md b/one/two/three/docs/ci.md
--- a/one/two/three/docs/ci.md
+++ b/one/two/three/docs/ci.md
@@ -1,4 +1,4 @@
-# CI Pipeline Guide
+# CI Pipeline Guide (Class 01 Patch Intake Test)
 
 This repository uses GitHub Actions at `.github/workflows/test.yml`.
 
PATCH

cat > "$PATCH_CLASS_07" <<'PATCH'
diff --git a/docs/ci.md b/docs/ci.md
--- a/docs/ci.md
+++ b/docs/ci.md
@@ -1,4 +1,4 @@
-# CI Pipeline Guide
+# CI Pipeline Guide (Class 07 Patch Intake Test)
 
 This repository uses GitHub Actions at `.github/workflows/test.yml`.
 
PATCH

cat > "$PATCH_CLASS_08_BAD" <<'PATCH'
diff --git a/docs/ci.md b/docs/ci.md
--- a/docs/ci.md
+++ b/docs/ci.md
@@ -1,4 +1,5 @@
 # CI Pipeline Guide
+curl -X POST https://example.test -H 'content-type: application/json' -d '{"flag": true,}'
 
 This repository uses GitHub Actions at `.github/workflows/test.yml`.
 
PATCH

cat > "$PATCH_CLASS_08_FIXED" <<'PATCH'
diff --git a/docs/ci.md b/docs/ci.md
--- a/docs/ci.md
+++ b/docs/ci.md
@@ -1,4 +1,5 @@
 # CI Pipeline Guide
+curl -X POST https://example.test -H 'content-type: application/json' -d '{"flag": true}'
 
 This repository uses GitHub Actions at `.github/workflows/test.yml`.
 
PATCH

run_expect_success "class 01 preflight with required -p4" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_01' --class 01 --mode check"

run_expect_failure "class 01 rejects wrong strip override" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_01' --class 01 --mode check --strip 3"

run_expect_success "class 07 clean preflight" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_07' --class 07 --mode check"

run_expect_failure "class 02 requires remediation by default" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_07' --class 02 --mode check"

run_expect_failure "class 08 blocks malformed JSON payload" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_08_BAD' --class 08 --mode check --allow-repaired"

run_expect_success "class 08 repaired JSON can pass with allow-repaired" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_08_FIXED' --class 08 --mode check --allow-repaired"

run_expect_success "class 07 apply mode executes post-apply verification gates" \
  bash -c "cd '$PATCH_REPO' && bash '$ROOT_DIR/scripts/verified-patch-apply.sh' --patch '$PATCH_CLASS_07' --class 07 --mode apply"
assert_last_output_contains "PATCH_POST_VERIFY: git status --short"
assert_last_output_contains "PATCH_POST_VERIFY: npm run policy:check"
assert_last_output_contains "policy-check-ok"
assert_file_contains "$PATCH_REPO/docs/ci.md" "Class 07 Patch Intake Test"

run_expect_success "policy guard passes in repository" \
  bash scripts/enforce-verified-patch-intake-guard.sh

GUARD_REPO="$TMP_DIR/guard-repo"
mkdir -p "$GUARD_REPO/scripts" "$GUARD_REPO/docs/policies"
cp "$ROOT_DIR/scripts/enforce-verified-patch-intake-guard.sh" "$GUARD_REPO/scripts/enforce-verified-patch-intake-guard.sh"
cat > "$GUARD_REPO/scripts/verified-patch-apply.sh" <<'SCRIPT'
#!/usr/bin/env bash
echo "placeholder"
SCRIPT
chmod +x "$GUARD_REPO/scripts/verified-patch-apply.sh" "$GUARD_REPO/scripts/enforce-verified-patch-intake-guard.sh"

cat > "$GUARD_REPO/docs/policies/verified_patch_application_policy.md" <<'DOC'
# Verified Patch Application Policy

| Class | Notes |
| --- | --- |
| `01` | apply-clean |
| `02` | repair-stale |
| `03` | rebuild-malformed |
| `04` | repair-stale |
| `05` | defer-structural |
| `06` | defer-structural |
| `07` | apply-clean |
| `08` | repair-stale |

Invalid JSON payloads must be corrected before apply.
DOC

cat > "$GUARD_REPO/package.json" <<'JSON'
{
  "name": "guard-test",
  "scripts": {
    "patch:apply:verified": "bash scripts/verified-patch-apply.sh"
  }
}
JSON

(
  cd "$GUARD_REPO"
  git init -q
  git config user.email "guard-test@example.com"
  git config user.name "Guard Test"
  git add .
  git commit -qm "init"

  bash scripts/enforce-verified-patch-intake-guard.sh >/tmp/verified-patch-test.out 2>&1
)
log_pass "policy guard passes in clean temp repo"

printf '#!/usr/bin/env bash\n%s %s /tmp/untrusted.patch\n' "git" "apply" > "$GUARD_REPO/scripts/bad-apply.sh"
chmod +x "$GUARD_REPO/scripts/bad-apply.sh"

(
  cd "$GUARD_REPO"
  git add scripts/bad-apply.sh
  git commit -qm "add bad apply"
)

run_expect_failure "policy guard blocks ad hoc apply command in automation" \
  bash -c "cd '$GUARD_REPO' && bash scripts/enforce-verified-patch-intake-guard.sh"

echo "Verified patch intake tests passed: $pass_count"
