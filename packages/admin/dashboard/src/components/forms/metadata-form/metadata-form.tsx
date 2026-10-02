import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  DropdownMenu,
  Heading,
  IconButton,
  InlineTip,
  Input,
  Switch,
  Text,
  Textarea,
  clx,
  toast,
} from "@medusajs/ui"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import {
  ArrowDownMini,
  ArrowUpMini,
  EllipsisVertical,
  Trash,
} from "@medusajs/icons"
import { FetchError } from "@medusajs/js-sdk"
import { ComponentPropsWithoutRef, forwardRef } from "react"
import { ConditionalTooltip } from "../../common/conditional-tooltip"
import { Form } from "../../common/form"
import { Skeleton } from "../../common/skeleton"
import { RouteDrawer, useRouteModal } from "../../modals"
import { KeyboundForm } from "../../utilities/keybound-form"
import { useDocumentDirection } from "../../../hooks/use-document-direction"

type MetaDataSubmitHook<TRes> = (
  params: { metadata?: Record<string, any> | null },
  callbacks: { onSuccess: () => void; onError: (error: FetchError) => void }
) => Promise<TRes>

/**
 * Pagly: a metafield definition the caller wants rendered as a typed input.
 * Kept local so core does not depend on a Pagly module type. Callers pass
 * objects that match this shape; `json` stays in the key/value grid.
 */
export type MetadataDefinition = {
  id: string
  key: string
  name: string
  description?: string | null
  type:
    | "text"
    | "multiline_text"
    | "number"
    | "boolean"
    | "url"
    | "date"
    | "json"
}

type MetadataFormProps<TRes> = {
  metadata?: Record<string, any> | null
  hook: MetaDataSubmitHook<TRes>
  isPending: boolean
  isMutating: boolean
  /**
   * Pagly: each definition is lifted out of the key/value grid and given an
   * input that matches its type. Anything without a definition stays in the
   * grid. Omit it and the form behaves exactly as before.
   */
  definitions?: MetadataDefinition[]
}

const MetadataFieldSchema = z.object({
  key: z.string(),
  disabled: z.boolean().optional(),
  value: z.any(),
})

const DefinedFieldSchema = z.object({
  key: z.string(),
  value: z.string(),
})

const MetadataSchema = z.object({
  defined: z.array(DefinedFieldSchema),
  metadata: z.array(MetadataFieldSchema),
})

export const MetadataForm = <TRes,>(props: MetadataFormProps<TRes>) => {
  const { t } = useTranslation()
  const { isPending, ...innerProps } = props

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("metadata.edit.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("metadata.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isPending ? <PlaceholderInner /> : <InnerForm {...innerProps} />}
    </RouteDrawer>
  )
}

const METADATA_KEY_LABEL_ID = "metadata-form-key-label"
const METADATA_VALUE_LABEL_ID = "metadata-form-value-label"

const InnerForm = <TRes,>({
  metadata,
  hook,
  isMutating,
  definitions,
}: Omit<MetadataFormProps<TRes>, "isPending">) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const direction = useDocumentDirection()
  const defined = definedFields(definitions)
  const hasUneditableRows = getHasUneditableRows(metadata, defined)

  const form = useForm<z.infer<typeof MetadataSchema>>({
    defaultValues: {
      defined: getDefinedValues(metadata, defined),
      metadata: getDefaultValues(metadata, defined),
    },
    resolver: zodResolver(MetadataSchema),
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    const parsedData = parseValues(data, metadata, defined)

    await hook(
      {
        metadata: parsedData,
      },
      {
        onSuccess: () => {
          toast.success(t("metadata.edit.successToast"))
          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  const { fields, insert, remove } = useFieldArray({
    control: form.control,
    name: "metadata",
  })

  function deleteRow(index: number) {
    remove(index)

    // If the last row is deleted, add a new blank row
    if (fields.length === 1) {
      insert(0, {
        key: "",
        value: "",
        disabled: false,
      })
    }
  }

  function insertRow(index: number, position: "above" | "below") {
    insert(index + (position === "above" ? 0 : 1), {
      key: "",
      value: "",
      disabled: false,
    })
  }

  function addRow() {
    insert(fields.length, {
      key: "",
      value: "",
      disabled: false,
    })
  }

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          {defined.length > 0 && (
            <div className="flex flex-col gap-y-6">
              {defined.map((definition, index) => (
                <Form.Field
                  key={definition.id}
                  control={form.control}
                  name={`defined.${index}.value`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label>{definition.name}</Form.Label>
                      {definition.description && (
                        <Form.Hint>{definition.description}</Form.Hint>
                      )}
                      <Form.Control>
                        <DefinedInput type={definition.type} {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              ))}
              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus" leading="compact">
                  {t("metadata.edit.other.label")}
                </Text>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  {t("metadata.edit.other.description")}
                </Text>
              </div>
            </div>
          )}
          <div className="bg-ui-bg-base shadow-elevation-card-rest grid grid-cols-1 divide-y rounded-lg">
            <div className="bg-ui-bg-subtle grid grid-cols-2 divide-x rounded-t-lg">
              <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                <label id={METADATA_KEY_LABEL_ID}>
                  {t("metadata.edit.labels.key")}
                </label>
              </div>
              <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                <label id={METADATA_VALUE_LABEL_ID}>
                  {t("metadata.edit.labels.value")}
                </label>
              </div>
            </div>
            {fields.map((field, index) => {
              const isDisabled = field.disabled || false
              let placeholder = "-"

              if (typeof field.value === "object") {
                placeholder = "{ ... }"
              }

              if (Array.isArray(field.value)) {
                placeholder = "[ ... ]"
              }

              return (
                <ConditionalTooltip
                  showTooltip={isDisabled}
                  content={t("metadata.edit.complexRow.tooltip")}
                  key={field.id}
                >
                  <div className="group/table relative">
                    <div
                      className={clx("grid grid-cols-2 divide-x", {
                        "overflow-hidden rounded-b-lg":
                          index === fields.length - 1,
                      })}
                    >
                      <Form.Field
                        control={form.control}
                        name={`metadata.${index}.key`}
                        render={({ field }) => {
                          return (
                            <Form.Item>
                              <Form.Control>
                                <GridInput
                                  aria-labelledby={METADATA_KEY_LABEL_ID}
                                  {...field}
                                  disabled={isDisabled}
                                  placeholder="Key"
                                />
                              </Form.Control>
                            </Form.Item>
                          )
                        }}
                      />
                      <Form.Field
                        control={form.control}
                        name={`metadata.${index}.value`}
                        render={({ field: { value, ...field } }) => {
                          return (
                            <Form.Item>
                              <Form.Control>
                                <GridInput
                                  aria-labelledby={METADATA_VALUE_LABEL_ID}
                                  {...field}
                                  value={isDisabled ? placeholder : value}
                                  disabled={isDisabled}
                                  placeholder="Value"
                                />
                              </Form.Control>
                            </Form.Item>
                          )
                        }}
                      />
                    </div>
                    <DropdownMenu dir={direction}>
                      <DropdownMenu.Trigger
                        className={clx(
                          "invisible absolute inset-y-0 -end-2.5 my-auto group-hover/table:visible data-[state='open']:visible",
                          {
                            hidden: isDisabled,
                          }
                        )}
                        disabled={isDisabled}
                        asChild
                      >
                        <IconButton size="2xsmall">
                          <EllipsisVertical />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item
                          className="gap-x-2"
                          onClick={() => insertRow(index, "above")}
                        >
                          <ArrowUpMini className="text-ui-fg-subtle" />
                          {t("metadata.edit.actions.insertRowAbove")}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="gap-x-2"
                          onClick={() => insertRow(index, "below")}
                        >
                          <ArrowDownMini className="text-ui-fg-subtle" />
                          {t("metadata.edit.actions.insertRowBelow")}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          className="gap-x-2"
                          onClick={() => deleteRow(index)}
                        >
                          <Trash className="text-ui-fg-subtle" />
                          {t("metadata.edit.actions.deleteRow")}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </div>
                </ConditionalTooltip>
              )
            })}
          </div>
          {hasUneditableRows && (
            <InlineTip
              variant="warning"
              label={t("metadata.edit.complexRow.label")}
            >
              {t("metadata.edit.complexRow.description")}
            </InlineTip>
          )}
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-between">
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={addRow}
            >
              {t("metadata.edit.actions.addRow")}
            </Button>
            <div className="flex items-center gap-x-2">
              <RouteDrawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  type="button"
                  disabled={isMutating}
                >
                  {t("actions.cancel")}
                </Button>
              </RouteDrawer.Close>
              <Button size="small" type="submit" isLoading={isMutating}>
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

type DefinedType = MetadataDefinition["type"]

/**
 * The input a defined metafield gets, chosen by its type.
 *
 * Every value still travels as a string, because that is what the form holds
 * and what the grid below would hold; `parseValues` is the one place that turns
 * it into the number, boolean or text that goes into metadata.
 */
const DefinedInput = forwardRef<
  HTMLInputElement,
  {
    type: DefinedType
    value: string
    onChange: (value: string) => void
    onBlur: () => void
    name: string
  }
>(({ type, value, onChange, ...props }, ref) => {
  if (type === "multiline_text") {
    return (
      <Textarea
        {...props}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (type === "boolean") {
    return (
      <div className="flex items-center">
        <Switch
          {...props}
          checked={value === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      </div>
    )
  }

  return (
    <Input
      {...props}
      ref={ref}
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
})
DefinedInput.displayName = "MetadataForm.DefinedInput"

const GridInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      autoComplete="off"
      className={clx(
        "txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none",
        className
      )}
    />
  )
})
GridInput.displayName = "MetadataForm.GridInput"

const PlaceholderInner = () => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <RouteDrawer.Body>
        <Skeleton className="h-[148ox] w-full rounded-lg" />
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-7 w-12 rounded-md" />
        </div>
      </RouteDrawer.Footer>
    </div>
  )
}

const EDITABLE_TYPES = ["string", "number", "boolean"]

/**
 * A `json` metafield holds a structure no single input can edit, so it is left
 * to the grid, where it shows as an uneditable row the way any other object
 * value does.
 */
function definedFields(
  definitions?: MetadataDefinition[]
): MetadataDefinition[] {
  return (definitions ?? []).filter((definition) => definition.type !== "json")
}

function getDefinedValues(
  metadata: Record<string, any> | null | undefined,
  defined: MetadataDefinition[]
): z.infer<typeof DefinedFieldSchema>[] {
  return defined.map((definition) => {
    const value = metadata?.[definition.key]

    return {
      key: definition.key,
      value:
        value === undefined || value === null || typeof value === "object"
          ? definition.type === "boolean"
            ? "false"
            : ""
          : String(value),
    }
  })
}

function getDefaultValues(
  metadata?: Record<string, any> | null,
  defined: MetadataDefinition[] = []
): z.infer<typeof MetadataFieldSchema>[] {
  const claimed = new Set(defined.map((definition) => definition.key))
  metadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata).filter(([key]) => !claimed.has(key))
      )
    : metadata

  if (!metadata || !Object.keys(metadata).length) {
    return [
      {
        key: "",
        value: "",
        disabled: false,
      },
    ]
  }

  return Object.entries(metadata).map(([key, value]) => {
    if (!EDITABLE_TYPES.includes(typeof value)) {
      return {
        key,
        value: value,
        disabled: true,
      }
    }

    let stringValue = value

    if (typeof value !== "string") {
      stringValue = JSON.stringify(value)
    }

    return {
      key,
      value: stringValue,
      original_key: key,
    }
  })
}

function parseValues(
  values: z.infer<typeof MetadataSchema>,
  original?: Record<string, any> | null,
  defined: MetadataDefinition[] = []
): Record<string, any> | null {
  const metadata = values.metadata

  const isEmpty =
    !defined.length &&
    (!metadata.length ||
      (metadata.length === 1 && !metadata[0].key && !metadata[0].value))

  if (isEmpty) {
    return null
  }

  const update: Record<string, any> = {}

  // First, handle removed keys from original
  if (original) {
    const kept = new Set([
      ...metadata.map((field) => field.key),
      ...defined.map((definition) => definition.key),
    ])

    Object.keys(original).forEach((originalKey) => {
      if (!kept.has(originalKey)) {
        update[originalKey] = ""
      }
    })
  }

  defined.forEach((definition, index) => {
    update[definition.key] = definedValue(
      definition.type,
      values.defined[index]?.value ?? ""
    )
  })

  metadata.forEach((field) => {
    let key = field.key
    let value = field.value
    const disabled = field.disabled

    if (!key) {
      return
    }

    if (disabled) {
      update[key] = value
      return
    }

    key = key.trim()
    value = value?.trim() ?? ""

    // We try to cast the value to a boolean or number if possible
    if (value === "true") {
      update[key] = true
    } else if (value === "false") {
      update[key] = false
    } else {
      const isNumeric = /^-?\d*\.?\d+$/.test(value)
      if (isNumeric) {
        update[key] = parseFloat(value)
      } else {
        update[key] = value
      }
    }
  })

  return update
}

/**
 * A defined metafield's typed value, or `""` to clear it.
 *
 * Clearing is an empty string rather than a missing key because that is how
 * this form has always removed a value.
 */
function definedValue(type: DefinedType, raw: string): any {
  const value = raw.trim()

  if (type === "boolean") {
    return value === "true"
  }

  if (!value) {
    return ""
  }

  if (type === "number") {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : ""
  }

  return value
}

function getHasUneditableRows(
  metadata?: Record<string, any> | null,
  defined: MetadataDefinition[] = []
) {
  if (!metadata) {
    return false
  }

  const claimed = new Set(defined.map((definition) => definition.key))

  return Object.entries(metadata).some(
    ([key, value]) =>
      !claimed.has(key) && !EDITABLE_TYPES.includes(typeof value)
  )
}
