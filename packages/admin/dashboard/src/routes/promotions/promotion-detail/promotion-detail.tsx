import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link, useLoaderData, useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { LayoutComposer, detailPageDefaultEntries } from "../../../components/layout-composer"
import { usePromotion, usePromotionRules } from "../../../hooks/api/promotions"
import { CampaignSection } from "./components/campaign-section"
import { PromotionConditionsSection } from "./components/promotion-conditions-section"
import { PromotionGeneralSection } from "./components/promotion-general-section"
import { promotionLoader } from "./loader"
import { AdminPromotionRule } from "@medusajs/types"
import { BasePromotionRuleValue } from "@medusajs/types/dist/http/promotion/common"

export type ExtendedPromotionRule = Omit<AdminPromotionRule, "values"> & {
  attribute_label?: string
  operator_label?: string
  field_type?: string
  values?: (BasePromotionRuleValue & {
    label?: string
  })[]
}

export const PromotionDetail = () => {
  const { t } = useTranslation()
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof promotionLoader>
  >

  const { id } = useParams()
  const { promotion, isLoading } = usePromotion(id!, { initialData })
  const query: Record<string, string> = {}

  if (promotion?.type === "buyget") {
    query.promotion_type = promotion.type
  }

  const { rules } = usePromotionRules(id!, "rules", query) as {
    rules: ExtendedPromotionRule[]
  }
  const { rules: targetRules } = usePromotionRules(
    id!,
    "target-rules",
    query
  ) as {
    rules: ExtendedPromotionRule[]
  }
  const { rules: buyRules } = usePromotionRules(id!, "buy-rules", query) as {
    rules: ExtendedPromotionRule[]
  }

  if (isLoading || !promotion) {
    return (
      <TwoColumnPageSkeleton mainSections={3} sidebarSections={1} showJSON />
    )
  }

  // Pagly: a bank promotion is edited on its own page, not in this form.
  if (promotion.type === "bank") {
    return (
      <Container className="divide-y p-0">
        <div className="flex flex-col items-start gap-y-2 px-6 py-4">
          <Heading>{t("promotions.bank.notice.heading")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("promotions.bank.notice.description")}
          </Text>
          <Button size="small" variant="secondary" asChild>
            <Link to={`/bank-promotions/${promotion.id}`}>
              {t("promotions.bank.notice.action")}
            </Link>
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <LayoutComposer
      widgetsZonePrefix="promotion.details"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      data={promotion}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="PromotionGeneralSection">
              <PromotionGeneralSection promotion={promotion} />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="PromotionConditionsSection:rules">
              <PromotionConditionsSection
                rules={rules || []}
                ruleType={"rules"}
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="PromotionConditionsSection:target-rules">
              <PromotionConditionsSection
                rules={targetRules || []}
                ruleType={"target-rules"}
                applicationMethodTargetType={
                  promotion.application_method?.target_type || "items"
                }
              />
            </LayoutComposer.Entry>
            {promotion.type === "buyget" && (
              <LayoutComposer.Entry id="PromotionConditionsSection:buy-rules">
                <PromotionConditionsSection
                  rules={buyRules || []}
                  ruleType={"buy-rules"}
                  applicationMethodTargetType={"items"}
                />
              </LayoutComposer.Entry>
            )}
            {detailPageDefaultEntries(promotion)}
          </>
        ),
        side: (
          <>
            <LayoutComposer.Entry id="CampaignSection">
              <CampaignSection campaign={promotion.campaign!} />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}
