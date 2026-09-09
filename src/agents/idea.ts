import { Agent } from "@anvia/core/agent";
import type { OpenAICompletionModel } from "@anvia/openai";

import {
  ideaReviewBoardResultSchema,
  ideaReviewSchema,
  type IdeaReview,
  type IdeaReviewBoardResult,
} from "../schemas/idea.js";

export type IdeaAgents = {
  ceo: Agent<IdeaReview, OpenAICompletionModel>;
  analyst: Agent<IdeaReview, OpenAICompletionModel>;
  cto: Agent<IdeaReview, OpenAICompletionModel>;
  merge: Agent<IdeaReviewBoardResult, OpenAICompletionModel>;
};

export function createIdeaAgents(model: OpenAICompletionModel): IdeaAgents {
  return {
    ceo: new Agent({
      id: "idea-ceo-review-agent",
      name: "Idea CEO Reviewer",
      description: "Reviews a startup pitch for strategy and business potential.",
      model,
      outputSchema: ideaReviewSchema,
      instructions:
        "Review the startup pitch from a CEO perspective. Focus on strategy, business potential, and the most important assumptions. Do not claim market facts that are not present in the pitch.",
    }),
    analyst: new Agent({
      id: "idea-analyst-review-agent",
      name: "Idea Analyst Reviewer",
      description: "Reviews a startup pitch for market assumptions and risk.",
      model,
      outputSchema: ideaReviewSchema,
      instructions:
        "Review the startup pitch from an analyst perspective. Focus on market assumptions, evidence gaps, and risks. Treat the pitch as the only source of evidence.",
    }),
    cto: new Agent({
      id: "idea-cto-review-agent",
      name: "Idea CTO Reviewer",
      description: "Reviews a startup pitch for technical feasibility.",
      model,
      outputSchema: ideaReviewSchema,
      instructions:
        "Review the startup pitch from a CTO perspective. Focus on technical feasibility, complexity, delivery risk, and important implementation assumptions.",
    }),
    merge: new Agent({
      id: "idea-review-merge-agent",
      name: "Idea Review Merger",
      description: "Merges CEO, analyst, and CTO reviews into a recommendation.",
      model,
      outputSchema: ideaReviewBoardResultSchema,
      instructions:
        "Merge the three independent reviews into a balanced recommendation. Preserve disagreements when they matter. Return the complete requested schema and do not present the review as verified market research.",
    }),
  };
}

export async function generateIdeaAgentOutput<Output>(
  agent: Agent<Output, OpenAICompletionModel>,
  prompt: string,
): Promise<Output> {
  const result = await agent.generate({ prompt });

  if (result.type !== "response") {
    throw new Error(`Agent ${agent.id} did not return a response.`);
  }

  return result.output;
}
