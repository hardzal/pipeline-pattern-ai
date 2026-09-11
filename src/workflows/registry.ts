import type { Pipeline } from "@anvia/core/pipeline";

import { createCompletionModel } from "../agents/model.js";
import type { AppConfig } from "../config.js";
import { createArticleRefinerPipeline } from "./article-refiner.js";
import { createIdeaReviewBoardPipeline } from "./idea-review-board.js";
import { createTicketTriagePipeline } from "./ticket-triage.js";
import {
  DEFAULT_PIPELINE_TIMEOUT_MS,
  withPipelineTimeout,
  type TimedWorkflowPipeline,
} from "./policy.js";
import type { ArticleRefinerProgressEvent } from "./article-refiner.js";

export type WorkflowName =
  | "article-refiner"
  | "idea-review-board"
  | "ticket-triage";

export type WorkflowPipeline = TimedWorkflowPipeline;

export type WorkflowRegistry = Partial<Record<WorkflowName, WorkflowPipeline>>;

export type WorkflowRegistryOptions = {
  onArticleProgress?:
    | ((event: ArticleRefinerProgressEvent) => void)
    | undefined;
};

export const WORKFLOW_TIMEOUTS_MS: Record<WorkflowName, number> = {
  "article-refiner": DEFAULT_PIPELINE_TIMEOUT_MS,
  "idea-review-board": DEFAULT_PIPELINE_TIMEOUT_MS,
  "ticket-triage": DEFAULT_PIPELINE_TIMEOUT_MS,
};

function registerWorkflow(
  name: WorkflowName,
  pipeline: Pipeline<any, any>,
): WorkflowPipeline {
  return withPipelineTimeout(pipeline, WORKFLOW_TIMEOUTS_MS[name]);
}

export function createWorkflowRegistry(
  config: AppConfig,
  options: WorkflowRegistryOptions = {},
): WorkflowRegistry {
  if (config.mode === "mock") {
    return {
      "article-refiner": registerWorkflow(
        "article-refiner",
        createArticleRefinerPipeline({
          mode: "mock",
          onProgress: options.onArticleProgress,
        }),
      ),
      "idea-review-board": registerWorkflow(
        "idea-review-board",
        createIdeaReviewBoardPipeline({ mode: "mock" }),
      ),
      "ticket-triage": registerWorkflow(
        "ticket-triage",
        createTicketTriagePipeline({ mode: "mock" }),
      ),
    };
  }

  const model = createCompletionModel(config);

  return {
    "article-refiner": registerWorkflow(
      "article-refiner",
      createArticleRefinerPipeline({
        mode: "live",
        model,
        onProgress: options.onArticleProgress,
      }),
    ),
    "idea-review-board": registerWorkflow(
      "idea-review-board",
      createIdeaReviewBoardPipeline({ mode: "live", model }),
    ),
    "ticket-triage": registerWorkflow(
      "ticket-triage",
      createTicketTriagePipeline({ mode: "live", model }),
    ),
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
