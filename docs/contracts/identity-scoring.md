# Contract: Identity Scoring

## Purpose
Identity scoring converts evidence into a deterministic confidence score, then maps that score to a confidence band.

## Locked dependency
Only candidates produced by the locked candidate generation rules may be scored.

## Band mapping
- score <= 0 → VERY LOW
- score 1–39 → LOW
- score 40–79 → MEDIUM
- score 80–119 → HIGH
- score >= 120 → VERY HIGH

## Base score
Start each candidate subject at 0.

## Additive factors
- exact current person link: +60
- exact current household link: +20
- current primary link: +15
- manual confirmation on current link: +40
- resolver verified current link: +60
- recent activity in last 0–30 days: +20
- recent activity in last 31–180 days: +10
- recent confirmation in last 0–180 days: +15
- same-household corroboration: +15

## Subtractive factors
- multiple current person links on same ContactPoint: -35
- ContactPoint status active_shared_possible: -20
- ContactPoint status active_shared_confirmed: -45
- ContactPoint status stale: -25
- ContactPoint status reassignment_suspected: -70
- historical-only link: -40
- conflicting identity fields: -60
- cross-household conflict: -25
- no recent use over 365 days: -15

## Locked scoring rules
1. Score each candidate subject independently.
2. exact current person link and exact current household link are mutually exclusive for a candidate.
3. manual confirmation and resolver verification may both apply only when separately evidenced.
4. same-household corroboration may support direct evidence but may not replace it.
5. historical-only link cannot be combined with current-primary-link evidence.

## Locked band caps
- reassignment_suspected → max band MEDIUM
- active_shared_confirmed → max band HIGH
- multiple current person links → max band HIGH

## Tie-break rule
If the top candidate leads the next candidate by less than 20 points:
- bias outcome toward review
- do not auto-select as if the lead were decisive
