import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"

// Extend expect with Testing Library matchers
// Works with both bun:test and vitest globals
expect.extend(matchers)

// Cleans up `render` after each test
afterEach(() => {
	cleanup()
})
