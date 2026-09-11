import type { Pipeline } from "@anvia/core/pipeline";

export const DEFAULT_PIPELINE_TIMEOUT_MS = 180_000;

export class PipelineTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Pipeline timed out after ${timeoutMs} ms`);
    this.name = "PipelineTimeoutError";
  }
}

export type TimedWorkflowPipeline = Pipeline<any, any> & {
  readonly timeoutMs: number;
};

export function withPipelineTimeout(
  pipeline: Pipeline<any, any>,
  timeoutMs = DEFAULT_PIPELINE_TIMEOUT_MS,
): TimedWorkflowPipeline {
  const originalRun = pipeline.run.bind(pipeline);

  pipeline.run = (async (options) => {
    const controller = new AbortController();
    const abortSignal =
      options.abortSignal === undefined
        ? controller.signal
        : AbortSignal.any([options.abortSignal, controller.signal]);
    const timeoutId = setTimeout(() => {
      controller.abort(new PipelineTimeoutError(timeoutMs));
    }, timeoutMs);

    try {
      return await originalRun({ ...options, abortSignal });
    } finally {
      clearTimeout(timeoutId);
    }
  }) as typeof pipeline.run;

  Object.defineProperty(pipeline, "timeoutMs", {
    configurable: false,
    enumerable: true,
    value: timeoutMs,
    writable: false,
  });

  return pipeline as TimedWorkflowPipeline;
}
