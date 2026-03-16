# Workflow Context

## A. ThriftShyft voucher redemption hook workflow

1. CaseShyft or ResourceShyft issues a voucher through FinanceCore
2. voucher exists as a tracked, auditable financial instrument
3. future ThriftShyft receives voucher code / token
4. ThriftShyft asks FinanceCore to validate redeemability
5. redemption event is recorded
6. ThriftShyft manages its own POS and inventory details separately

## B. RouteShyft service request hook workflow

1. case worker identifies delivery or pickup need
2. case workflow creates a service request or route-eligible request hook
3. request contains the minimum stable information RouteShyft will need later
4. future RouteShyft consumes the request and turns it into route planning work

## C. CapacityShyft work item hook workflow

1. a module such as CaseShyft or ProgramShyft creates operational work that needs planning
2. minimal work-item hook is emitted
3. future CapacityShyft consumes the work item and manages planning, assignment, and workflow orchestration

## D. DonorShyft donor pickup hook workflow

1. donation source or intake flow creates donor-item / pickup initiation event
2. event includes item and pickup context
3. future DonorShyft consumes it for donor tracking and pickup operations
4. future RouteShyft may also consume route-related pieces later