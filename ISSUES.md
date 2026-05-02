# Repository Audit - Paper Trading Platform

## Identified Issues

### 1. [BUG] Incorrect Engine Ticker Endpoint in API Service
- **Category**: bug
- **Priority**: P1 (Functional Correctness)
- **Problem**: In `backend/api/src/routes/orderRouter.ts`, the code attempts to fetch ticker data from `${ENGINE_URL}/api/ticker/${symbol}`. However, the engine service defines this route as `/api/market/:ticker` in `backend/engine/src/routes/marketRouter.ts`.
- **Root Cause**: Mismatch between API and Engine route definitions.
- **Proposed Solution**: Update the URL in `orderRouter.ts` to `${ENGINE_URL}/api/market/${symbol}`.
- **Expected Impact**: Market orders will be able to fetch the current price for slippage calculation, preventing failures.

### 2. [BUG] Incorrect Average Price Update Logic
- **Category**: bug
- **Priority**: P1 (Functional Correctness)
- **Problem**: In `backend/api/src/utils/engineSubscriber.ts`, the `Holding` upsert only increments the quantity but does not update the `averagePrice` for existing holdings.
- **Root Cause**: The `update` block in `prisma.holding.upsert` only includes `quantity`.
- **Proposed Solution**: Implement weighted average price calculation during the fill process.
- **Expected Impact**: Users will see correct cost basis and unrealized PnL in their portfolios.

### 3. [FEATURE] Engine State Recovery on Startup
- **Category**: feature
- **Priority**: P2 (Reliability)
- **Problem**: The matching engine (`backend/engine`) stores all open orders in-memory. If the engine restarts, all open orders are lost, but they remain 'open' in the database.
- **Root Cause**: Lack of persistence or state synchronization in the engine.
- **Proposed Solution**: Add an endpoint to the API to fetch all open orders and have the engine call it on startup to repopulate its memory.
- **Expected Impact**: System becomes resilient to engine restarts.

### 4. [REFACTOR] Use Enums for Order and Holding States
- **Category**: refactor
- **Priority**: P3 (Maintainability)
- **Problem**: Order sides, types, and statuses are handled as raw strings in the Prisma schema and throughout the codebase.
- **Root Cause**: Initial schema design didn't utilize Postgres Enums.
- **Proposed Solution**: Define `enum` types in `schema.prisma` and update the code to use them.
- **Expected Impact**: Improved type safety and reduced risk of bugs due to typos in string values.

### 5. [INFRA] Missing Frontend Implementation
- **Category**: feature
- **Priority**: P4 (Functional Gap)
- **Problem**: The `frontend/` directory is empty, but `docker-compose.yml` and the API's `PortfolioPage` mocks suggest a Next.js application is expected.
- **Proposed Solution**: Initialize a Next.js frontend with basic dashboard, order placement, and portfolio views.
- **Expected Impact**: The platform becomes usable by end-users.

### 6. [REFACTOR] Centralize Shared Types
- **Category**: refactor
- **Priority**: P3 (Maintainability)
- **Problem**: Types like `Order` are redefined or handled loosely across different services.
- **Proposed Solution**: Create a shared package or at least synchronize type definitions between `api`, `engine`, and `ws`.
- **Expected Impact**: Better developer experience and fewer integration bugs.

### 7. [BUG] WebSocket Redis Subscription Mismatch
- **Category**: bug
- **Priority**: P1 (Functional Correctness)
- **Problem**: The engine publishes market data to `stock:${ticker}` in `backend/engine/src/utils/yahoo.ts`, but the WebSocket service subscribes to just `${ticker}` in `backend/ws/src/utils/webSocketManager.ts`.
- **Root Cause**: Inconsistent Redis channel naming between services.
- **Proposed Solution**: Standardize the Redis channel prefix to `stock:` across all services.
- **Expected Impact**: Real-time market data will correctly reach connected WebSocket clients.
