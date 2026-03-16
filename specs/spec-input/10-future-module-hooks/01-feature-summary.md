# Future Module Hooks — Feature Summary

## What is being built

This package does not define full implementations for ThriftShyft, RouteShyft, CapacityShyft, or DonorShyft.

Instead, it defines the **platform extension hooks** that must be created now so those future modules can be added later without re-architecting the core platform.

The goal is to prepare stable contracts for:

- voucher redemption and inventory-related hooks for ThriftShyft
- service request and scheduling hooks for RouteShyft
- work item and planning workflow hooks for CapacityShyft
- donor item and pickup hooks for DonorShyft

## Why now

These modules are not ready for full product specs yet, but several current roadmap decisions depend on them.

Examples:
- FinanceCore must support voucher primitives that ThriftShyft can later redeem
- CaseShyft and ResourceShyft should not model delivery, pickup, or repair requests in a way that blocks RouteShyft later
- operational workflows should have a stable work-item seam for CapacityShyft
- future donor pickup workflows should have event hooks now, even if DonorShyft is not yet built

## Who uses this

Direct users:
- platform architects
- backend engineers
- frontend engineers designing module seams

Indirect future users:
- thrift staff
- delivery / pickup coordinators
- woodshop / repair planners
- donor intake and pickup coordinators

## Success definition

The current platform should expose stable contracts so future modules can plug in without redesigning:

1. voucher issue / redeem flows
2. service request to route request flows
3. work item creation and planning flows
4. donor item / pickup initiation flows