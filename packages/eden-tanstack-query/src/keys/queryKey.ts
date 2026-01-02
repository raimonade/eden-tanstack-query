import { skipToken } from "@tanstack/react-query"
import type { EdenMutationKey, EdenQueryKey, QueryType } from "./types"

/**
 * Helper to check if value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Dangerous keys that could cause prototype pollution
 */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Sanitizes input to prevent prototype pollution attacks.
 * Removes dangerous keys like __proto__, constructor, prototype.
 */
function sanitizeInput(value: unknown): unknown {
	if (!isObject(value)) {
		return Array.isArray(value) ? value.map(sanitizeInput) : value
	}

	const result: Record<string, unknown> = {}
	for (const key of Object.keys(value)) {
		if (!DANGEROUS_KEYS.has(key)) {
			result[key] = sanitizeInput(value[key])
		}
	}
	return result
}

/** Path param with its position in the path */
export interface PositionedParam {
	pathIndex: number
	params: Record<string, unknown>
}

/**
 * Options for generating a query key
 */
export interface GetQueryKeyOptions {
	/** Path segments (e.g., ['api', 'users', 'get']) */
	path: string[]
	/** Optional input parameters (query string) */
	input?: unknown
	/** Query type: 'query', 'infinite', or 'any' */
	type?: QueryType
	/** Path parameters (e.g., { id: '1' } for /users/:id) */
	pathParams?: PositionedParam[]
}

/**
 * Flatten path params into a single object for the query key.
 * Merges all path param objects in order.
 */
function flattenPathParams(
	pathParams: PositionedParam[] | undefined,
): Record<string, unknown> | undefined {
	if (!pathParams || pathParams.length === 0) {
		return
	}

	const result: Record<string, unknown> = {}
	for (const { params } of pathParams) {
		for (const [key, value] of Object.entries(params)) {
			if (!DANGEROUS_KEYS.has(key)) {
				result[key] = value
			}
		}
	}

	return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Generates a query key for TanStack Query.
 *
 * The key structure is: [path[], metadata?]
 * - path: Array of route path segments
 * - metadata: Optional object with input, pathParams, and type
 *
 * @example
 * // Path only
 * getQueryKey({ path: ['users', 'get'] })
 * // => [['users', 'get']]
 *
 * // With input
 * getQueryKey({ path: ['users', 'get'], input: { id: '1' } })
 * // => [['users', 'get'], { input: { id: '1' } }]
 *
 * // With path params
 * getQueryKey({ path: ['users', 'get'], pathParams: [{ pathIndex: 0, params: { id: '1' } }] })
 * // => [['users', 'get'], { pathParams: { id: '1' } }]
 *
 * // Infinite query
 * getQueryKey({ path: ['posts', 'list'], input: { limit: 10 }, type: 'infinite' })
 * // => [['posts', 'list'], { input: { limit: 10 }, type: 'infinite' }]
 */
export function getQueryKey(opts: GetQueryKeyOptions): EdenQueryKey {
	const { path, type, pathParams } = opts

	// Flatten path params for inclusion in key
	const flatPathParams = flattenPathParams(pathParams)

	// Handle skipToken - return key without input but with path params if present
	if (opts.input === skipToken) {
		if (flatPathParams) {
			return [path, { pathParams: flatPathParams }]
		}
		return [path]
	}

	// Sanitize input to prevent prototype pollution
	const input = sanitizeInput(opts.input)

	// For infinite queries, strip cursor/direction from input
	if (type === "infinite" && isObject(input)) {
		const inputObj = input
		if ("cursor" in inputObj || "direction" in inputObj) {
			const { cursor: _, direction: __, ...rest } = inputObj
			const meta: Record<string, unknown> = {
				type: "infinite",
			}
			if (Object.keys(rest).length > 0) {
				meta.input = rest
			}
			if (flatPathParams) {
				meta.pathParams = flatPathParams
			}
			return [path, meta]
		}
	}

	// Build metadata object
	const meta: Record<string, unknown> = {}

	if (flatPathParams) {
		meta.pathParams = flatPathParams
	}

	if (input !== undefined) {
		meta.input = input
	}

	if (type && type !== "any") {
		meta.type = type
	}

	// Return with metadata if any, otherwise just path
	return Object.keys(meta).length > 0 ? [path, meta] : [path]
}

/**
 * Options for generating a mutation key
 */
export interface GetMutationKeyOptions {
	/** Path segments (e.g., ['api', 'users', 'post']) */
	path: string[]
}

/**
 * Generates a mutation key for TanStack Query.
 *
 * Mutation keys are simpler than query keys - just the path.
 *
 * @example
 * getMutationKey({ path: ['users', 'post'] })
 * // => [['users', 'post']]
 */
export function getMutationKey(opts: GetMutationKeyOptions): EdenMutationKey {
	return [opts.path]
}
