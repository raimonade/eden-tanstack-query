import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: [
			"./packages/eden-tanstack-query/test-utils/testing-library.ts",
		],
	},
})
