/**
 * Type inference tests for Eden TanStack Query
 *
 * These tests verify that types are correctly extracted from Elysia routes.
 * Uses bun:test with compile-time type checking.
 */
import { describe, expect, test } from "bun:test"
import { Elysia, t } from "elysia"

import type {
	ExtractPathParams,
	ExtractRoutes,
	HttpMutationMethod,
	HttpQueryMethod,
	InferRouteBody,
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
	// Extract actual route schemas from the app's _routes
	type Routes = ExtractRoutes<App>

	describe("InferRouteParams", () => {
		test("extracts params from route with path params", () => {
			// The route /users/:id should have params
			type UserIdRoute = Routes["/users/:id"]["get"]
			type Params = InferRouteParams<UserIdRoute>

			// Params should include 'id'
			type HasId = "id" extends keyof Params ? true : false
			const hasId: HasId = true
			expect(hasId).toBe(true)
		})
	})

	describe("InferRouteQuery", () => {
		test("extracts query params from GET route", () => {
			type UsersRoute = Routes["/users"]["get"]
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
			type CreateUserRoute = Routes["/users"]["post"]
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
		test("returns params + query for GET routes", () => {
			type UserIdRoute = Routes["/users/:id"]["get"]
			type Input = InferRouteInput<UserIdRoute, "get">

			// For GET, input should include params
			type HasId = "id" extends keyof Input ? true : false
			const hasId: HasId = true
			expect(hasId).toBe(true)
		})

		test("returns body for POST routes", () => {
			type CreateUserRoute = Routes["/users"]["post"]
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
			type UserIdRoute = Routes["/users/:id"]["get"]
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
			type CreateUserRoute = Routes["/users"]["post"]
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
			type DeleteUserRoute = Routes["/users/:id"]["delete"]
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
