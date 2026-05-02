# GitHub Issues

## [bug] #1: Incorrect Average Price calculation on multiple buys
**Category:** bug
**Priority:** P1
**Description:** When a user buys the same stock multiple times, the `averagePrice` in the `Holding` model is not updated. This leads to incorrect cost-basis and PnL reporting in the portfolio.
**Root Cause:** The `handleFill` function in `engineSubscriber.ts` performs a Prisma `upsert` but only increments the `quantity` without recalculating the weighted `averagePrice`.
**Proposed Solution:** In the `handleFill` transaction, fetch the existing holding, calculate the new weighted average price, and then update the holding.

## [performance] #2: Missing Database Indexes for Query Optimization
**Category:** performance
**Priority:** P2
**Description:** Common query patterns, such as fetching a user's open orders or filtering history by status, are performing full table scans as the dataset grows.
**Root Cause:** The `Order` model only has the default primary key index and a basic foreign key index for `userId`. It lacks composite indexes for `(userId, status)`.
**Proposed Solution:** Add composite indexes to the `Order` model in `schema.prisma`.

## [enhancement] #3: Missing Transaction Audit Log
**Category:** enhancement
**Priority:** P2
**Description:** There is no historical record of why a user's balance or holdings changed. If a bug occurs, it's impossible to trace back the exact transactions that led to the current state.
**Root Cause:** The system currently updates `User` and `Holding` records in-place without creating an immutable transaction log.
**Proposed Solution:** Introduce a `Transaction` model to log every fill and refund event, including timestamp, amount, and related order ID.

## [infra] #4: Missing Environment Variable Validation
**Category:** infra
**Priority:** P3
**Description:** The services can start with missing or malformed environment variables (e.g., `JWT_SECRET`, `REDIS_URL`), leading to runtime crashes or security vulnerabilities.
**Root Cause:** There is no schema validation for environment variables at startup.
**Proposed Solution:** Implement a validation utility that checks for mandatory environment variables during the bootstrap process.

## [refactor] #5: Use of 'any' in Engine Subscriber
**Category:** refactor
**Priority:** P4
**Description:** The `engineSubscriber.ts` uses `any` for `order` and `event` objects, losing the benefits of TypeScript and increasing the risk of runtime errors.
**Root Cause:** Lack of shared type definitions between the API and Engine services.
**Proposed Solution:** Utilize the newly created `types.ts` (or equivalent shared types) to type the event handlers in the API service.
