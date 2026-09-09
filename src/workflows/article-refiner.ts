import { Pipeline } from "@anvia/core/pipeline";

import type {
  ArticleBrief,
  ArticleCritiqueStage,
  ArticleDraftStage,
  ArticleRefinerResult,
} from "../schemas/article.js";
import { articleBriefSchema } from "../schemas/article.js";
import {
  createMockCritique,
  createMockDraft,
  createMockRewrite,
} from "../mocks/fixtures.js";

export type ArticleRefinerPipelineOptions = {
  mode: "mock";
};

export function createArticleRefinerPipeline(
  options: ArticleRefinerPipelineOptions,
): Pipeline<ArticleBrief, ArticleRefinerResult> {
  if (options.mode !== "mock") {
    throw new Error(
      "Article Refiner live mode is not available until Milestone 3.",
    );
  }

  return new Pipeline<ArticleBrief>({
    id: "article-refiner",
    name: "Article Refiner",
    description: "Draft, critique, and rewrite an article in sequence.",
    inputSchema: articleBriefSchema,
  })
    .step<ArticleDraftStage>({
      id: "draft",
      name: "Draft",
      description: "Create an initial article draft from the brief.",
      run: ({ input }) => ({
        brief: input,
        draft: createMockDraft(input),
      }),
    })
    .step<ArticleCritiqueStage>({
      id: "critique",
      name: "Critique",
      description: "Review the draft and produce actionable feedback.",
      run: ({ input }) => ({
        ...input,
        critique: createMockCritique(input),
      }),
    })
    .step<ArticleRefinerResult>({
      id: "rewrite",
      name: "Rewrite",
      description: "Rewrite the article using the draft and critique.",
      run: ({ input }) => ({
        ...input,
        finalArticle: createMockRewrite(input),
      }),
    });
}
