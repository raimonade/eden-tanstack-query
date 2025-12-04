import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"

declare module "vitest" {
	// biome-ignore lint/suspicious/noExplicitAny: Required for matcher extension
	interface Assertion<T = any>
		extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
	interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
