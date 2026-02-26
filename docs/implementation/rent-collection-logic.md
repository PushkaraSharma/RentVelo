# Rent Collection Implementation Patterns

This document outlines the architectural patterns for monthly rent collection, electricity continuity, and period locking implemented in the RentVelo application.

## 1. Electricity Reading Continuity Pattern
To ensure electricity readings flow correctly from one month to the next:
- **Generation**: When generating a bill for Month N, look for a bill in Month N-1. If found, carry over `curr_reading` to Month N's `prev_reading`.
- **Updating**: When a `curr_reading` is saved in Month N, immediately check if a bill for Month N+1 exists. If it does, update its `prev_reading` and trigger a recalculation.
- **Cascading**: Reading updates should cascade forward recursively to maintain data integrity across the entire timeline.

## 2. Historical Period Locking
To prevent "accidental" changes to past data that would invalidate current balances:
- **Lock Condition**: A bill for Month N is considered **Locked** if Month N+1 has been "touched" (i.e., has a non-pending status, payments, expenses, or a meter reading).
- **UI Feedback**: Locked bills should disable all interactive elements (inputs, action buttons) and display a clear "Locked" state.

## 3. The Reset Mechanism (Unlocking)
To allow legitimate edits to past months:
- **Reset Logic**: To unlock Month N, the user must explicitly "Reset" Month N+1.
- **Action**: Resetting deletes the Month N+1 bill record (and its associated payments/expenses), thereby removing the lock on Month N.
- **UI Implementation**: Triggered by a long-press on the tenant's identity section (name/room) followed by a confirmation alert in the `RentBillCard` component.

## 4. React Component Best Practices for List Items
In complex list views (like `RentBillCard` within `TakeRentScreen`):
- **Hook Placement**: All hooks (`useState`, `useMemo`, `useEffect`) **must** be declared at the very top of the functional component.
- **No Early Returns Before Hooks**: Never use conditional returns (e.g., `if (vacant) return null`) before any hook declarations, as list items may change state and trigger React hook count violations.
- **Skeleton Loaders**: Instead of a generic activity indicator, use the `RentBillSkeleton` component during data fetching to maintain layout consistency and provide a premium "shimmer" effect.
- **Immediate Feedback**: Use `setLoading(true)` immediately in navigation handlers (before async state updates) and apply strong haptics (`hapticsHeavy`) for high-latency actions like month switching.

## 5. Performance Optimization Patterns
To ensure smooth month-to-month navigation even with many rooms:
- **Bulk Fetching**: Use `inArray` to fetch units, tenants, and bills in single database calls instead of querying inside a loop.
- **Data Prefetching**: Fetch shared configuration (like `property` settings) once and pass it down to complex logic functions (like `applyPenaltiesLazily`) to eliminate redundant queries.
