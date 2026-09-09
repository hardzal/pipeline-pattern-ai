import type { Pipeline } from "@anvia/core/pipeline";

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
  if (config.mode !== "mock") {
    throw new Error(
      "Live workflow registry is not available until Milestone 3.",
    );
  }

  return {
    "article-refiner": createArticleRefinerPipeline({ mode: "mock" }),
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
