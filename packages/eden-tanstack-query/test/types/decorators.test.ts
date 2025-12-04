/**
 * Decorator type tests for Eden TanStack Query
 *
 * These tests verify that decorator types correctly add queryOptions,
 * mutationOptions, etc. to routes based on HTTP method.
 */
import { Elysia, t } from "elysia"

import type {
	DecoratedRouteMethods,
	DecorateInfiniteQueryProcedure,
	DecorateMutationProcedure,
	DecorateQueryProcedure,
	DecorateRoute,
	EdenMutationKey,
	EdenOptionsProxy,
	EdenQueryKey,
	ExtractCursorType,
	ExtractRouteDef,
	HasCursorInput,
} from "../../src/types/decorators"
import type { ExtractRoutes } from "../../src/types/infer"

// ============================================================================
// Test App Setup
// ============================================================================

const app = new Elysia()
	// GET route with path params
	.get("/users/:id", ({ params }) => ({
		id: params.id,
		name: "Test User",
		email: "test@example.com",
	}))
	// GET route with query params (for list/pagination)
	.get(
		"/users",
		({ query }) => ({
			items: [{ id: "1", name: "User", email: "user@example.com" }],
			nextCursor: query.cursor ? String(Number(query.cursor) + 10) : null,
		}),
		{
			query: t.Object({
				search: t.Optional(t.String()),
				limit: t.Optional(t.Number()),
				cursor: t.Optional(t.String()),
			}),
		},
	)
	// POST route with body
	.post(
		"/users",
		({ body }) => ({
			id: "new-id",
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
	// PUT route
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
	// DELETE route
	.delete("/users/:id", ({ params }) => ({
		deleted: true,
		id: params.id,
	}))

type App = typeof app
type Routes = ExtractRoutes<App>

// ============================================================================
// Query Key Types Tests
// ============================================================================

describe("Query Key Types", () => {
	test("EdenQueryKey has correct structure", () => {
		type Key = EdenQueryKey
		type IsArray = Key extends unknown[] ? true : false
		const isArray: IsArray = true
		expect(isArray).toBe(true)

		// First element should be path array
		type FirstElement = Key[0]
		type IsPathArray = FirstElement extends string[] ? true : false
		const isPathArray: IsPathArray = true
		expect(isPathArray).toBe(true)
	})

	test("EdenMutationKey has correct structure", () => {
		type Key = EdenMutationKey
		type IsArray = Key extends [string[]] ? true : false
		const isArray: IsArray = true
		expect(isArray).toBe(true)
	})
})

// ============================================================================
// DecorateQueryProcedure Tests
// ============================================================================

describe("DecorateQueryProcedure", () => {
	// Create a test definition
	type TestDef = {
		input: { id: string }
		output: { id: string; name: string }
		error: { message: string }
	}

	type Decorated = DecorateQueryProcedure<TestDef>

	test("has queryOptions method", () => {
		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		const hasQueryOptions: HasQueryOptions = true
		expect(hasQueryOptions).toBe(true)
	})

	test("has queryKey method", () => {
		type HasQueryKey = "queryKey" extends keyof Decorated ? true : false
		const hasQueryKey: HasQueryKey = true
		expect(hasQueryKey).toBe(true)
	})

	test("has queryFilter method", () => {
		type HasQueryFilter = "queryFilter" extends keyof Decorated ? true : false
		const hasQueryFilter: HasQueryFilter = true
		expect(hasQueryFilter).toBe(true)
	})

	test("exposes ~types for inference", () => {
		type HasTypes = "~types" extends keyof Decorated ? true : false
		const hasTypes: HasTypes = true
		expect(hasTypes).toBe(true)

		type Types = Decorated["~types"]
		type InputMatches = Types["input"] extends { id: string } ? true : false
		type OutputMatches = Types["output"] extends { id: string; name: string }
			? true
			: false

		const inputMatches: InputMatches = true
		const outputMatches: OutputMatches = true

		expect(inputMatches).toBe(true)
		expect(outputMatches).toBe(true)
	})
})

// ============================================================================
// DecorateMutationProcedure Tests
// ============================================================================

describe("DecorateMutationProcedure", () => {
	type TestDef = {
		input: { name: string; email: string }
		output: { id: string; name: string; email: string }
		error: { message: string }
	}

	type Decorated = DecorateMutationProcedure<TestDef>

	test("has mutationOptions method", () => {
		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("has mutationKey method", () => {
		type HasMutationKey = "mutationKey" extends keyof Decorated ? true : false
		const hasMutationKey: HasMutationKey = true
		expect(hasMutationKey).toBe(true)
	})

	test("does NOT have queryOptions", () => {
		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		const hasQueryOptions: HasQueryOptions = false
		expect(hasQueryOptions).toBe(false)
	})

	test("exposes ~types for inference", () => {
		type Types = Decorated["~types"]
		type InputMatches = Types["input"] extends { name: string; email: string }
			? true
			: false
		type OutputMatches = Types["output"] extends {
			id: string
			name: string
			email: string
		}
			? true
			: false

		const inputMatches: InputMatches = true
		const outputMatches: OutputMatches = true

		expect(inputMatches).toBe(true)
		expect(outputMatches).toBe(true)
	})
})

// ============================================================================
// DecorateInfiniteQueryProcedure Tests
// ============================================================================

describe("DecorateInfiniteQueryProcedure", () => {
	type TestDef = {
		input: { limit: number; cursor?: string }
		output: { items: { id: string }[]; nextCursor: string | null }
		error: { message: string }
	}

	type Decorated = DecorateInfiniteQueryProcedure<TestDef>

	test("has infiniteQueryOptions method", () => {
		type HasInfiniteQueryOptions =
			"infiniteQueryOptions" extends keyof Decorated ? true : false
		const hasInfiniteQueryOptions: HasInfiniteQueryOptions = true
		expect(hasInfiniteQueryOptions).toBe(true)
	})

	test("has infiniteQueryKey method", () => {
		type HasInfiniteQueryKey = "infiniteQueryKey" extends keyof Decorated
			? true
			: false
		const hasInfiniteQueryKey: HasInfiniteQueryKey = true
		expect(hasInfiniteQueryKey).toBe(true)
	})

	test("has infiniteQueryFilter method", () => {
		type HasInfiniteQueryFilter = "infiniteQueryFilter" extends keyof Decorated
			? true
			: false
		const hasInfiniteQueryFilter: HasInfiniteQueryFilter = true
		expect(hasInfiniteQueryFilter).toBe(true)
	})
})

// ============================================================================
// Cursor Type Extraction Tests
// ============================================================================

describe("Cursor Type Extraction", () => {
	test("ExtractCursorType extracts cursor from input", () => {
		type Input = { limit: number; cursor?: string }
		type Cursor = ExtractCursorType<Input>
		type IsString = Cursor extends string | undefined ? true : false
		const isString: IsString = true
		expect(isString).toBe(true)
	})

	test("HasCursorInput detects cursor input", () => {
		type WithCursor = { cursor?: string }
		type WithoutCursor = { id: string }

		type HasCursor = HasCursorInput<WithCursor>
		type NoCursor = HasCursorInput<WithoutCursor>

		const hasCursor: HasCursor = true
		const noCursor: NoCursor = false

		expect(hasCursor).toBe(true)
		expect(noCursor).toBe(false)
	})
})

// ============================================================================
// DecorateRoute Tests (HTTP method-based decoration)
// ============================================================================

describe("DecorateRoute", () => {
	// Elysia ~Routes structure: { users: { ":id": { get: ... }, get: ..., post: ... } }
	type UserIdRoute = Routes["users"][":id"]["get"]
	type CreateUserRoute = Routes["users"]["post"]

	test("GET route decorated as query procedure", () => {
		type Decorated = DecorateRoute<UserIdRoute, "get">

		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		type HasQueryKey = "queryKey" extends keyof Decorated ? true : false
		type HasQueryFilter = "queryFilter" extends keyof Decorated ? true : false

		const hasQueryOptions: HasQueryOptions = true
		const hasQueryKey: HasQueryKey = true
		const hasQueryFilter: HasQueryFilter = true

		expect(hasQueryOptions).toBe(true)
		expect(hasQueryKey).toBe(true)
		expect(hasQueryFilter).toBe(true)
	})

	test("POST route decorated as mutation procedure", () => {
		type Decorated = DecorateRoute<CreateUserRoute, "post">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		type HasMutationKey = "mutationKey" extends keyof Decorated ? true : false

		const hasMutationOptions: HasMutationOptions = true
		const hasMutationKey: HasMutationKey = true

		expect(hasMutationOptions).toBe(true)
		expect(hasMutationKey).toBe(true)
	})

	test("PUT route decorated as mutation procedure", () => {
		type PutRoute = Routes["users"][":id"]["put"]
		type Decorated = DecorateRoute<PutRoute, "put">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("DELETE route decorated as mutation procedure", () => {
		type DeleteRoute = Routes["users"][":id"]["delete"]
		type Decorated = DecorateRoute<DeleteRoute, "delete">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})
})

// ============================================================================
// DecoratedRouteMethods Tests
// ============================================================================

describe("DecoratedRouteMethods", () => {
	test("decorates all methods of a route", () => {
		// Elysia ~Routes structure: { users: { ":id": { get: ..., put: ..., delete: ... } } }
		type UserIdMethods = Routes["users"][":id"]
		type Decorated = DecoratedRouteMethods<UserIdMethods>

		// GET should have queryOptions
		type GetHasQueryOptions = "queryOptions" extends keyof Decorated["get"]
			? true
			: false
		const getHasQueryOptions: GetHasQueryOptions = true
		expect(getHasQueryOptions).toBe(true)

		// PUT should have mutationOptions
		type PutHasMutationOptions =
			"mutationOptions" extends keyof Decorated["put"] ? true : false
		const putHasMutationOptions: PutHasMutationOptions = true
		expect(putHasMutationOptions).toBe(true)

		// DELETE should have mutationOptions
		type DeleteHasMutationOptions =
			"mutationOptions" extends keyof Decorated["delete"] ? true : false
		const deleteHasMutationOptions: DeleteHasMutationOptions = true
		expect(deleteHasMutationOptions).toBe(true)
	})
})

// ============================================================================
// ExtractRouteDef Tests
// ============================================================================

describe("ExtractRouteDef", () => {
	test("extracts definition from GET route", () => {
		type UserIdRoute = Routes["users"][":id"]["get"]
		type Def = ExtractRouteDef<UserIdRoute, "get">

		// For GET routes, input is only query params (path params passed via proxy callable)
		// UserIdRoute has no query params, so input should be empty
		// biome-ignore lint/complexity/noBannedTypes: {} check is intentional for empty object test
		type InputIsEmpty = {} extends Def["input"] ? true : false
		const inputIsEmpty: InputIsEmpty = true
		expect(inputIsEmpty).toBe(true)

		// Output should have id, name, email
		type OutputHasId = Def["output"] extends { id: string } ? true : false
		type OutputHasName = Def["output"] extends { name: string } ? true : false
		type OutputHasEmail = Def["output"] extends { email: string } ? true : false

		const outputHasId: OutputHasId = true
		const outputHasName: OutputHasName = true
		const outputHasEmail: OutputHasEmail = true

		expect(outputHasId).toBe(true)
		expect(outputHasName).toBe(true)
		expect(outputHasEmail).toBe(true)
	})

	test("extracts definition from POST route", () => {
		type CreateUserRoute = Routes["users"]["post"]
		type Def = ExtractRouteDef<CreateUserRoute, "post">

		// Input should be body (name, email)
		type InputHasName = Def["input"] extends { name: string } ? true : false
		type InputHasEmail = Def["input"] extends { email: string } ? true : false

		const inputHasName: InputHasName = true
		const inputHasEmail: InputHasEmail = true

		expect(inputHasName).toBe(true)
		expect(inputHasEmail).toBe(true)
	})
})

// ============================================================================
// EdenOptionsProxy Tests
// ============================================================================

describe("EdenOptionsProxy", () => {
	type Proxy = EdenOptionsProxy<App>

	test("has route segments as keys", () => {
		// EdenOptionsProxy uses nested object structure, not full paths
		// e.g., proxy.users instead of proxy["/users"]
		type HasUsers = "users" extends keyof Proxy ? true : false

		const hasUsers: HasUsers = true

		expect(hasUsers).toBe(true)
	})

	test("route segments have HTTP methods or nested routes", () => {
		type UsersRoute = Proxy["users"]
		type HasGet = "get" extends keyof UsersRoute ? true : false
		type HasPost = "post" extends keyof UsersRoute ? true : false

		const hasGet: HasGet = true
		const hasPost: HasPost = true

		expect(hasGet).toBe(true)
		expect(hasPost).toBe(true)
	})

	test("GET method has queryOptions", () => {
		type UsersGet = Proxy["users"]["get"]
		type HasQueryOptions = "queryOptions" extends keyof UsersGet ? true : false

		const hasQueryOptions: HasQueryOptions = true
		expect(hasQueryOptions).toBe(true)
	})

	test("POST method has mutationOptions", () => {
		type UsersPost = Proxy["users"]["post"]
		type HasMutationOptions = "mutationOptions" extends keyof UsersPost
			? true
			: false

		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("path params routes are callable", () => {
		// For routes with path params, the proxy is callable
		// e.g., proxy.users({ id: '1' }).get.queryOptions()
		type UsersCallable = Proxy["users"] extends (params: {
			id: string | number
		}) => unknown
			? true
			: false
		const usersCallable: UsersCallable = true
		expect(usersCallable).toBe(true)
	})
})

// ============================================================================
// Type Inference via ~types Tests
// ============================================================================

describe("Type Inference via ~types", () => {
	type TestDef = {
		input: { id: string }
		output: { name: string }
		error: { message: string }
	}

	type QueryProc = DecorateQueryProcedure<TestDef>
	type MutationProc = DecorateMutationProcedure<TestDef>

	test("~types.input extracts input type from query procedure", () => {
		type Input = QueryProc["~types"]["input"]
		type IsCorrect = Input extends { id: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types.output extracts output type from query procedure", () => {
		type Output = QueryProc["~types"]["output"]
		type IsCorrect = Output extends { name: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types.error extracts error type from query procedure", () => {
		type Error = QueryProc["~types"]["error"]
		type IsCorrect = Error extends { message: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types works with mutation procedures too", () => {
		type Input = MutationProc["~types"]["input"]
		type Output = MutationProc["~types"]["output"]

		type InputCorrect = Input extends { id: string } ? true : false
		type OutputCorrect = Output extends { name: string } ? true : false

		const inputCorrect: InputCorrect = true
		const outputCorrect: OutputCorrect = true

		expect(inputCorrect).toBe(true)
		expect(outputCorrect).toBe(true)
	})
})

// ============================================================================
// EdenMutationFunction Tests
// ============================================================================

describe("EdenMutationFunction", () => {
	test("accepts required input", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ result: string },
			{ name: string }
		>

		// Should require input
		type InputRequired = Parameters<MutFn>[0] extends { name: string }
			? true
			: false
		const inputRequired: InputRequired = true
		expect(inputRequired).toBe(true)
	})

	test("allows optional input when empty", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ result: string },
			// biome-ignore lint/complexity/noBannedTypes: Testing empty input
			{}
		>

		// Should allow void (no args) due to EmptyToVoid
		// biome-ignore lint/suspicious/noConfusingVoidType: Testing void in EmptyToVoid
		type AllowsVoid = void extends Parameters<MutFn>[0] ? true : false
		const allowsVoid: AllowsVoid = true
		expect(allowsVoid).toBe(true)
	})

	test("returns Promise of output", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ id: string; name: string },
			{ name: string }
		>

		type Returns = ReturnType<MutFn>
		type IsPromise =
			Returns extends Promise<{ id: string; name: string }> ? true : false
		const isPromise: IsPromise = true
		expect(isPromise).toBe(true)
	})
})

// ============================================================================
// RouteParamsInput Tests
// ============================================================================

describe("RouteParamsInput", () => {
	test("extracts param names from path param keys", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
			":slug": unknown
		}>

		type HasId = "id" extends keyof Input ? true : false
		type HasSlug = "slug" extends keyof Input ? true : false

		const hasId: HasId = true
		const hasSlug: HasSlug = true

		expect(hasId).toBe(true)
		expect(hasSlug).toBe(true)
	})

	test("param values are string | number", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
		}>

		type IdType = Input["id"]
		type IsStringOrNumber = IdType extends string | number ? true : false
		const isStringOrNumber: IsStringOrNumber = true
		expect(isStringOrNumber).toBe(true)
	})

	test("ignores non-param keys", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
			get: unknown
			post: unknown
		}>

		// Only :id should be extracted (without colon)
		type HasId = "id" extends keyof Input ? true : false
		type HasGet = "get" extends keyof Input ? true : false
		type HasPost = "post" extends keyof Input ? true : false

		const hasId: HasId = true
		const hasGet: HasGet = false
		const hasPost: HasPost = false

		expect(hasId).toBe(true)
		expect(hasGet).toBe(false)
		expect(hasPost).toBe(false)
	})
})

// ============================================================================
// inferInput / inferOutput / inferError Tests
// ============================================================================

describe("inferInput / inferOutput / inferError", () => {
	// These utilities are already tested indirectly via ~types tests above
	// Testing they exist and have correct structure

	test("inferInput type exists", () => {
		// Test via ~types which is the internal mechanism
		type TestDef = { input: { id: string }; output: unknown; error: unknown }
		type QueryProc = DecorateQueryProcedure<TestDef>
		type Input = QueryProc["~types"]["input"]

		type Check = Input extends { id: string } ? true : false
		const check: Check = true
		expect(check).toBe(true)
	})

	test("inferOutput type exists", () => {
		type TestDef = { input: unknown; output: { name: string }; error: unknown }
		type QueryProc = DecorateQueryProcedure<TestDef>
		type Output = QueryProc["~types"]["output"]

		type Check = Output extends { name: string } ? true : false
		const check: Check = true
		expect(check).toBe(true)
	})

	test("inferError type exists", () => {
		type TestDef = { input: unknown; output: unknown; error: { code: number } }
		type QueryProc = DecorateQueryProcedure<TestDef>
		type Err = QueryProc["~types"]["error"]

		type Check = Err extends { code: number } ? true : false
		const check: Check = true
		expect(check).toBe(true)
	})
})

// ============================================================================
// EdenQueryBaseOptions Tests
// ============================================================================

describe("EdenQueryBaseOptions", () => {
	test("eden property is optional", () => {
		type Opts = import("../../src/types/decorators").EdenQueryBaseOptions

		// eden should be optional
		type EdenIsOptional = undefined extends Opts["eden"] ? true : false
		const edenIsOptional: EdenIsOptional = true
		expect(edenIsOptional).toBe(true)
	})
})

// ============================================================================
// EdenQueryOptionsResult Tests
// ============================================================================

describe("EdenQueryOptionsResult", () => {
	test("has eden.path property", () => {
		type Result = import("../../src/types/decorators").EdenQueryOptionsResult

		type HasEden = "eden" extends keyof Result ? true : false
		type HasPath = Result["eden"] extends { path: string } ? true : false

		const hasEden: HasEden = true
		const hasPath: HasPath = true

		expect(hasEden).toBe(true)
		expect(hasPath).toBe(true)
	})
})
