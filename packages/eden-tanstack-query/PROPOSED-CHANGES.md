# Proposed Changes for eden-tanstack-query

These are feature additions we've implemented on top of the upstream `eden-tanstack-query` package that we'd like to propose for upstream inclusion.

## 1. Path Parameters Support

### Problem

Eden Treaty supports path parameters (e.g., `/users/:id`), but the current TanStack Query integration doesn't properly track these in query keys. This means:

- Cache invalidation doesn't work correctly for routes with path params
- Query keys don't uniquely identify queries with different path param values

### Solution

Added `pathParams` support throughout the query key generation and options factories.

### Changes

#### `src/keys/types.ts`

Added `pathParams` to `EdenQueryKeyMeta`:

```typescript
export type EdenQueryKeyMeta<TInput = unknown> = {
  /** Path parameters (e.g., { id: '1' } for /users/:id) */
  pathParams?: Record<string, unknown>
  /** Input parameters for the query */
  input?: TInput
  /** Query type discriminator */
  type?: Exclude<QueryType, "any">
}
```

#### `src/keys/queryKey.ts`

- Added `PositionedParam` interface to track path params with their position:
  ```typescript
  export interface PositionedParam {
    pathIndex: number
    params: Record<string, unknown>
  }
  ```
- Added `pathParams` to `GetQueryKeyOptions`
- Added `flattenPathParams()` helper to merge positioned params
- Updated `getQueryKey()` to include `pathParams` in the query key metadata

#### `src/options/queryOptions.ts`

- Added `pathParams?: PositionedParam[]` to `EdenQueryOptionsArgs`
- Pass `pathParams` through to `getQueryKey()`

#### `src/options/infiniteQueryOptions.ts`

- Added `pathParams?: PositionedParam[]` to `EdenInfiniteQueryOptionsArgs`
- Pass `pathParams` through to `getQueryKey()`

#### `src/proxy/createOptionsProxy.ts`

- Changed `pathParams` type from `Record<string, unknown>[]` to `PositionedParam[]`
- Updated `navigateToEdenPath()` to use `pathIndex` for correct param application
- Updated all `getQueryKey()` calls to include `pathParams`
- Updated proxy `apply` handler to create `PositionedParam` with correct `pathIndex`

### Example Usage

```typescript
// Route: /api/users/:id
const eden = createEdenOptionsProxy({ client })

// Path params are now included in the query key
const options = eden.api.users({ id: '123' }).get.queryOptions()
// Query key: [['api', 'users', 'get'], { pathParams: { id: '123' } }]

// Cache invalidation works correctly
queryClient.invalidateQueries({
  queryKey: eden.api.users({ id: '123' }).get.queryKey()
})
```

---

## 2. AbortSignal Support (abortOnUnmount)

### Problem

TanStack Query provides an `AbortSignal` in the query context that can be used to cancel in-flight requests when a component unmounts. The current implementation doesn't expose this to the fetch function.

### Solution

Added an `eden.abortOnUnmount` option that, when `true`, passes the query context's `AbortSignal` to the fetch function.

### Changes

#### `src/options/queryOptions.ts`

```typescript
interface EdenQueryBaseOptions {
  eden?: {
    /** Abort request on component unmount */
    abortOnUnmount?: boolean
  }
}

// In queryFn implementation:
const signal = opts?.eden?.abortOnUnmount ? context.signal : undefined
const result = await fetchFn(actualInput, signal)
```

#### `src/options/infiniteQueryOptions.ts`

Same pattern applied to infinite queries.

### Example Usage

```typescript
const options = edenQueryOptions({
  path: ['api', 'users', 'get'],
  input: { id: '1' },
  fetch: async (input, signal) => {
    // signal is AbortSignal when abortOnUnmount is true
    const response = await fetch('/api/users', { signal })
    return response.json()
  },
  opts: {
    eden: {
      abortOnUnmount: true,
    },
  },
})
```

---

## Summary of File Changes

| File                                  | Change                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `src/keys/types.ts`                   | Added `pathParams` to `EdenQueryKeyMeta`                                |
| `src/keys/queryKey.ts`                | Added `PositionedParam`, `flattenPathParams()`, updated `getQueryKey()` |
| `src/options/queryOptions.ts`         | Added `pathParams`, `abortOnUnmount` support                            |
| `src/options/infiniteQueryOptions.ts` | Added `pathParams`, `abortOnUnmount` support                            |
| `src/proxy/createOptionsProxy.ts`     | Updated to use `PositionedParam`, pass `pathParams` everywhere          |
| `src/context.tsx`                     | Added `"use client"` directive                                          |
| `src/index.ts`                        | Export `PositionedParam` type                                           |

---

## Breaking Changes

None. All changes are additive and backward compatible.

---

## Testing

All existing tests pass. We've added tests for:

- Path params in query keys
- `abortOnUnmount` signal passing
- Query key uniqueness with different path params
