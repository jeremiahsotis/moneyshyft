# RouteShyft Audit Note

Status: Supporting architecture note

## Problem
money-api and moneyshyft-web may contain RouteShyft code, assets, routes, stores, or transitional logic.

## Required audit questions
1. Which RouteShyft files still exist in money-api?
2. Which RouteShyft files still exist in moneyshyft-web?
3. Are these paths live, transitional, dead, or mirrored?
4. What depends on them today?
5. Which can be safely removed later after convergence?

## Required output
Each RouteShyft artifact found in money-api or moneyshyft-web must be classified with:
- actual runtime status
- dependency status
- removal recommendation
