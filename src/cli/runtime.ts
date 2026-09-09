export type WorkflowRunResult<Output> = {
  runId: string;
  output: Output;
};

export type WorkflowRunner<Input, Output> = {
  run(options: {
    input: Input;
    abortSignal?: AbortSignal;
  }): Promise<WorkflowRunResult<Output>>;
};

export type WorkflowExecutionPolicy = {
  timeoutMs?: number;
  maxAttempts?: number;
};

export const DEFAULT_WORKFLOW_TIMEOUT_MS = 60_000;
export const DEFAULT_WORKFLOW_MAX_ATTEMPTS = 2;

export class WorkflowTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Workflow timed out after ${timeoutMs} ms`);
    this.name = "WorkflowTimeoutError";
  }
}

function readNumericProperty(
  error: unknown,
  property: "status" | "code",
): number | string | undefined {
  if (typeof error !== "object" || error === null || !(property in error)) {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const value = record[property];
  return typeof value === "number" || typeof value === "string"
    ? value
    : undefined;
}

export function isTransientWorkflowError(error: unknown): boolean {
  const status = readNumericProperty(error, "status");
  if (
    (typeof status === "number" &&
      (status === 408 || status === 425 || status === 429 || status >= 500)) ||
    (typeof status === "string" &&
      ["408", "425", "429"].includes(status))
  ) {
    return true;
  }

  const code = readNumericProperty(error, "code");
  return (
    typeof code === "string" &&
    ["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(code)
  );
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export async function runWorkflowWithPolicy<Input, Output>(
  workflow: WorkflowRunner<Input, Output>,
  input: Input,
  policy: WorkflowExecutionPolicy = {},
): Promise<WorkflowRunResult<Output>> {
  const timeoutMs = positiveInteger(
    policy.timeoutMs ?? DEFAULT_WORKFLOW_TIMEOUT_MS,
    "timeoutMs",
  );
  const maxAttempts = positiveInteger(
    policy.maxAttempts ?? DEFAULT_WORKFLOW_MAX_ATTEMPTS,
    "maxAttempts",
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutError = new WorkflowTimeoutError(timeoutMs);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(timeoutError);
        controller.abort(timeoutError);
      }, timeoutMs);
    });

    try {
      const runPromise = workflow.run({
        input,
        abortSignal: controller.signal,
      });
      return await Promise.race([runPromise, timeoutPromise]);
    } catch (error: unknown) {
      if (error instanceof WorkflowTimeoutError) {
        throw error;
      }

      if (attempt >= maxAttempts || !isTransientWorkflowError(error)) {
        throw error;
      }
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw new Error("Workflow execution exhausted its retry policy");
}
