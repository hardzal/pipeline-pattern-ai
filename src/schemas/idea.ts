import { z } from "zod";

export const ideaPitchSchema = z.string().trim().min(1, "Pitch is required");

export type IdeaPitch = z.infer<typeof ideaPitchSchema>;

export const ideaReviewSchema = z.object({
  summary: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).min(1),
  concerns: z.array(z.string().trim().min(1)).min(1),
});

export type IdeaReview = z.infer<typeof ideaReviewSchema>;

export const ideaReviewBranchOutputSchema = z.object({
  pitch: ideaPitchSchema,
  review: ideaReviewSchema,
});

export type IdeaReviewBranchOutput = z.infer<
  typeof ideaReviewBranchOutputSchema
>;

export const ideaReviewsSchema = z.object({
  ceo: ideaReviewSchema,
  analyst: ideaReviewSchema,
  cto: ideaReviewSchema,
});

export type IdeaReviews = z.infer<typeof ideaReviewsSchema>;

export const ideaReviewBoardResultSchema = z.object({
  pitch: ideaPitchSchema,
  reviews: ideaReviewsSchema,
  verdict: z.string().trim().min(1),
  nextSteps: z.array(z.string().trim().min(1)).min(1),
});

export type IdeaReviewBoardResult = z.infer<
  typeof ideaReviewBoardResultSchema
>;

export const ideaReviewRoles = ["ceo", "analyst", "cto"] as const;

export type IdeaReviewRole = (typeof ideaReviewRoles)[number];
