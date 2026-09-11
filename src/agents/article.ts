import { Agent } from "@anvia/core/agent";
import type { OpenAICompletionModel } from "@anvia/openai";

import {
  articleCritiqueSchema,
  type ArticleCritique,
} from "../schemas/article.js";

export type ArticleAgents = {
  draft: Agent<string, OpenAICompletionModel>;
  critique: Agent<ArticleCritique, OpenAICompletionModel>;
  rewrite: Agent<string, OpenAICompletionModel>;
};

export type ArticleAgentGenerationOptions = {
  abortSignal?: AbortSignal | undefined;
  onTextDelta?: ((delta: string) => void) | undefined;
};

export function createArticleAgents(
  model: OpenAICompletionModel,
): ArticleAgents {
  return {
    draft: new Agent({
      id: "article-draft-agent",
      name: "Article Draft Agent",
      description: "Creates an article draft from a structured brief.",
      model,
      instructions:
        "Write a useful first draft. Do not invent factual claims that are not supported by the brief.",
    }),
    critique: new Agent({
      id: "article-critique-agent",
      name: "Article Critique Agent",
      description: "Reviews an article draft and returns actionable feedback.",
      model,
      outputSchema: articleCritiqueSchema,
      instructions:
        "Critique clarity, structure, and relevance. Return actionable feedback as the requested JSON schema. Do not fact-check claims without sources.",
    }),
    rewrite: new Agent({
      id: "article-rewrite-agent",
      name: "Article Rewrite Agent",
      description: "Rewrites an article using the original draft and critique.",
      model,
      instructions:
        "Rewrite the article using the supplied draft and critique. Preserve supported claims and do not add unsupported factual claims.",
    }),
  };
}

export async function generateArticleAgentOutput<Output>(
  agent: Agent<Output, OpenAICompletionModel>,
  prompt: string,
  options: ArticleAgentGenerationOptions = {},
): Promise<Output> {
  const stream = agent.stream({
    prompt,
    abortSignal: options.abortSignal,
  });

  for await (const event of stream.events) {
    if (event.type === "text_delta") {
      options.onTextDelta?.(event.delta);
    }
  }

  const result = await stream.result;

  if (result.type !== "response") {
    throw new Error(`Agent ${agent.id} did not return a response.`);
  }

  return result.output;
}
