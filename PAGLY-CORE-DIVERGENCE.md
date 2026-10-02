# Pagly Core Divergence Ledger

Every Pagly edit to a file that came from upstream Medusa is recorded here.

`develop` stays a clean mirror of [medusajs/medusa](https://github.com/medusajs/medusa). Pagly edits live on the long-lived `pagly` branch, which started at tag `v2.21.2`. Package names stay `@medusajs/*` and the upstream layout stays intact so a release merge stays a merge.

## When to add an entry

Add one in the same change that modifies a file that came from upstream.

You do not add an entry for new files that do not modify existing ones, or for this file.

Leave a one-line marker at the edit site:

```typescript
// Pagly: <one line on why this differs from upstream>
```

## Entry format

| Column | What goes in it |
| --- | --- |
| **File** | Path from the repository root. |
| **Change** | What was changed, in one line. Enough for a merge conflict resolver to know what to preserve. |
| **Why** | The merchant or platform reason. |
| **Flag** | The feature flag key gating it, or `none` if the change is unconditional. |
| **Retire when** | The condition under which this edit can be dropped. `n/a` if it is permanent by nature. |
| **Date** | When it landed, `YYYY-MM-DD`. |

## Ledger

| File | Change | Why | Flag | Retire when | Date |
| --- | --- | --- | --- | --- | --- |
| `packages/admin/dashboard/src/components/layout/main-layout/main-layout.tsx` | Appended an "Online store" entry (`/online-store`, `BuildingStorefront`) to `useCoreRoutes()`, and skipped extension menu items whose path is already a core route. | A merchant's storefront belongs in the main menu. Plugin routes can only nest under an existing core item or render as an extension, and `defineRouteConfig` has no placement for a core item. The filter stops the plugin's own `/online-store` route from showing a second time. | none | Upstream lets a plugin register a core nav item. | 2026-10-02 |
| `packages/admin/dashboard/src/components/forms/metadata-form/metadata-form.tsx` | Added an optional `definitions` prop (`MetadataDefinition`). Each definition is lifted out of the key/value grid and rendered as an input matching its type, and its value is coerced on submit. `json` stays in the grid. Existing callers are unaffected because the prop is optional. | A merchant should enter a number, date, or yes/no in an input that matches the field, not as a raw string. The type stays local so core does not depend on a Pagly module. | none | Upstream grows a typed custom-field surface of its own. | 2026-10-02 |
| `packages/admin/dashboard/src/i18n/translations/en.json`, `es.json`, `$schema.json` | Added `onlineStore.domain` and `metadata.edit.other`. | Labels for the nav item and the divider above the raw metadata grid, in English and Spanish. | none | n/a. Additive keys. | 2026-10-02 |

## Bringing in an upstream release

```bash
git fetch upstream --tags
git checkout pagly
git merge vX.Y.Z
```

Review this ledger while resolving conflicts. Then push `pagly` and bump the `medusa-core` submodule in `pagly-backoffice`.

Do not merge Pagly edits into `develop`. `develop` tracks upstream `develop` only.
