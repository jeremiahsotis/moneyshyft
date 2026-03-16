# Architecture Context

## Existing and planned platform context

These lanes or modules already exist or are in the near-term plan:

- MoneyShyft
- ConnectShyft
- PeopleCore + Identity Resolution
- CaseShyft
- Documents + Evidence
- Eligibility Engine
- ResourceShyft
- ProgramShyft
- FinanceCore

Future modules are not fully specified yet:

- ThriftShyft
- RouteShyft
- CapacityShyft
- DonorShyft

## Locked platform facts

- Future modules should plug into a modular monolith with extraction-ready seams
- Current modules must not over-own workflows that belong to future modules
- FinanceCore owns voucher primitives, not ThriftShyft
- CaseShyft may create service requests that later become route requests
- CapacityShyft should eventually own richer operational planning, but current modules may need to emit work-item hooks now
- DonorShyft should later own donor-item and donation-pickup workflows, but current modules should expose initiating events where needed

## Ownership

This feature owns:
- shared extension hook contracts
- event definitions
- minimal hook objects or references where necessary
- boundary definitions for future modules

## What it integrates with

- FinanceCore
- CaseShyft
- ResourceShyft
- ProgramShyft where relevant
- future ThriftShyft
- future RouteShyft
- future CapacityShyft
- future DonorShyft

## What it must NOT own

- full POS implementation
- inventory management
- route optimization engine
- scheduling UI
- full work-order platform
- donor CRM
- donation inventory system

## Extraction readiness

These hooks exist specifically to preserve future extraction and future lane/service creation.