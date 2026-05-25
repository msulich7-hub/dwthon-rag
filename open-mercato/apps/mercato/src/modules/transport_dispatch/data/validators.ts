import { z } from 'zod'

const lineSchema = z.object({
  kind: z.enum(['package', 'pallet']),
  typeCode: z.string().min(1).max(32),
  quantity: z.number().int().min(0).max(999),
})

export const formatACompleteSchema = z.object({
  complementStatus: z.enum(['yes', 'no']).optional(),
  lines: z.array(lineSchema),
  splitLists: z.boolean().optional(),
})

export const formatBCompleteSchema = z.object({
  packageExpedition: z.string().min(1).max(16),
  palletExpedition: z.string().min(1).max(16),
  packageLines: z.array(lineSchema),
  palletLines: z.array(lineSchema),
})

export type FormatACompleteInput = z.infer<typeof formatACompleteSchema>
export type FormatBCompleteInput = z.infer<typeof formatBCompleteSchema>
