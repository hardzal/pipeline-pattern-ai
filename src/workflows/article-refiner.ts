import { Pipeline } from "@anvia/core/pipeline";
import type { OpenAICompletionModel } from "@anvia/openai";

import {
  createArticleAgents,
  generateArticleAgentOutput,
} from "../agents/article.js";
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

export type ArticleRefinerPipelineOptions =
  | {
      mode: "mock";
    }
  | {
      mode: "live";
      model: OpenAICompletionModel;
    };

export type ArticleRefinerProgressEvent =
  | { type: "stage_started"; stage: "draft" | "critique" | "rewrite" }
  | {
      type: "text_delta";
      stage: "draft" | "critique" | "rewrite";
      delta: string;
    }
  | { type: "stage_completed"; stage: "draft" | "critique" | "rewrite" };

export type ArticleRefinerPipelineOptionsWithProgress =
  ArticleRefinerPipelineOptions & {
    onProgress?:
      | ((event: ArticleRefinerProgressEvent) => void)
      | undefined;
  };

function createBasePipeline(): Pipeline<ArticleBrief> {
  return new Pipeline<ArticleBrief>({
    id: "article-refiner",
    name: "Article Refiner",
    description: "Draft, critique, and rewrite an article in sequence.",
    inputSchema: articleBriefSchema,
  });
}

export function createArticleRefinerPipeline(
  options: ArticleRefinerPipelineOptionsWithProgress,
): Pipeline<ArticleBrief, ArticleRefinerResult> {
  const pipeline = createBasePipeline();

  if (options.mode === "mock") {
    return pipeline
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

  const agents = createArticleAgents(options.model);

  return pipeline
    .step<ArticleDraftStage>({
      id: "draft",
      name: "Draft",
      description: "Create an initial article draft from the brief.",
      run: async ({ input, abortSignal }) => {
        options.onProgress?.({ type: "stage_started", stage: "draft" });
        const draft = await generateArticleAgentOutput(
          agents.draft,
          [
            "Create an article draft from this brief.",
            JSON.stringify(input, null, 2),
          ].join("\n\n"),
          {
            abortSignal,
            onTextDelta: (delta) =>
              options.onProgress?.({ type: "text_delta", stage: "draft", delta }),
          },
        );
        options.onProgress?.({ type: "stage_completed", stage: "draft" });
        return { brief: input, draft };
      },
    })
    .step<ArticleCritiqueStage>({
      id: "critique",
      name: "Critique",
      description: "Review the draft and produce actionable feedback.",
      run: async ({ input, abortSignal }) => {
        options.onProgress?.({ type: "stage_started", stage: "critique" });
        const critique = await generateArticleAgentOutput(
          agents.critique,
          [
            "Critique this article draft for clarity, structure, and relevance.",
            `Brief:\n${JSON.stringify(input.brief, null, 2)}`,
            `Draft:\n${input.draft}`,
          ].join("\n\n"),
          {
            abortSignal,
            onTextDelta: (delta) =>
              options.onProgress?.({
                type: "text_delta",
                stage: "critique",
                delta,
              }),
          },
        );
        options.onProgress?.({ type: "stage_completed", stage: "critique" });
        return { ...input, critique };
      },
    })
    .step<ArticleRefinerResult>({
      id: "rewrite",
      name: "Rewrite",
      description: "Rewrite the article using the draft and critique.",
      run: async ({ input, abortSignal }) => {
        options.onProgress?.({ type: "stage_started", stage: "rewrite" });
        const finalArticle = await generateArticleAgentOutput(
          agents.rewrite,
          [
            "Rewrite the article using the original draft and critique.",
            `Brief:\n${JSON.stringify(input.brief, null, 2)}`,
            `Draft:\n${input.draft}`,
            `Critique:\n${JSON.stringify(input.critique, null, 2)}`,
          ].join("\n\n"),
          {
            abortSignal,
            onTextDelta: (delta) =>
              options.onProgress?.({ type: "text_delta", stage: "rewrite", delta }),
          },
        );
        options.onProgress?.({ type: "stage_completed", stage: "rewrite" });
        return { ...input, finalArticle };
      },
    });
}
