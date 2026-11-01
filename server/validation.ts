import { z } from 'zod'

/** Shared validation rules. Every mutating route parses its input through here. */

export const STAGES = ['new', 'contacted', 'meeting', 'customer'] as const
export const REGIONS = ['North', 'Central', 'West', 'South'] as const
export const SORTS = ['score', 'signals', 'potential', 'momentum', 'name', 'fit'] as const

export const accountIdSchema = z
  .string()
  .trim()
  .regex(/^TH-\d{4}$/, 'Account ids look like TH-1000.')

export const stageSchema = z.enum(STAGES, { message: `Stage must be one of: ${STAGES.join(', ')}` })

export const noteSchema = z
  .string()
  .max(2000, 'Notes are limited to 2,000 characters.')
  .refine((value) => value === value.trim(), 'Notes cannot start or end with whitespace.')

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be written as YYYY-MM-DD.')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
  }, 'That date does not exist.')

export const routeDateSchema = isoDate

const queryNumber = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined
      if (typeof value === 'string') return Number(value)
      return value
    },
    z
      .number({ message: 'Expected a number.' })
      .int('Expected a whole number.')
      .min(min, `Must be at least ${min}.`)
      .max(max, `Must be at most ${max}.`)
      .default(fallback),
  )

export const accountListQuerySchema = z.object({
  q: z.string().trim().max(80, 'Search queries are limited to 80 characters.').optional(),
  district: z.string().trim().min(1).max(60).optional(),
  sector: z.string().trim().min(1).max(80).optional(),
  region: z.enum(REGIONS, { message: `Region must be one of: ${REGIONS.join(', ')}` }).optional(),
  stage: stageSchema.optional(),
  saved: z.enum(['0', '1'], { message: 'saved must be 0 or 1.' }).optional(),
  sort: z.enum(SORTS, { message: `Sort must be one of: ${SORTS.join(', ')}` }).default('score'),
  limit: queryNumber(20, 1, 500),
  offset: queryNumber(0, 0, 100_000),
})

export type AccountListQuery = z.infer<typeof accountListQuerySchema>

export const accountIdParamSchema = z.object({ id: accountIdSchema })

export const districtParamSchema = z.object({
  name: z.string().trim().min(1, 'District name is required.').max(60),
})

export const accountIdBodySchema = z.object({ accountId: accountIdSchema }).strict()

export const stageBodySchema = z.object({ stage: stageSchema }).strict()

export const noteBodySchema = z.object({ note: noteSchema }).strict()

export const routeOrderBodySchema = z
  .object({
    stops: z
      .array(accountIdSchema)
      .max(24, 'A demo route holds at most 24 stops.')
      .refine((ids) => new Set(ids).size === ids.length, 'A route cannot include the same account twice.'),
  })
  .strict()

export const routeDateBodySchema = z.object({ date: routeDateSchema }).strict()

export const followingBodySchema = z
  .object({
    districts: z
      .array(z.string().trim().min(1).max(60))
      .max(37)
      .refine((names) => new Set(names).size === names.length, 'Duplicate districts are not allowed.'),
  })
  .strict()
