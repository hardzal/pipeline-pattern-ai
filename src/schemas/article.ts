import { z } from "zod";

export const articleBriefSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required"),
  audience: z.string().trim().min(1, "Audience is required"),
  language: z.string().trim().min(2, "Language must have at least two characters"),
});

export type ArticleBrief = z.infer<typeof articleBriefSchema>;

export const articleCritiqueSchema = z.object({
  summary: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).min(1),
  improvements: z.array(z.string().trim().min(1)).min(1),
});

export type ArticleCritique = z.infer<typeof articleCritiqueSchema>;

export const articleDraftStageSchema = z.object({
  brief: articleBriefSchema,
  draft: z.string().trim().min(1),
});

export type ArticleDraftStage = z.infer<typeof articleDraftStageSchema>;

export const articleCritiqueStageSchema = articleDraftStageSchema.extend({
  critique: articleCritiqueSchema,
});

export type ArticleCritiqueStage = z.infer<typeof articleCritiqueStageSchema>;

export const articleRefinerResultSchema = articleCritiqueStageSchema.extend({
  finalArticle: z.string().trim().min(1),
});

export type ArticleRefinerResult = z.infer<typeof articleRefinerResultSchema>;
