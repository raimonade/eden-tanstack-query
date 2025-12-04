import { createEdenTanStackQuery } from "@eden-tanstack-query/react"
import { treaty } from "@elysiajs/eden"
import type { App } from "../server"

// Create typed hooks and provider
export const { EdenProvider, useEden, useEdenClient } =
	createEdenTanStackQuery<App>()

// Create Eden client
export const edenClient = treaty<App>("http://localhost:3001")
