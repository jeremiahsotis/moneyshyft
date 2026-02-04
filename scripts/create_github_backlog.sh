#!/usr/bin/env bash
set -euo pipefail

REPO="jeremiahotis/moneyshyft"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it from https://cli.github.com/ and re-run." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Labels
labels=(
  "milestone-0:8fbc8f"
  "milestone-1:7fb4ff"
  "milestone-2:6fa8dc"
  "milestone-3:6c8ebf"
  "milestone-4:5b6f99"
  "area-product:ffd166"
  "area-frontend:ef476f"
  "area-backend:118ab2"
  "area-ux:f4a261"
  "area-mobile:8d99ae"
  "area-analytics:06d6a0"
  "area-notifications:ffd6a5"
  "area-infra:073b4c"
)

for entry in "${labels[@]}"; do
  name="${entry%%:*}"
  color="${entry##*:}"
  gh label create "$name" --color "$color" --repo "$REPO" --force || true
done

# Milestones
milestones=(
  "Milestone 0 - Launch (Now -> Feb 1)"
  "Milestone 1 - Stability + Crisis Support (Feb -> May)"
  "Milestone 2 - Reporting + Couples Collaboration (Jun -> Sep)"
  "Milestone 3 - Growth + Automation (Oct -> Jan)"
  "Milestone 4 - Scalability + Advanced Tools (Feb -> Jun)"
)

for title in "${milestones[@]}"; do
  gh api -X POST "repos/$REPO/milestones" -f title="$title" >/dev/null 2>&1 || true
done

create_issue() {
  local title="$1"
  local milestone="$2"
  local labels_csv="$3"

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "" \
    --milestone "$milestone" \
    --label "$labels_csv"
}

# Milestone 0 issues
m0="Milestone 0 - Launch (Now -> Feb 1)"
create_issue "Core stability: accounts, transactions, budgets, debts, goals" "$m0" "milestone-0,area-product"
create_issue "Extra Money Plan: wizard, recommendations, settings, modal assignment" "$m0" "milestone-0,area-product"
create_issue "Recurring transactions + split transactions stability pass" "$m0" "milestone-0,area-backend"
create_issue "Trauma-informed copy pass: over-budgeting/overspending + debt language" "$m0" "milestone-0,area-ux"
create_issue "Gentle setup defaults: Pause & Save + Not Now + First Wins" "$m0" "milestone-0,area-ux"
create_issue "Tooltips: \"What this means\" for key concepts" "$m0" "milestone-0,area-ux"
create_issue "Basic gamification: transaction streaks + celebrations" "$m0" "milestone-0,area-frontend"
create_issue "Undo safety for risky actions" "$m0" "milestone-0,area-frontend"
create_issue "PWA read-only cache for budget/transactions (iOS)" "$m0" "milestone-0,area-mobile"
create_issue "Basic usage analytics" "$m0" "milestone-0,area-analytics"

# Milestone 1 issues
m1="Milestone 1 - Stability + Crisis Support (Feb -> May)"
create_issue "Safe Mode onboarding (crisis path)" "$m1" "milestone-1,area-ux"
create_issue "Next-7-Days view" "$m1" "milestone-1,area-frontend"
create_issue "Stability template (rent/utilities/food/meds/transport/childcare)" "$m1" "milestone-1,area-product"
create_issue "Emergency checklist (211/food banks/rental help)" "$m1" "milestone-1,area-ux"
create_issue "Show me one number: safe-to-spend today" "$m1" "milestone-1,area-frontend"
create_issue "Couples UX: shared dashboard + shared budget clarity" "$m1" "milestone-1,area-ux"
create_issue "Optional journal (private/share/ask)" "$m1" "milestone-1,area-product"
create_issue "Email notifications: overspending, recurring, goals" "$m1" "milestone-1,area-notifications"
create_issue "Offline entry + sync" "$m1" "milestone-1,area-mobile"
create_issue "Credit card tracking UI" "$m1" "milestone-1,area-frontend"
create_issue "Rollover rules" "$m1" "milestone-1,area-backend"
create_issue "Bulk edits for transactions" "$m1" "milestone-1,area-frontend"
create_issue "Accessibility: large text + high contrast" "$m1" "milestone-1,area-ux"
create_issue "Supportive language library" "$m1" "milestone-1,area-ux"

# Milestone 2 issues
m2="Milestone 2 - Reporting + Couples Collaboration (Jun -> Sep)"
create_issue "Core reports (category, income vs expense, trend)" "$m2" "milestone-2,area-analytics"
create_issue "CSV export (transactions + totals)" "$m2" "milestone-2,area-backend"
create_issue "Printable monthly summary" "$m2" "milestone-2,area-frontend"
create_issue "Budget templates: save/apply + starters" "$m2" "milestone-2,area-product"
create_issue "Account reconciliation UI" "$m2" "milestone-2,area-frontend"
create_issue "Couples collaboration: shared check-in + shared/personal filters" "$m2" "milestone-2,area-ux"
create_issue "Share a plan (coach/helper read-only)" "$m2" "milestone-2,area-product"
create_issue "Advanced toggle (hide complex options)" "$m2" "milestone-2,area-ux"
create_issue "Month-end review summary" "$m2" "milestone-2,area-analytics"
create_issue "Native app scaffolding (auth + read-only)" "$m2" "milestone-2,area-mobile"
create_issue "Community/shared templates pilot" "$m2" "milestone-2,area-product"

# Milestone 3 issues
m3="Milestone 3 - Growth + Automation (Oct -> Jan)"
create_issue "Notifications: SMS/Push + controls" "$m3" "milestone-3,area-notifications"
create_issue "Merchant rules: remember payee + suggested category" "$m3" "milestone-3,area-backend"
create_issue "Custom rules for seasoned users" "$m3" "milestone-3,area-backend"
create_issue "Analytics depth: 6-12 month trends" "$m3" "milestone-3,area-analytics"
create_issue "Reconciliation polish: mismatch diagnostics" "$m3" "milestone-3,area-frontend"
create_issue "Couples: shared goals + shared journal summaries" "$m3" "milestone-3,area-product"
create_issue "Native app deepen: editable transactions + offline sync" "$m3" "milestone-3,area-mobile"
create_issue "Backups + restore points" "$m3" "milestone-3,area-infra"
create_issue "Multilingual copy for core flows" "$m3" "milestone-3,area-ux"

# Milestone 4 issues
m4="Milestone 4 - Scalability + Advanced Tools (Feb -> Jun)"
create_issue "Bill calendar view + upcoming bills summary" "$m4" "milestone-4,area-frontend"
create_issue "Admin tools + audit log" "$m4" "milestone-4,area-backend"
create_issue "Performance improvements for large data sets" "$m4" "milestone-4,area-infra"
create_issue "Background jobs for reports/exports" "$m4" "milestone-4,area-infra"
create_issue "Data integrity checks" "$m4" "milestone-4,area-backend"
create_issue "Advanced enhancements: forecasting/tags/shared notes" "$m4" "milestone-4,area-product"
create_issue "Simple labels mode (Needs/Wants/Debt/Goals)" "$m4" "milestone-4,area-ux"
create_issue "Native app maturity (parity on core flows)" "$m4" "milestone-4,area-mobile"

echo "Done. Issues created in $REPO."
