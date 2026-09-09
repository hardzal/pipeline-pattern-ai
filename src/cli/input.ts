import { readFile } from "node:fs/promises";

import type { WorkflowName } from "../workflows/registry.js";
import { articleBriefSchema } from "../schemas/article.js";

export async function readWorkflowInput(
  workflowName: WorkflowName,
  filePath: string | undefined,
): Promise<unknown> {
  if (filePath === undefined) {
    throw new Error(
      `Input file is required for ${workflowName}. Use --file <path>.`,
    );
  }

  let content: string;

  try {
    content = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`Input file not found or unreadable: ${filePath}`);
  }

  if (content.trim().length === 0) {
    throw new Error(`Input file is empty: ${filePath}`);
  }

  if (workflowName === "article-refiner") {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content) as unknown;
    } catch {
      throw new Error(`Article Refiner input must be valid JSON: ${filePath}`);
    }

    return articleBriefSchema.parse(parsed);
  }

  return content.trim();
}
