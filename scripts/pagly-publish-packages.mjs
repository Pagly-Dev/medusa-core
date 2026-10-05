/**
 * Packages this fork publishes, listed explicitly.
 * Order is publish order: dependencies first.
 * Add a package here when Pagly changes it. Do not discover names from the repo.
 */
export const paglyPublishPackages = [
  { name: "@medusajs/types", directory: "packages/core/types" },
  { name: "@medusajs/utils", directory: "packages/core/utils" },
  { name: "@medusajs/promotion", directory: "packages/modules/promotion" },
  { name: "@medusajs/dashboard", directory: "packages/admin/dashboard" },
  { name: "@medusajs/admin-bundler", directory: "packages/admin/admin-bundler" },
  { name: "@medusajs/medusa", directory: "packages/medusa" },
]

export function publishedName(name) {
  return `@pagly/${name.slice("@medusajs/".length)}`
}
