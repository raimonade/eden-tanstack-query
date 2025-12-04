/**
 * Type inference tests for Eden TanStack Query
 *
 * These tests verify that types are correctly extracted from Elysia routes.
 * Uses bun:test with compile-time type checking.
 */
import { Elysia, t } from "elysia"

import type {
	EdenFetchError,
	ExtractPathParams,
	ExtractRoutes,
	HttpMutationMethod,
	HttpQueryMethod,
	InferRouteBody,
	InferRouteError,
	InferRouteInput,
	InferRouteOutput,
	InferRouteParams,
	InferRouteQuery,
	IsMutationMethod,
	IsQueryMethod,
	PathParamsToObject,
} from "../../src/types/infer"
import type { IsNever } from "../../src/utils/types"

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
	// GET route with query params
	.get(
		"/users",
		({ query }) => {
			return [
				{ id: "1", name: query.search ?? "User", email: "user@example.com" },
			]
		},
		{
			query: t.Object({
				search: t.Optional(t.String()),
				limit: t.Optional(t.Number()),
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
	// PUT route with path params and body
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

// ============================================================================
// Runtime Tests (for test runner visibility)
// ============================================================================

describe("Type Inference", () => {
	describe("ExtractPathParams", () => {
		test("extracts single path param", () => {
			type Result = ExtractPathParams<"/users/:id">
			type Check = Result extends "id" ? true : false
			const check: Check = true
			expect(check).toBe(true)
		})

		test("extracts multiple path params", () => {
			type Result = ExtractPathParams<"/users/:id/posts/:postId">
			type HasId = "id" extends Result ? true : false
			type HasPostId = "postId" extends Result ? true : false
			const hasId: HasId = true
			const hasPostId: HasPostId = true
			expect(hasId).toBe(true)
			expect(hasPostId).toBe(true)
		})

		test("returns never for no params", () => {
			type Result = ExtractPathParams<"/users">
			type Check = IsNever<Result>
			const check: Check = true
			expect(check).toBe(true)
		})
	})

	describe("PathParamsToObject", () => {
		test("creates object from path params", () => {
			type Result = PathParamsToObject<"/users/:id">
			type Check = Result extends { id: string } ? true : false
			const check: Check = true
			expect(check).toBe(true)
		})

		test("creates object with multiple params", () => {
			type Result = PathParamsToObject<"/users/:userId/posts/:postId">
			type Check = Result extends { userId: string; postId: string }
				? true
				: false
			const check: Check = true
			expect(check).toBe(true)
		})
	})

	describe("HTTP Method Types", () => {
		test("HttpQueryMethod includes get, options, head", () => {
			type GetIsQuery = "get" extends HttpQueryMethod ? true : false
			type OptionsIsQuery = "options" extends HttpQueryMethod ? true : false
			type HeadIsQuery = "head" extends HttpQueryMethod ? true : false

			const getIsQuery: GetIsQuery = true
			const optionsIsQuery: OptionsIsQuery = true
			const headIsQuery: HeadIsQuery = true

			expect(getIsQuery).toBe(true)
			expect(optionsIsQuery).toBe(true)
			expect(headIsQuery).toBe(true)
		})

		test("HttpMutationMethod includes post, put, patch, delete", () => {
			type PostIsMutation = "post" extends HttpMutationMethod ? true : false
			type PutIsMutation = "put" extends HttpMutationMethod ? true : false
			type PatchIsMutation = "patch" extends HttpMutationMethod ? true : false
			type DeleteIsMutation = "delete" extends HttpMutationMethod ? true : false

			const postIsMutation: PostIsMutation = true
			const putIsMutation: PutIsMutation = true
			const patchIsMutation: PatchIsMutation = true
			const deleteIsMutation: DeleteIsMutation = true

			expect(postIsMutation).toBe(true)
			expect(putIsMutation).toBe(true)
			expect(patchIsMutation).toBe(true)
			expect(deleteIsMutation).toBe(true)
		})

		test("IsQueryMethod correctly identifies query methods", () => {
			type GetIsQuery = IsQueryMethod<"get">
			type PostIsQuery = IsQueryMethod<"post">

			const getIsQuery: GetIsQuery = true
			const postIsNotQuery: PostIsQuery = false

			expect(getIsQuery).toBe(true)
			expect(postIsNotQuery).toBe(false)
		})

		test("IsMutationMethod correctly identifies mutation methods", () => {
			type PostIsMutation = IsMutationMethod<"post">
			type GetIsMutation = IsMutationMethod<"get">

			const postIsMutation: PostIsMutation = true
			const getIsNotMutation: GetIsMutation = false

			expect(postIsMutation).toBe(true)
			expect(getIsNotMutation).toBe(false)
		})
	})

	describe("ExtractRoutes", () => {
		test("extracts routes from app", () => {
			type Routes = ExtractRoutes<App>
			type HasRoutes = Routes extends Record<string, unknown> ? true : false
			const hasRoutes: HasRoutes = true
			expect(hasRoutes).toBe(true)
		})
	})
})

// ============================================================================
// RouteSchema-based type tests (using actual Elysia routes)
// ============================================================================

describe("RouteSchema Type Extraction", () => {
	// Extract actual route schemas from the app's ~Routes
	// Elysia ~Routes structure: { users: { ":id": { get: ... }, get: ..., post: ... } }
	type Routes = ExtractRoutes<App>

	describe("InferRouteParams", () => {
		test("extracts params from route with path params", () => {
			// The route /users/:id has params in its schema
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Params = InferRouteParams<UserIdRoute>

			// Params should include 'id'
			type HasId = "id" extends keyof Params ? true : false
			const hasId: HasId = true
			expect(hasId).toBe(true)
		})
	})

	describe("InferRouteQuery", () => {
		test("extracts query params from GET route", () => {
			type UsersRoute = Routes["users"]["get"]
			type Query = InferRouteQuery<UsersRoute>

			// Query should have search and limit
			type HasSearch = "search" extends keyof Query ? true : false
			type HasLimit = "limit" extends keyof Query ? true : false

			const hasSearch: HasSearch = true
			const hasLimit: HasLimit = true

			expect(hasSearch).toBe(true)
			expect(hasLimit).toBe(true)
		})
	})

	describe("InferRouteBody", () => {
		test("extracts body from POST route", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Body = InferRouteBody<CreateUserRoute>

			// Body should have name and email
			type HasName = Body extends { name: string } ? true : false
			type HasEmail = Body extends { email: string } ? true : false

			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})
	})

	describe("InferRouteInput", () => {
		test("returns only query params for GET routes (path params via proxy)", () => {
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Input = InferRouteInput<UserIdRoute, "get">

			// For GET routes, input is only query params
			// Path params are passed via proxy callable: eden.users({ id: '1' })
			// UserIdRoute has no query params, so input should be empty
			// biome-ignore lint/complexity/noBannedTypes: {} check is intentional for empty object test
			type InputIsEmpty = {} extends Input ? true : false
			const inputIsEmpty: InputIsEmpty = true
			expect(inputIsEmpty).toBe(true)
		})

		test("returns body for POST routes", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Input = InferRouteInput<CreateUserRoute, "post">

			// For POST, input should be the body
			type IsBodyType = Input extends { name: string; email: string }
				? true
				: false
			const isBodyType: IsBodyType = true
			expect(isBodyType).toBe(true)
		})
	})

	describe("InferRouteOutput", () => {
		test("extracts output type from GET route", () => {
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Output = InferRouteOutput<UserIdRoute>

			// Output should have id, name, email
			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})

		test("extracts output type from POST route", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Output = InferRouteOutput<CreateUserRoute>

			// Output should have id, name, email
			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
		})

		test("extracts output type from DELETE route", () => {
			type DeleteUserRoute = Routes["users"][":id"]["delete"]
			type Output = InferRouteOutput<DeleteUserRoute>

			// Output should have deleted and id
			type HasDeleted = Output extends { deleted: boolean } ? true : false
			type HasId = Output extends { id: string } ? true : false

			const hasDeleted: HasDeleted = true
			const hasId: HasId = true

			expect(hasDeleted).toBe(true)
			expect(hasId).toBe(true)
		})
	})
})

// ============================================================================
// EdenFetchError Type Tests
// ============================================================================

describe("EdenFetchError", () => {
	test("has status property", () => {
		type Error = EdenFetchError<500, { message: string }>
		type HasStatus = "status" extends keyof Error ? true : false

		const hasStatus: HasStatus = true
		expect(hasStatus).toBe(true)
	})

	test("has value property", () => {
		type Error = EdenFetchError<500, { message: string }>
		type HasValue = "value" extends keyof Error ? true : false

		const hasValue: HasValue = true
		expect(hasValue).toBe(true)
	})

	test("does NOT have message property", () => {
		type Error = EdenFetchError<500, { message: string }>
		type HasMessage = "message" extends keyof Error ? true : false

		// CRITICAL: EdenFetchError should NOT have message at top level
		// message is inside value, not on the error itself
		const hasMessage: HasMessage = false
		expect(hasMessage).toBe(false)
	})

	test("status is typed number", () => {
		type Error = EdenFetchError<404, unknown>
		type StatusType = Error["status"]
		type IsNumber = StatusType extends number ? true : false

		const isNumber: IsNumber = true
		expect(isNumber).toBe(true)
	})

	test("status can be specific status code", () => {
		type Error = EdenFetchError<404, unknown>
		type StatusType = Error["status"]
		type Is404 = StatusType extends 404 ? true : false

		const is404: Is404 = true
		expect(is404).toBe(true)
	})

	test("value is typed", () => {
		type ErrorValue = { code: string; details: string[] }
		type Error = EdenFetchError<400, ErrorValue>
		type ValueType = Error["value"]
		type IsCorrect = ValueType extends ErrorValue ? true : false

		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("default generic parameters", () => {
		type Error = EdenFetchError
		type StatusIsNumber = Error["status"] extends number ? true : false
		type ValueIsUnknown = unknown extends Error["value"] ? true : false

		const statusIsNumber: StatusIsNumber = true
		const valueIsUnknown: ValueIsUnknown = true

		expect(statusIsNumber).toBe(true)
		expect(valueIsUnknown).toBe(true)
	})

	test("value can contain nested error structure", () => {
		type NestedError = {
			message: string
			errors: Array<{ field: string; reason: string }>
		}
		type Error = EdenFetchError<422, NestedError>

		// Access nested properties through value
		type ValueHasMessage = Error["value"] extends { message: string }
			? true
			: false
		type ValueHasErrors = Error["value"] extends { errors: unknown[] }
			? true
			: false

		const valueHasMessage: ValueHasMessage = true
		const valueHasErrors: ValueHasErrors = true

		expect(valueHasMessage).toBe(true)
		expect(valueHasErrors).toBe(true)
	})
})

// ============================================================================
// InferRouteError Type Tests
// ============================================================================

describe("InferRouteError", () => {
	// Test route schema types
	type RouteWithErrors = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { data: string }
			400: { message: string; code: string }
			404: { message: string }
			500: { error: string }
		}
	}

	type RouteWithOnlySuccess = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { data: string }
		}
	}

	type RouteWithNoResponse = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: unknown
	}

	test("extracts error types from route with defined errors", () => {
		type ErrorType = InferRouteError<RouteWithErrors>

		// Should be a union of EdenFetchError types for 400, 404, 500
		type Is400Error = EdenFetchError<400, { message: string; code: string }> extends ErrorType
			? true
			: false
		type Is404Error = EdenFetchError<404, { message: string }> extends ErrorType
			? true
			: false
		type Is500Error = EdenFetchError<500, { error: string }> extends ErrorType
			? true
			: false

		const is400Error: Is400Error = true
		const is404Error: Is404Error = true
		const is500Error: Is500Error = true

		expect(is400Error).toBe(true)
		expect(is404Error).toBe(true)
		expect(is500Error).toBe(true)
	})

	test("error type is NOT never when route has only success responses", () => {
		type ErrorType = InferRouteError<RouteWithOnlySuccess>

		// CRITICAL: Error should NOT be never - should default to EdenFetchError<number, unknown>
		type IsNotNever = IsNever<ErrorType> extends true ? false : true

		const isNotNever: IsNotNever = true
		expect(isNotNever).toBe(true)
	})

	test("error.value is NOT never when route has only success responses", () => {
		type ErrorType = InferRouteError<RouteWithOnlySuccess>

		// The value type should be accessible (not never)
		type HasStatus = ErrorType extends { status: number } ? true : false
		type HasValue = ErrorType extends { value: unknown } ? true : false

		const hasStatus: HasStatus = true
		const hasValue: HasValue = true

		expect(hasStatus).toBe(true)
		expect(hasValue).toBe(true)
	})

	test("error defaults to EdenFetchError<number, unknown> when no response defined", () => {
		type ErrorType = InferRouteError<RouteWithNoResponse>

		// Should default to generic error type
		type IsNotNever = IsNever<ErrorType> extends true ? false : true
		type HasStatus = ErrorType extends { status: number } ? true : false
		type HasValue = ErrorType extends { value: unknown } ? true : false

		const isNotNever: IsNotNever = true
		const hasStatus: HasStatus = true
		const hasValue: HasValue = true

		expect(isNotNever).toBe(true)
		expect(hasStatus).toBe(true)
		expect(hasValue).toBe(true)
	})

	test("error.value.message is accessible when error defines message", () => {
		type ErrorType = InferRouteError<RouteWithErrors>

		// For routes with defined errors, we should be able to narrow and access message
		type Error404 = Extract<ErrorType, { status: 404 }>
		type ValueHasMessage = Error404["value"] extends { message: string } ? true : false

		const valueHasMessage: ValueHasMessage = true
		expect(valueHasMessage).toBe(true)
	})
})
