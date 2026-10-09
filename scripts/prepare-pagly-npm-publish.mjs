/**
 * Rewrites only the packages listed in pagly-publish-packages.mjs so they
 * publish as @pagly/*. Other @medusajs/* names stay on the upstream packages.
 *
 * Source on develop stays @medusajs/* so upstream merges stay merges.
 * Run this only inside the publish workflow. Do not commit the result.
 */
import fs from "node:fs"
import path from "node:path"
import { paglyPublishPackages, publishedName } from "./pagly-publish-packages.mjs"

const root = path.resolve(import.meta.dirname, "..")
const repoUrl = "https://github.com/Pagly-Dev/medusa-core.git"
const skipDirs = new Set(["node_modules", "dist", "coverage", ".turbo", "build"])
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

const sourceNames = paglyPublishPackages.map((pkg) => pkg.name)
const namePattern = new RegExp(
  `(?:${sourceNames
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?![-\\w])`,
  "g"
)

function toPublished(name) {
  return sourceNames.includes(name) ? publishedName(name) : name
}

function rewriteSpecifiers(contents) {
  return contents.replace(namePattern, (name) => publishedName(name))
}

function rewritePackageJson(file) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"))
  const published = publishedName(pkg.name)
  pkg.name = published

  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (!pkg[field]) {
      continue
    }
    const next = {}
    for (const [key, value] of Object.entries(pkg[field])) {
      next[toPublished(key)] = value
    }
    pkg[field] = next
  }

  for (const [key, value] of Object.entries(pkg.devDependencies ?? {})) {
    if (!key.startsWith("@pagly/")) {
      continue
    }
    pkg.dependencies = pkg.dependencies ?? {}
    if (!pkg.dependencies[key]) {
      pkg.dependencies[key] = value
    }
  }

  if (pkg.repository && typeof pkg.repository === "object") {
    pkg.repository.url = repoUrl
  }

  pkg.publishConfig = {
    ...(pkg.publishConfig ?? {}),
    access: "public",
  }
  delete pkg.publishConfig.provenance

  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
  return `${published}@${pkg.version}`
}

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

function rewriteTree(directory) {
  const files = []
  walk(directory, files)
  let rewritten = 0
  for (const file of files) {
    if (path.basename(file) === "package.json") {
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
    const next = rewriteSpecifiers(text)
    if (next !== text) {
      fs.writeFileSync(file, next)
      rewritten += 1
    }
  }
  return rewritten
}

function rewriteLockfile() {
  const file = path.join(root, "yarn.lock")
  const contents = fs.readFileSync(file, "utf8")
  const next = contents.replace(namePattern, (name) => publishedName(name))
  if (next !== contents) {
    fs.writeFileSync(file, next)
  }
}

const published = []
let rewritten = 0

for (const entry of paglyPublishPackages) {
  const directory = path.join(root, entry.directory)
  const manifest = path.join(directory, "package.json")
  const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"))
  if (pkg.name !== entry.name) {
    console.error(`${entry.directory} is ${pkg.name}, expected ${entry.name}`)
    process.exit(1)
  }
  rewritten += rewriteTree(directory)
  published.push(rewritePackageJson(manifest))
}

rewriteLockfile()

console.log(`Rewrote ${rewritten} files in ${paglyPublishPackages.length} predefined packages`)
for (const name of published) {
  console.log(`  ${name}`)
}
