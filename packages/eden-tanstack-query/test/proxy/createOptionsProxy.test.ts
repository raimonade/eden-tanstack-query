import { QueryClient } from "@tanstack/react-query"
import { createEdenOptionsProxy } from "../../src/proxy/createOptionsProxy"

describe("createEdenOptionsProxy", () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})

	// Create mock Eden client that works with the proxy
	// Uses Object.assign to make an object both callable and have properties
	function createSimpleMockClient() {
		const usersById: Record<string, unknown> = {}

		const client = {
			api: {
				hello: {
					get: async () => ({ data: "world", error: null }),
				},
				users: Object.assign(
					(params: { id: string }) => {
						if (!usersById[params.id]) {
							usersById[params.id] = {
								get: async () => ({
									data: { id: params.id, name: "User" },
									error: null,
								}),
								put: async (body: unknown) => ({
									data: { id: params.id, ...(body as object) },
									error: null,
								}),
								delete: async () => ({
									data: { success: true },
									error: null,
								}),
								posts: {
									get: async () => ({
										data: [{ id: "post1", userId: params.id }],
										error: null,
									}),
								},
							}
						}
						return usersById[params.id]
					},
					{
						get: async () => ({
							data: [{ id: "1", name: "John" }],
							error: null,
						}),
						post: async (body: unknown) => ({
							data: { id: "1", ...(body as object) },
							error: null,
						}),
					},
				),
				posts: {
					get: async () => ({
						data: {
							items: [{ id: "1", title: "Post 1" }],
							nextCursor: "cursor2",
						},
						error: null,
					}),
				},
			},
		}

		return client
	}

	describe("path building", () => {
		test("builds correct path for simple routes", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.hello.get.queryOptions()

			expect(options.eden.path).toBe("api.hello.get")
			expect(options.queryKey[0]).toEqual(["api", "hello", "get"])
		})

		test("builds correct path for nested routes", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.get.queryOptions()

			expect(options.eden.path).toBe("api.users.get")
			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		})
	})

	describe("query key generation", () => {
		test("generates query key without input", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const key = eden.api.hello.get.queryKey()

			expect(key[0]).toEqual(["api", "hello", "get"])
			expect(key[1]).toEqual({ type: "query" })
		})

		test("generates query key with input", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const key = eden.api.users.get.queryKey({ search: "test" })

			expect(key[0]).toEqual(["api", "users", "get"])
			expect(key[1]).toEqual({ input: { search: "test" }, type: "query" })
		})

		test("generates infinite query key", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const key = eden.api.posts.get.infiniteQueryKey({ limit: 10 })

			expect(key[0]).toEqual(["api", "posts", "get"])
			expect(key[1]).toEqual({ input: { limit: 10 }, type: "infinite" })
		})
	})

	describe("mutation key generation", () => {
		test("generates mutation key", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const key = eden.api.users.post.mutationKey()

			expect(key).toEqual([["api", "users", "post"]])
		})
	})

	describe("query filter generation", () => {
		test("generates query filter without input", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const filter = eden.api.users.get.queryFilter()

			expect(filter.queryKey[0]).toEqual(["api", "users", "get"])
		})

		test("generates query filter with input and additional filters", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const filter = eden.api.users.get.queryFilter(
				{ search: "test" },
				{ stale: true },
			)

			expect(filter.queryKey[0]).toEqual(["api", "users", "get"])
			expect(filter.stale).toBe(true)
		})
	})

	describe("query options", () => {
		test("GET method returns queryOptions", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const procedure = eden.api.hello.get

			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect(typeof procedure.queryFilter).toBe("function")
		})

		test("queryOptions creates valid options", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.get.queryOptions({ status: "active" })

			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
			expect(options.queryKey[1]).toEqual({
				input: { status: "active" },
				type: "query",
			})
			expect(typeof options.queryFn).toBe("function")
			expect(options.eden.path).toBe("api.users.get")
		})

		test("queryOptions passes through additional options", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.get.queryOptions(undefined, {
				staleTime: 5000,
				refetchOnWindowFocus: false,
			})

			expect(options.staleTime).toBe(5000)
			expect(options.refetchOnWindowFocus).toBe(false)
		})
	})

	describe("mutation options", () => {
		test("POST method returns mutationOptions", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const procedure = eden.api.users.post

			expect(typeof procedure.mutationOptions).toBe("function")
			expect(typeof procedure.mutationKey).toBe("function")
		})

		test("mutationOptions creates valid options", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.post.mutationOptions()

			expect(options.mutationKey).toEqual([["api", "users", "post"]])
			expect(typeof options.mutationFn).toBe("function")
			expect(options.eden.path).toBe("api.users.post")
		})

		test("mutationOptions passes through additional options", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const onSuccess = () => {}
			const options = eden.api.users.post.mutationOptions({
				onSuccess,
			})

			expect(options.onSuccess).toBe(onSuccess)
		})
	})

	describe("HTTP method routing", () => {
		test("GET creates query procedure", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const procedure = eden.api.users.get

			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect(typeof procedure.infiniteQueryOptions).toBe("function")
			expect(procedure.mutationOptions).toBeUndefined()
		})

		test("POST creates mutation procedure", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const procedure = eden.api.users.post

			expect(typeof procedure.mutationOptions).toBe("function")
			expect(typeof procedure.mutationKey).toBe("function")
			expect(procedure.queryOptions).toBeUndefined()
		})
	})

	describe("data fetching", () => {
		test("fetches data via queryOptions", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.hello.get.queryOptions()
			const result = await queryClient.fetchQuery(options)

			expect(result).toBe("world")
		})

		test("fetches data with query params", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.get.queryOptions({ search: "test" })
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual([{ id: "1", name: "John" }])
		})

		test("mutates data via mutationOptions", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users.post.mutationOptions()
			const result = await options.mutationFn({ name: "Jane" })

			expect(result).toEqual({ id: "1", name: "Jane" })
		})
	})

	describe("path parameters", () => {
		test("handles path params via function call", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			// Path: /api/users/:id
			const options = eden.api.users({ id: "123" }).get.queryOptions()

			expect(options.eden.path).toBe("api.users.get")
			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		})

		test("fetches data with path params", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users({ id: "123" }).get.queryOptions()
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual({ id: "123", name: "User" })
		})

		test("handles nested path params", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			// Path: /api/users/:id/posts
			const options = eden.api.users({ id: "123" }).posts.get.queryOptions()
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual([{ id: "post1", userId: "123" }])
		})

		test("mutations work with path params", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users({ id: "123" }).put.mutationOptions()
			const result = await options.mutationFn({ name: "Updated" })

			expect(result).toEqual({ id: "123", name: "Updated" })
		})

		test("DELETE works with path params", async () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.users({ id: "123" }).delete.mutationOptions()
			const result = await options.mutationFn(undefined)

			expect(result).toEqual({ success: true })
		})
	})

	describe("infinite query options", () => {
		test("creates infinite query options", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.posts.get.infiniteQueryOptions(
				{ limit: 10 },
				{
					getNextPageParam: (lastPage: { nextCursor?: string }) =>
						lastPage.nextCursor,
				},
			)

			expect(options.queryKey[0]).toEqual(["api", "posts", "get"])
			expect(options.eden.path).toBe("api.posts.get")
			expect(typeof options.queryFn).toBe("function")
			expect(typeof options.getNextPageParam).toBe("function")
		})

		test("infiniteQueryFilter generates correct filter", () => {
			const client = createSimpleMockClient()
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const filter = eden.api.posts.get.infiniteQueryFilter({ limit: 10 })

			expect(filter.queryKey[0]).toEqual(["api", "posts", "get"])
			expect(filter.queryKey[1]).toEqual({
				input: { limit: 10 },
				type: "infinite",
			})
		})
	})

	describe("error handling", () => {
		test("throws error from Eden response", async () => {
			const client = {
				api: {
					error: {
						get: async () => ({
							data: null,
							error: { status: 500, message: "Server Error" },
						}),
					},
				},
			}
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.error.get.queryOptions()

			await expect(queryClient.fetchQuery(options)).rejects.toEqual({
				status: 500,
				message: "Server Error",
			})
		})

		test("throws error from mutation", async () => {
			const client = {
				api: {
					error: {
						post: async () => ({
							data: null,
							error: { status: 400, message: "Bad Request" },
						}),
					},
				},
			}
			const eden = createEdenOptionsProxy({ client, queryClient }) as any

			const options = eden.api.error.post.mutationOptions()

			await expect(options.mutationFn({})).rejects.toEqual({
				status: 400,
				message: "Bad Request",
			})
		})
	})
})
