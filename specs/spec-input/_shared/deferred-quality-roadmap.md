# Deferred Quality Roadmap

## Purpose

Track quality work that should be planned now but implemented later, with clear trigger points so it does not get forgotten or pulled in too early.

---

## 1. Visual Regression

### Why it exists
Protects key UI surfaces from unintended visual drift once the shell and operational workspaces stabilize.

### Do not implement yet because
- the UI surface area is still changing rapidly
- design system usage is still growing
- early module delivery matters more than pixel-baseline infrastructure

### Trigger point to start
Start when all of these are true:
- shell foundation is in active use
- CaseShyft and ResourceShyft have stable operational surfaces
- ProgramShyft has at least one real user flow
- design-system primitives are used broadly enough to make snapshots valuable

### Minimum first scope
- shell navigation / layout
- MoneyShyft PWA key mobile screens
- ConnectShyft triage queue
- CaseShyft case workspace
- ResourceShyft search results and detail view

---

## 2. Mutation Testing

### Why it exists
Checks whether your tests actually detect logic regressions, especially in rule-heavy modules.

### Do not implement yet because
- unit coverage is not yet mature enough
- core rule-heavy domains are still being shaped

### Trigger point to start
Start when all of these are true:
- Eligibility Engine is stable enough to have meaningful unit coverage
- FinanceCore core rules and state transitions are implemented
- PeopleCore duplicate/merge logic has stable tests
- the shared unit test platform is already in place

### Minimum first scope
- Eligibility policy evaluation helpers
- FinanceCore voucher and commitment state logic
- selected PeopleCore identity/match helpers

---

## 3. Performance Budgets

### Why it exists
Prevents gradual performance degradation in user-critical flows.

### Plan now
Yes. Define metrics early, but do not enforce hard repo-wide budgets immediately.

### Trigger point to enforce
Start hard enforcement when these are true:
- MoneyShyft PWA retention release is stable
- ConnectShyft omnichannel triage is live
- ResourceShyft search is live or nearly live
- shell navigation and login are stable enough to measure repeatedly

### Minimum first scope
- MoneyShyft PWA initial load and standalone launch
- ConnectShyft triage initial load and queue interaction
- ResourceShyft search response and result render
- shell app boot and auth hydration

---

## 4. Flaky Test Infrastructure

### Why it exists
Helps detect, quarantine, and manage nondeterministic failures once the E2E and integration suite grows.

### Do not implement yet because
- the current suite is not large enough to justify dedicated flake tooling
- it adds process overhead before the real pain exists

### Trigger point to start
Start when any of these are true:
- nightly burn-in runs are failing intermittently
- Playwright smoke suite has enough breadth to show repeated nondeterminism
- integration harness failures are recurring but not code-related
- release validation is slowed by repeated reruns

### Minimum first scope
- flaky test tagging convention
- retry/reporting rules
- quarantine list process
- nightly failure summary

---

## Review cadence

Review this roadmap:
- after Testing + CI Architecture package is implemented
- after ResourceShyft and ProgramShyft land
- before turning on nightly burn-in for a larger workflow set

These items are not optional forever. They are intentionally deferred until the repo has enough surface area to justify them.
