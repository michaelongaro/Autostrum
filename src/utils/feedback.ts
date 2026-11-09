import { z } from "zod";

export const FEEDBACK_MAX_LENGTH = 5000;

export const feedbackInputSchema = z.object({
  category: z.enum(["FEATURE_REQUEST", "BUG", "OTHER"]),
  message: z
    .string()
    .trim()
    .min(1, "Please enter your feedback.")
    .max(
      FEEDBACK_MAX_LENGTH,
      "Please keep your feedback under 5,000 characters.",
    ),
});

export type FeedbackCategory = z.infer<typeof feedbackInputSchema>["category"];
