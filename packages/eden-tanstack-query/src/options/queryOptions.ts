/**
 * Query options factory for TanStack Query integration.
 * Creates type-safe query options from Eden route definitions.
 *
 * IMPORTANT: The output types are designed to be compatible with ALL TanStack Query
 * functions including useQuery, useSuspenseQuery, ensureQueryData, prefetchQuery, etc.
 * We achieve this by returning the exact same type structure that TanStack Query's
 * own queryOptions() helper returns.
 */
import type { QueryFunction, QueryKey, SkipToken } from "@tanstack/react-query"
import { queryOptions, skipToken } from "@tanstack/react-query"

import type { EdenQueryKey } from "../keys/types"

import { getQueryKey, type PositionedParam } from "../keys/queryKey"

// ============================================================================
// Input Types
// ============================================================================

/** Base options for Eden requests */
interface EdenQueryBaseOptions {
	eden?: {
		/** Abort request on component unmount */
		abortOnUnmount?: boolean
	}
}

/** Result metadata added to query options (kept for backward compatibility) */
export interface EdenQueryOptionsResult {
	eden: {
		path: string
	}
}

/**
 * Arguments for creating query options.
 */
export interface EdenQueryOptionsArgs<TInput, TOutput> {
	/** Path segments (e.g., ['api', 'users', 'get']) */
	path: string[]
	/** Input parameters or skipToken */
	input: TInput | SkipToken
	/** Path parameters (e.g., { id: '1' } for /users/:id) */
	pathParams?: PositionedParam[]
	/** Function to fetch data */
	fetch: (input: TInput, signal?: AbortSignal) => Promise<TOutput>
}

// ============================================================================
// Input Option Types (what users can pass in)
// ============================================================================

/** Options users can pass when creating query options */
interface EdenQueryOptionsInput<TQueryFnData, TData, TError>
	extends EdenQueryBaseOptions {
	/** Whether to enable the query */
	enabled?: boolean
	/** How long until data is considered stale (ms) */
	staleTime?: number
	/** How long to keep data in cache after it's unused (ms) */
	gcTime?: number
	/** Initial data to use while loading */
	initialData?: TQueryFnData | (() => TQueryFnData)
	/** Placeholder data to use while loading */
	placeholderData?: TData | ((previousData: TData | undefined) => TData)
	/** Whether to refetch on mount */
	refetchOnMount?: boolean | "always"
	/** Whether to refetch on window focus */
	refetchOnWindowFocus?: boolean | "always"
	/** Whether to refetch on reconnect */
	refetchOnReconnect?: boolean | "always"
	/** Refetch interval in ms */
	refetchInterval?: number | false
	/** Whether to retry failed queries */
	retry?: boolean | number | ((failureCount: number, error: TError) => boolean)
	/** Delay between retries in ms */
	retryDelay?: number | ((failureCount: number, error: TError) => number)
	/** Network mode */
	networkMode?: "online" | "always" | "offlineFirst"
	/** Select/transform data */
	select?: (data: TQueryFnData) => TData
	/** Meta data */
	meta?: Record<string, unknown>
}

// ============================================================================
// Output Option Types
// ============================================================================

/**
 * Output type that matches what TanStack Query's queryOptions() returns.
 * This is compatible with useQuery, useSuspenseQuery, ensureQueryData, etc.
 *
 * We use ReturnType<typeof queryOptions> pattern to ensure 100% compatibility.
 */
type EdenQueryOptionsOutput<TQueryFnData, TError> = ReturnType<
	typeof queryOptions<TQueryFnData, TError, TQueryFnData, QueryKey>
>

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create query options compatible with all TanStack Query functions.
 *
 * @example
 * ```typescript
 * // With useQuery
 * const { data } = useQuery(eden.api.users.get.queryOptions())
 *
 * // With useSuspenseQuery
 * const { data } = useSuspenseQuery(eden.api.users.get.queryOptions())
 *
 * // With ensureQueryData
 * await queryClient.ensureQueryData(eden.api.users.get.queryOptions())
 *
 * // With prefetchQuery
 * await queryClient.prefetchQuery(eden.api.users.get.queryOptions())
 * ```
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		opts?: EdenQueryOptionsInput<TOutput, TOutput, TError>
	},
): EdenQueryOptionsOutput<TOutput, TError> {
	const { path, input, pathParams, fetch: fetchFn, opts } = args

	const inputIsSkipToken = input === skipToken

	const queryKey = getQueryKey({
		path,
		input: inputIsSkipToken ? undefined : input,
		pathParams,
		type: "query",
	})

	// Create the query function
	const queryFn: QueryFunction<TOutput, EdenQueryKey> = async (context) => {
		const actualInput = input as TInput

		// Pass abort signal from query context if eden.abortOnUnmount is true
		const signal = opts?.eden?.abortOnUnmount ? context.signal : undefined

		const result = await fetchFn(actualInput, signal)
		return result
	}

	// Extract our custom eden options before passing to queryOptions
	const { eden: _edenOpts, ...tanstackOpts } = opts ?? {}

	// Use TanStack Query's queryOptions() to ensure 100% type compatibility
	// with all query functions (useQuery, useSuspenseQuery, ensureQueryData, etc.)
	//
	// We use 'as unknown as' to bypass strict type checking because:
	// 1. Eden's type inference doesn't perfectly align with TanStack Query's expected types
	// 2. The runtime behavior is correct - we're just helping TypeScript understand the types
	const options = {
		...tanstackOpts,
		queryKey,
		queryFn: inputIsSkipToken ? skipToken : queryFn,
	}

	return queryOptions(options as Parameters<typeof queryOptions>[0]) as unknown as EdenQueryOptionsOutput<TOutput, TError>
}
