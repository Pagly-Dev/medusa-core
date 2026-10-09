# Pagly Core Divergence Ledger

Every Pagly edit to a file that came from upstream Medusa is recorded here.

Pagly's core edits are on `develop`, which started from tag `v2.21.2` and now also carries those edits. Package names stay `@medusajs/*` and the upstream layout stays intact so a release merge stays a merge.

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
| `packages/admin/admin-bundler/src/utils/config.ts` | Added `react-router`, `react-router-dom`, `react-i18next`, `i18next`, `@tanstack/react-query`, and `@tanstack/query-core` to the admin Vite `resolve.dedupe` list. | Plugin pages import those packages from the repo root, while the dashboard prebundle was inlining the copies under `medusa-core/node_modules`. `Link` threw because it could not see the admin router, and theme queries threw because they could not see the admin `QueryClient`. | none | The admin build resolves plugin and dashboard imports to one copy without a dedupe list. | 2026-10-05 |
| `packages/admin/admin-bundler/src/commands/plugin.ts` | Added `@medusajs/ui` and `@medusajs/icons` to the plugin admin build externals. | The plugin was bundling its own UI library, so `Tooltip` could not see the provider the dashboard already renders. | none | Plugin admin extensions resolve `@medusajs/ui` to the dashboard copy without an extra external. | 2026-10-05 |
| `packages/core/utils/src/promotion/index.ts` | Added `PromotionType.BANK = "bank"`. | Bank promotions are a promotion type, separate from standard and buy-get. | none | Upstream adds an equivalent promotion type. | 2026-10-05 |
| `packages/core/types/src/promotion/common/promotion.ts` | Added `"bank"` to `PromotionTypeValues`, with a doc line on the DTO and the create DTO. | Callers that type a promotion need to accept the new type. | none | Upstream adds an equivalent promotion type. | 2026-10-05 |
| `packages/modules/promotion/src/migrations/Migration20261005114200.ts` | Recreated `promotion_type_check` so `type` may be `standard`, `buyget`, or `bank`. | The column rejects any type outside the check constraint. | none | Upstream adds an equivalent promotion type. | 2026-10-05 |
| `packages/modules/promotion/src/migrations/.snapshot-medusa-promotion.json` | Added `bank` to the promotion `type` enum items. | Keeps the snapshot aligned with the check constraint so a later generate does not drop it. | none | Upstream adds an equivalent promotion type. | 2026-10-05 |
| `packages/modules/promotion/src/services/promotion-module.ts` | `computeActions` skips a `type === bank` promotion unless its code was applied to the cart. An applied bank code is calculated like a standard promotion. | A bank promotion must not discount every cart. Checkout adds the code only after a BIN match, and that code has to reduce the total. | none | Upstream can exclude a promotion type from automatic application and still calculate it when its code is present. | 2026-10-05 |
| `packages/modules/promotion/src/services/promotion-module.ts` | For a `bank` promotion whose metadata has `bank_max_amount` and `bank_currency_code`, `computeActions` scales the item adjustments down so they sum to at most the cap, and skips the promotion when the cart is in another currency. Helpers `readBankCap` and `capItemActions` sit at the end of the file. | Bank promotions cap the discount per purchase, and the promotion module has no per-transaction cap. Without this the checkout discount exceeded what the storefront advertised. | none | Upstream adds a maximum discount amount to percentage promotions. | 2026-10-05 |
| `packages/medusa/src/api/admin/promotions/validators.ts`, `packages/core/types/src/http/promotion/admin/queries.ts` | The promotions list filter accepts `type`. | The admin list has to ask for `standard` and `buyget` only. The previous query schema rejected that field. | none | Upstream lets the promotions list filter by type. | 2026-10-05 |
| `packages/admin/dashboard/src/routes/promotions/promotion-list/loader.ts`, `packages/admin/dashboard/src/routes/promotions/promotion-list/components/promotion-list-table/promotion-list-table.tsx` | The promotions list always requests `type: ["standard", "buyget"]`. | Bank promotions have their own page and would look broken in this table. | none | Upstream can hide plugin-owned promotion types from the core list. | 2026-10-05 |
| `packages/admin/dashboard/src/routes/promotions/promotion-detail/promotion-detail.tsx` | When `type` is `bank`, the page shows a notice and a link to `/bank-promotions/:id` instead of the generic editor. | The generic editor cannot show bank, card, days, or the per-transaction cap. | none | Upstream can hand a promotion type off to an extension page. | 2026-10-05 |
| `packages/admin/dashboard/src/i18n/translations/en.json`, `es.json`, `$schema.json` | Added `promotions.bank.notice`. | Copy for the notice on a bank promotion opened from the standard detail URL, in English and Spanish. | none | n/a. Additive keys. | 2026-10-05 |
| `packages/medusa/src/api/store/carts/query-config.ts` | Store cart responses include `promotions.type`. | The storefront hides a bank promotion's internal code and still shows the discount amount. | none | The store cart already returns promotion type. | 2026-10-05 |

## Bringing in an upstream release

```bash
git fetch upstream --tags
git checkout develop
git merge vX.Y.Z
```

Review this ledger while resolving conflicts. Then push `develop` and bump the `medusa-core` submodule in `pagly-backoffice`.
