import type { Pipeline } from "@anvia/core/pipeline";

import { createCompletionModel } from "../agents/model.js";
import type { AppConfig } from "../config.js";
import { createArticleRefinerPipeline } from "./article-refiner.js";

export type WorkflowName =
  | "article-refiner"
  | "idea-review-board"
  | "ticket-triage";

export type WorkflowPipeline = Pipeline<any, any>;

export type WorkflowRegistry = Partial<Record<WorkflowName, WorkflowPipeline>>;

export function createWorkflowRegistry(
  config: AppConfig,
): WorkflowRegistry {
  if (config.mode === "mock") {
    return {
      "article-refiner": createArticleRefinerPipeline({ mode: "mock" }),
    };
  }

  const model = createCompletionModel(config);

  return {
    "article-refiner": createArticleRefinerPipeline({ mode: "live", model }),
  };
}

export function getWorkflow(
  registry: WorkflowRegistry,
  name: WorkflowName,
): WorkflowPipeline {
  const workflow = registry[name];

  if (workflow === undefined) {
    throw new Error(`Workflow is not implemented yet: ${name}`);
  }

  return workflow;
}
