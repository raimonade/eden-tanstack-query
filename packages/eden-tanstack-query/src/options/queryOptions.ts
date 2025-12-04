/**
 * Query options factory for TanStack Query integration.
 * Creates type-safe query options from Eden route definitions.
 */
import type {
	DataTag,
	DefinedInitialDataOptions,
	QueryFunction,
	SkipToken,
	UndefinedInitialDataOptions,
	UnusedSkipTokenOptions,
} from "@tanstack/react-query"
import { skipToken } from "@tanstack/react-query"

import { getQueryKey } from "../keys/queryKey"
import type { EdenQueryKey } from "../keys/types"

// ============================================================================
// Input Types
// ============================================================================

/** Reserved options that are set by the library */
type ReservedOptions = "queryKey" | "queryFn" | "queryHashFn" | "queryHash"

/** Base options for Eden requests */
interface EdenQueryBaseOptions {
	eden?: {
		/** Abort request on component unmount */
		abortOnUnmount?: boolean
	}
}

/** Result metadata added to query options */
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
	/** Function to fetch data */
	fetch: (input: TInput, signal?: AbortSignal) => Promise<TOutput>
}

// ============================================================================
// Input Option Types
// ============================================================================

interface UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UndefinedInitialDataOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

interface DefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			DefinedInitialDataOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey
			>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

interface UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UnusedSkipTokenOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

// ============================================================================
// Output Option Types
// ============================================================================

interface UndefinedEdenQueryOptionsOut<TOutput, TError>
	extends UndefinedInitialDataOptions<TOutput, TError, TOutput, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

interface DefinedEdenQueryOptionsOut<TData, TError>
	extends DefinedInitialDataOptions<TData, TError, TData, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

interface UnusedSkipTokenEdenQueryOptionsOut<TOutput, TError>
	extends UnusedSkipTokenOptions<TOutput, TError, TOutput, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

// ============================================================================
// Union Types
// ============================================================================

type AnyEdenQueryOptionsIn<TQueryFnData, TData, TError> =
	| UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	| DefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	| UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>

type AnyEdenQueryOptionsOut<TOutput, TError> =
	| UndefinedEdenQueryOptionsOut<TOutput, TError>
	| DefinedEdenQueryOptionsOut<TOutput, TError>
	| UnusedSkipTokenEdenQueryOptionsOut<TOutput, TError>

// ============================================================================
// Function Overloads
// ============================================================================

/**
 * Create query options with defined initial data.
 * The returned data will never be undefined.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		opts: DefinedEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): DefinedEdenQueryOptionsOut<TOutput, TError>

/**
 * Create query options without skipToken.
 * The returned data can be undefined until loaded.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		input: TInput
		opts?: UnusedSkipTokenEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): UnusedSkipTokenEdenQueryOptionsOut<TOutput, TError>

/**
 * Create query options with skipToken support.
 * Use skipToken to conditionally disable the query.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		opts?: UndefinedEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): UndefinedEdenQueryOptionsOut<TOutput, TError>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates TanStack Query options for an Eden route.
 *
 * @example
 * ```typescript
 * const options = edenQueryOptions({
 *   path: ['api', 'users', 'get'],
 *   input: { id: '1' },
 *   fetch: async (input, signal) => {
 *     const response = await edenClient.api.users.get({ query: input, fetch: { signal } })
 *     return response.data
 *   },
 * })
 *
 * // Use with useQuery
 * const { data } = useQuery(options)
 *
 * // Or prefetch
 * await queryClient.prefetchQuery(options)
 * ```
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(args: {
	path: string[]
	input: TInput | SkipToken
	fetch: (input: TInput, signal?: AbortSignal) => Promise<TOutput>
	opts?: AnyEdenQueryOptionsIn<TOutput, TOutput, TError>
}): AnyEdenQueryOptionsOut<TOutput, TError> {
	const { path, input, fetch: fetchFn, opts } = args

	const inputIsSkipToken = input === skipToken

	const queryKey = getQueryKey({
		path,
		input: inputIsSkipToken ? undefined : input,
		type: "query",
	}) as DataTag<EdenQueryKey, TOutput, TError>

	const queryFn: QueryFunction<TOutput, EdenQueryKey> = async (context) => {
		const actualInput = input as TInput

		// Pass abort signal from query context
		// If eden.abortOnUnmount is true, use the signal
		const signal = opts?.eden?.abortOnUnmount ? context.signal : undefined

		const result = await fetchFn(actualInput, signal)
		return result
	}

	// Build result object manually to avoid TanStack's queryOptions overload issues
	const result = {
		...opts,
		queryKey,
		queryFn: inputIsSkipToken ? skipToken : queryFn,
		eden: {
			path: path.join("."),
		},
	}

	return result as AnyEdenQueryOptionsOut<TOutput, TError>
}
