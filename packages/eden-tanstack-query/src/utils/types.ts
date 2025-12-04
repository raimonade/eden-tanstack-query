/**
 * Utility types for type manipulation
 */

/**
 * Check if type is `any`
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Check if type is `never`
 */
export type IsNever<T> = [T] extends [never] ? true : false

/**
 * Check if type is `unknown`
 */
export type IsUnknown<T> =
	IsAny<T> extends true ? false : unknown extends T ? true : false

/**
 * Simplify a type by expanding it
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Make all properties optional deeply
 */
export type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T

/**
 * Get keys that have non-never values
 */
export type NonNeverKeys<T> = {
	[K in keyof T]: IsNever<T[K]> extends true ? never : K
}[keyof T]

/**
 * Remove never values from object type
 */
export type OmitNever<T> = Pick<T, NonNeverKeys<T>>
