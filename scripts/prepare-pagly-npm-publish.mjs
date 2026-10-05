/**
 * Rewrites the current checkout so it publishes as @pagly/* on npm.
 *
 * Source on develop stays @medusajs/* so upstream merges stay merges.
 * Run this only inside the publish workflow. Do not commit the result.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const scriptPath = path.resolve(import.meta.filename)
const skipDirs = new Set([
  "node_modules",
  ".git",
  ".yarn",
  "dist",
  "coverage",
  "www",
  ".turbo",
  "build",
])
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".cts",
  ".mts",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".mdx",
  ".html",
  ".css",
  ".txt",
])

const repoUrl = "https://github.com/Pagly-Dev/medusa-core.git"

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else {
      files.push(full)
    }
  }
}

function rewriteText(contents) {
  return contents.replaceAll("@medusajs/", "@pagly/")
}

function rewritePackageJson(file) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"))
  if (pkg.name === "create-medusa-app") {
    pkg.name = "@pagly/create-medusa-app"
  }

  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "resolutions",
  ]) {
    if (!pkg[field]) {
      continue
    }
    const next = {}
    for (const [key, value] of Object.entries(pkg[field])) {
      const name = key === "create-medusa-app" ? "@pagly/create-medusa-app" : key
      next[name] = value
    }
    pkg[field] = next
  }

  if (pkg.repository && typeof pkg.repository === "object" && typeof pkg.repository.url === "string") {
    if (pkg.repository.url.includes("github.com/medusajs/medusa")) {
      pkg.repository.url = repoUrl
    }
  }

  if (!pkg.private && typeof pkg.name === "string" && pkg.name.startsWith("@pagly/")) {
    pkg.publishConfig = {
      ...(pkg.publishConfig ?? {}),
      access: "public",
    }
    delete pkg.publishConfig.provenance
  }

  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
  return pkg
}

function rewriteLockfile(file) {
  const contents = fs.readFileSync(file, "utf8")
  const next = contents
    .replaceAll("@medusajs/", "@pagly/")
    .replaceAll(
      '"create-medusa-app@workspace:',
      '"@pagly/create-medusa-app@workspace:'
    )
  if (next !== contents) {
    fs.writeFileSync(file, next)
  }
}

const files = []
walk(root, files)

let rewritten = 0
const publishable = []

for (const file of files) {
  if (file === scriptPath) {
    continue
  }
  if (path.basename(file) === "yarn.lock") {
    rewriteLockfile(file)
    rewritten += 1
    continue
  }
  if (!textExtensions.has(path.extname(file))) {
    continue
  }

  const contents = fs.readFileSync(file)
  if (contents.includes(0)) {
    continue
  }
  const text = contents.toString("utf8")
  const next = rewriteText(text)
  if (next !== text) {
    fs.writeFileSync(file, next)
    rewritten += 1
  }

  if (path.basename(file) === "package.json") {
    const pkg = rewritePackageJson(file)
    if (!pkg.private && typeof pkg.name === "string" && pkg.name.startsWith("@pagly/")) {
      publishable.push(`${pkg.name}@${pkg.version}`)
    }
  }
}

publishable.sort()
console.log(`Rewrote ${rewritten} files`)
console.log(`Publishable packages (${publishable.length})`)
for (const name of publishable) {
  console.log(`  ${name}`)
}

if (publishable.length === 0) {
  console.error("No @pagly packages were prepared")
  process.exit(1)
}
