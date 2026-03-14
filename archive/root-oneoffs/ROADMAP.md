# MoneyShyft Product Roadmap (18 Months)

## Purpose & Audience
**Purpose:** Provide a clear, trauma-informed roadmap for building MoneyShyft into a budgeting tool that works for people in crisis, couples, and experienced budgeters—without shaming language or complexity barriers.

**Audience:** Internal team (single founder/operator) using this to prioritize feature development over the next 18 months.

## Principles (Trauma-Informed, Couples-First, Power-User Friendly)
- **No shame, ever:** language reduces blame around overspending and debt
- **Progress > perfection:** celebrate small wins and forward motion
- **Couples by default:** shared households are first-class, with safe sharing
- **Optional complexity:** advanced features are hidden until needed
- **Clarity first:** plain language, minimal jargon, explain “why” in tooltips
- **Offline resilience:** core insights available even with poor connectivity
- **Cost-aware:** prioritize features that deliver value without high infra costs

## Current Baseline (What’s Done)
- Core budgeting: accounts, transactions, categories, sections, allocations, assignments
- Income tracking + recurring transactions + split transactions
- Debts + goals + debt plans
- Setup wizard with completion tracking
- Extra Money Plan (wizard, recommendations, settings, savings reserve)
- Trauma-informed UI pass: supportive messaging + privacy toggle + celebrations
- Shared household structure (multi-user)

## Phased Roadmap Overview (Feature-by-Feature)
- **Phase 0 (Launch):** stable core budgeting, trauma-informed copy, basic gamification, read-only offline
- **Phase 1:** crisis support + couples UX + email notifications + offline entry/sync + credit card UI
- **Phase 2:** reporting + templates + reconciliation + couples collaboration + native app scaffolding
- **Phase 3:** automation + deeper analytics + SMS/push + native app editing + backups
- **Phase 4:** bill calendar + admin/auditing + performance + advanced enhancements

## Phase 0: Now → Feb 1 (Launch)
**Goal:** Ship a stable, trauma-informed first version that supports individuals and couples with shared money workflows.

**Must-be-solid (launch blockers if broken):**
- Accounts, transactions, budgets
- Debts + goals
- Extra Money Plan
- Recurring transactions + split transactions

**Scope (Phase 0 includes):**
- **Shared households:** shared setup, shared budget, shared accounts/transactions/debts/goals
- **Trauma-informed language (minimum pass):**
  - Over-budgeting and over-spending: no shame, clear next steps
  - Debt copy: supportive, non-judgmental language and progress framing
- **Gentle setup defaults:**
  - “Pause & Save” on every step
  - “Not now” defaults with small suggested plans
  - “First Wins” path (3–5 categories + celebration)
- **Clear language helpers:**
  - “What this means” tooltips for key concepts
- **Gamification (minimum):**
  - Transaction-entry streaks
  - Small celebration moments on key actions (first budget, first extra money assignment, first debt payment)
- **Undo safety:** basic undo on high-risk actions (delete, large edits)
- **Offline (iOS):**
  - Read-only “Available to spend” by section/category
  - PWA-friendly caching for last viewed budget/transactions (no edits in Phase 0)
- **Basic usage analytics:**
  - Signups, active households, transactions created, budget created, extra money assigned

**Out of scope for Phase 0 (explicitly):**
- Native app
- Full offline editing/sync
- Deep gamification system (badges, levels)
- Advanced reporting / exports

## Phase 1: Feb → May (Stability + Crisis Support)
**Goal:** Improve retention by serving people in crisis and couples with clearer, calmer day-to-day workflows.

**Crisis Support Features:**
- **Safe Mode onboarding:** a shorter setup path focused on rent, food, utilities, transport, meds/childcare
- **Next-7-Days view:** what’s due + what’s actually available to spend
- **Stability template:** a ready-to-use baseline budget for crisis situations (rent, utilities, food, meds, transport, childcare)
- **Emergency checklist:** quick links (211, food banks, rental help)
- **“Show me one number”:** single “safe-to-spend today” view

**Couples UX Improvements:**
- Clear “shared vs personal” framing in UI copy
- Shared household dashboard summary for both partners
- Couples-friendly prompts (gentle, non-blaming language)

**Optional Journal (Couples-aware):**
- Per-entry privacy: Private / Shared / Ask to Share
- Default to Private
- Shared prompts: “How did money feel this week?”

**Notifications (Email):**
- Overspending/over-budgeting alerts with supportive language
- Recurring transaction reminders
- Goal milestone celebrations

**Offline (PWA Phase 2):**
- Enter transactions offline and sync later
- Queue + conflict resolution (simple “last write wins” for now)

**Power Features (early):**
- **Rollover rules** (keep or reset per category)
- **Bulk edits** for transactions (categorize, delete, change dates)
- **Credit Card Tracking UI** (status, month-start balance, new charges)

**UX Debt Cleanup (recommended):**
- Streamline category/section editing flow
- Reduce friction in transaction creation (fewer required fields)
- Supportive language library (shared copy for alerts/banners)
- Accessibility: large text + high contrast modes

## Phase 2: Jun → Sep (Power Features + Couples)
**Goal:** Deepen couples collaboration and add the first real reporting layer for power users.

**Couples Collaboration:**
- Shared check-in flow (short weekly prompt + optional notes)
- “Shared vs personal” views in spending (filtering)
- Gentle conflict-avoidant prompts (“Discuss together” instead of “Who spent this?”)
- “Share a plan” with a coach/helper (read-only, no account access)

**Reporting & Exports:**
- Core reports: spending by category, income vs expenses, monthly trend
- CSV export (transactions + category totals)
- Printable monthly summary (PDF-friendly view)

**Budget Templates:**
- Save current budget as a template
- Apply template to a new month
- Optional “starter templates” (stability, lean, aggressive debt paydown)

**Account Reconciliation UI:**
- Frontend workflow to reconcile and mark cleared/reconciled
- Clearer “what’s different” view when balances don’t match

**Mobile (Native App Scaffolding):**
- Project scaffolding + auth + read-only budget overview
- Read-only goals/debts view (no editing yet)

**Community / Shared Templates (Pilot):**
- Opt-in template gallery (curated by you at first)
- “Copy to my budget” flow

**Power-User Musts:**
- Templates (as above)
- “Advanced toggle” in settings (hide complex options by default)
- Month-end review summary (trends + adjustments)

## Phase 3: Oct → Jan (Scale + Reporting + Notifications)
**Goal:** Improve growth by reducing manual work and adding timely nudges.

**Notifications (Email + SMS/Push):**
- Email expansions + SMS/Push for key alerts (overspending, bills due, goal milestones)
- Quiet hours and frequency controls

**Automation & Merchant Rules:**
- Merchant memory (auto-categorize by payee)
- Suggested category if unsure
- Simple rule editor
- Custom rules for seasoned users (auto-assign patterns, smart shortcuts)

**Analytics Depth:**
- Trends by category over time
- Income vs expenses over 6–12 months
- “Where did it go?” monthly summary

**Reconciliation Polish:**
- Step-by-step reconciliation flow
- Clear mismatch diagnostics

**Couples Features:**
- Shared goals dashboard
- Shared journal summaries (opt-in)

**Native App (Deepen):**
- Editable transactions
- Offline queue + sync (PWA logic reused)
- Push notifications support

**Reliability:**
- Automated backups and restore points
- Multilingual copy for all core flows

## Phase 4: Feb → Jun (Advanced + Integrations)
**Goal:** Improve scalability and long-term reliability for growing households.

**Bill Calendar:**
- Monthly calendar view of due dates
- Upcoming bills summary + quick actions

**Admin & Auditing:**
- Admin tools for household management
- Audit log of major actions (assignments, transfers, edits)

**Performance & Reliability:**
- Speed improvements for large data sets
- Background jobs for heavy tasks (reports, exports)
- Data integrity checks

**Advanced Enhancements (selective):**
- Budget forecasting (lightweight)
- Tagging system (opt-in)
- Shared category notes
- Simple labels mode (Needs / Wants / Debt / Goals)

**Native App Maturity (optional):**
- Stability polish + parity for core flows

## Dependencies & Risks
- **Shoestring budget:** features must avoid high infra/third-party costs
- **Offline + sync:** data conflicts and edge cases; requires careful design
- **Couples sharing:** privacy boundaries must be explicit to avoid harm
- **Notifications:** email/SMS costs and deliverability complexity
- **Native app:** split focus risk without dedicated team

## Success Metrics
- **Activation:** % of new households completing setup within 7 days
- **Retention:** 4-week active household rate
- **Crisis impact:** usage of Safe Mode + Next-7-Days view
- **Couples usage:** shared household adoption and shared check-ins
- **Engagement:** transactions per week, streak participation
- **Assignment completion:** % of extra money assigned within 24 hours
