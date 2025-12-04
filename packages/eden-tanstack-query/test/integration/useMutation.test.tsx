/**
 * Integration tests for useMutation with Eden TanStack Query
 *
 * Tests the full flow: useEden() -> mutationOptions() -> useMutation()
 * Verifies both runtime behavior and type inference
 */

import type { treaty } from "@elysiajs/eden"
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { Elysia, t } from "elysia"
import type { ReactNode } from "react"

import { createEdenTanStackQuery } from "../../src"

// ============================================================================
// Test App Setup
// ============================================================================

const app = new Elysia()
	.post(
		"/users",
		({ body }) => ({
			id: String(Date.now()),
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	.put(
		"/users/:id",
		({ params, body }) => ({
			id: params.id,
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	.delete("/users/:id", ({ params }) => ({
		deleted: true,
		id: params.id,
	}))

type App = typeof app

// ============================================================================
// Create typed hooks
// ============================================================================

const { EdenProvider, useEden } = createEdenTanStackQuery<App>()

// ============================================================================
// Mock Eden Client
// ============================================================================

function createMockClient() {
	const mockClient = {
		users: Object.assign(
			// Callable for path params: eden.users({ id: '1' })
			(params: { id: string }) => ({
				put: async (body: { name: string; email: string }) => ({
					data: { id: params.id, ...body },
					error: null,
				}),
				delete: async () => ({
					data: { deleted: true, id: params.id },
					error: null,
				}),
			}),
			// Direct methods
			{
				post: async (body: { name: string; email: string }) => ({
					data: { id: "new-123", ...body },
					error: null,
				}),
			},
		),
	}

	return mockClient as unknown as ReturnType<typeof treaty<App>>
}

// ============================================================================
// Test Wrapper
// ============================================================================

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: {
				retry: false,
			},
		},
	})
	const client = createMockClient()

	return {
		queryClient,
		client,
		Wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<EdenProvider client={client} queryClient={queryClient}>
					{children}
				</EdenProvider>
			</QueryClientProvider>
		),
	}
}

// ============================================================================
// Tests
// ============================================================================

describe("useMutation integration", () => {
	describe("basic mutation flow", () => {
		test("useMutation with eden.users.post.mutationOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users.post.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			// Initially idle
			expect(result.current.isIdle).toBe(true)

			// Trigger mutation
			result.current.mutate({ name: "John", email: "john@example.com" })

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Check data
			expect(result.current.data).toEqual({
				id: "new-123",
				name: "John",
				email: "john@example.com",
			})
		})

		test("useMutation with path params: eden.users({ id }).put.mutationOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users({ id: "42" }).put.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			// Trigger mutation
			result.current.mutate({ name: "Updated", email: "updated@example.com" })

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({
				id: "42",
				name: "Updated",
				email: "updated@example.com",
			})
		})

		test("useMutation with delete: eden.users({ id }).delete.mutationOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users({ id: "99" }).delete.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			// Trigger mutation - delete has no body, EmptyToVoid allows calling without args
			result.current.mutate()

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({
				deleted: true,
				id: "99",
			})
		})
	})

	describe("type inference", () => {
		test("data type is correctly inferred for post mutation", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const mutation = useMutation(eden.users.post.mutationOptions())

					// CRITICAL: Compile-time type check
					// If this fails, data would be wrong type
					if (mutation.data) {
						const _typeCheck: { id: string; name: string; email: string } =
							mutation.data
						void _typeCheck
					}

					return mutation
				},
				{ wrapper: Wrapper },
			)

			result.current.mutate({ name: "Test", email: "test@example.com" })

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data?.id).toBe("new-123")
		})

		test("variables type is correctly inferred", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const mutation = useMutation(eden.users.post.mutationOptions())

					// CRITICAL: Compile-time type check for variables
					if (mutation.variables) {
						const _typeCheck: { name: string; email: string } =
							mutation.variables
						void _typeCheck
					}

					return mutation
				},
				{ wrapper: Wrapper },
			)

			result.current.mutate({ name: "Test", email: "test@example.com" })

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.variables?.name).toBe("Test")
		})

		test("data type is not a function (catches () => never bug)", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const mutation = useMutation(eden.users.post.mutationOptions())

					// Type-level assertion: data should NOT be a function
					type DataType = typeof mutation.data
					type IsNotFunction = DataType extends (...args: unknown[]) => unknown
						? false
						: true

					const _isNotFunction: IsNotFunction = true
					void _isNotFunction

					return mutation
				},
				{ wrapper: Wrapper },
			)

			result.current.mutate({ name: "Test", email: "test@example.com" })

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Runtime verification
			expect(typeof result.current.data).not.toBe("function")
			expect(typeof result.current.data).toBe("object")
		})
	})

	describe("mutationOptions structure", () => {
		test("mutationOptions has correct mutationKey", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.users.post.mutationOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.mutationKey).toEqual([["users", "post"]])
		})

		test("mutationOptions has eden metadata", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.users.post.mutationOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.eden.path).toBe("users.post")
		})

		test("mutationOptions has mutationFn", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.users.post.mutationOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(typeof result.current.mutationFn).toBe("function")
		})
	})
})
