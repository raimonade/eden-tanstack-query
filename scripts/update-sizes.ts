import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

interface PackageSize {
	name: string
	esm: {
		raw: string
		gzipped: string
	}
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(2)} KB`
}

async function getFileSize(
	filePath: string,
): Promise<{ raw: number; gzipped: number }> {
	if (!existsSync(filePath)) {
		return { raw: 0, gzipped: 0 }
	}

	const file = Bun.file(filePath)
	const content = await file.text()
	const raw = statSync(filePath).size
	const gzipped = gzipSync(content).length

	return { raw, gzipped }
}

async function calculatePackageSize(
	packageName: string,
	distPath: string,
): Promise<PackageSize> {
	const esmPath = join(distPath, "index.js")
	const esm = await getFileSize(esmPath)

	return {
		name: packageName,
		esm: {
			raw: formatBytes(esm.raw),
			gzipped: formatBytes(esm.gzipped),
		},
	}
}

function formatSizeLine(sizes: PackageSize): string {
	return `**Size:** ${sizes.esm.raw} (gzipped: ${sizes.esm.gzipped})`
}

async function main() {
	console.log("\n📦 Calculating bundle sizes...\n")

	const size = await calculatePackageSize(
		"@eden-tanstack-query/react",
		"packages/eden-tanstack-query/dist",
	)

	console.log(
		`  ${size.name}: ESM ${size.esm.raw} (gzipped: ${size.esm.gzipped})`,
	)

	// Check if README.md exists
	const readmePath = "README.md"
	const readmeFile = Bun.file(readmePath)

	if (!(await readmeFile.exists())) {
		console.log("\n⚠️  README.md not found, skipping update.\n")
		console.log(`📦 Bundle size: ${formatSizeLine(size)}\n`)
		return
	}

	const readmeContent = await readmeFile.text()
	const sizeString = formatSizeLine(size)

	// Pattern: **Size:** X KB (gzipped: Y KB)
	const sizePattern = /\*\*Size:\*\* [\d.]+ KB \(gzipped: [\d.]+ KB\)/g

	const currentSizes = readmeContent.match(sizePattern) || []

	if (currentSizes.length === 0) {
		console.log("\n⚠️  No size placeholder found in README.md")
		console.log(`📦 Bundle size: ${sizeString}\n`)
		return
	}

	// Check if size changed
	if (currentSizes[0] === sizeString) {
		console.log("\n✅ Bundle size is up to date. No changes needed.\n")
		return
	}

	// Replace size in README
	const newReadmeContent = readmeContent.replace(sizePattern, sizeString)

	await Bun.write(readmePath, newReadmeContent)

	console.log("\n✅ Bundle size updated in README.md:")
	console.log(`  ${currentSizes[0]} → ${sizeString}\n`)
}

main().catch((error) => {
	console.error("\n❌ Error:", error.message)
	process.exit(1)
})
