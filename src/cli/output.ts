export type OutputOptions = {
  json: boolean;
  mode: "mock" | "live";
  runId: string;
};

export function formatWorkflowOutput(
  output: unknown,
  options: OutputOptions,
): string {
  if (options.json) {
    return JSON.stringify(output, null, 2);
  }

  return [
    `Mode: ${options.mode}`,
    `Run ID: ${options.runId}`,
    "Result:",
    JSON.stringify(output, null, 2),
  ].join("\n");
}
