/**
 * Publishes the predefined package list, in that order.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { paglyPublishPackages } from "./pagly-publish-packages.mjs"

const root = path.resolve(import.meta.dirname, "..")

for (const entry of paglyPublishPackages) {
  const cwd = path.join(root, entry.directory)
  console.log(`Publishing ${entry.directory}`)
  const result = spawnSync("yarn", ["npm", "publish", "--access", "public"], {
    cwd,
    stdio: "inherit",
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
