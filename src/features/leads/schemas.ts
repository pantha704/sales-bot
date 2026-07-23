import { z } from "zod";

export const leadCategorySchema = z.enum([
  "Organizational Development",
  "Sales Bots",
]);

export const leadSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  company: z.string().trim().min(2).max(100),
  jobTitle: z.string().trim().max(100).optional().default(""),
  query: z.string().trim().min(10).max(1_000),
  pageHistory: z
    .array(z.string().trim().min(2).max(160))
    .min(1)
    .max(10),
});

export const leadProfileResponseSchema = z.object({
  leadId: z.string().uuid(),
  category: leadCategorySchema,
  reason: z.string().trim().min(5).max(500),
  mode: z.enum(["live", "mock"]),
});

export const n8nLeadResponseSchema = z.object({
  success: z.boolean().optional(),
  leadId: z.string().uuid(),
  category: leadCategorySchema,
  reason: z.string().trim().min(5).max(500),
  message: z.string().optional(),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;
export type LeadCategory = z.infer<typeof leadCategorySchema>;
export type LeadProfileResponse = z.infer<typeof leadProfileResponseSchema>;
