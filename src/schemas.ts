// SPDX-License-Identifier: MIT
import { z } from "zod";

export const topologySchema = z.enum(["circular", "linear"]);
export type Topology = z.infer<typeof topologySchema>;

export const cutFrequencySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal("all"),
  z.literal("1"),
  z.literal("2"),
]);
export type CutFrequency = z.infer<typeof cutFrequencySchema>;

export const overhangTypeSchema = z.enum(["5", "3", "blunt"]);
export type OverhangType = z.infer<typeof overhangTypeSchema>;

export const methylationStatusSchema = z.object({
  blocked: z.boolean(),
  reasons: z.array(z.string()).default([]),
  message: z.string().optional(),
  alternative: z.string().optional(),
});
export type MethylationStatus = z.infer<typeof methylationStatusSchema>;

export const enzymeSiteResultSchema = z.object({
  name: z.string(),
  recognition: z.string(),
  overhang: overhangTypeSchema.or(z.string()),
  cut_count: z.number().nonnegative(),
  positions: z.array(z.number()),
  cut_positions: z.array(z.number()),
  methylation: methylationStatusSchema,
  blocked: z.boolean(),
  iso_group: z.string().optional(),
  is_primary: z.boolean(),
});
export type EnzymeSiteResult = z.infer<typeof enzymeSiteResultSchema>;

export const enzymeGroupSchema = z.object({
  overhang: overhangTypeSchema.or(z.string()),
  label: z.string(),
  enzymes: z.array(enzymeSiteResultSchema),
});
export type EnzymeGroup = z.infer<typeof enzymeGroupSchema>;

export const instantRestrictionMapperInputSchema = z.object({
  sequence: z.string().min(1, "DNA sequence is required"),
  sequence_name: z.string().optional(),
  topology: topologySchema.optional(),
  cut_frequency: cutFrequencySchema.optional(),
  hide_short_sites: z.boolean().optional(),
  show_isoschizomers: z.boolean().optional(),
  selected_enzymes: z.array(z.string()).optional(),
});
export type InstantRestrictionMapperInput = z.infer<typeof instantRestrictionMapperInputSchema>;

export function parseRunInput(input: unknown): InstantRestrictionMapperInput {
  return instantRestrictionMapperInputSchema.parse(input);
}
