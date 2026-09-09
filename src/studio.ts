import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { Studio } from "@anvia/studio";
import type { Pipeline } from "@anvia/core/pipeline";

import { loadConfig, type AppMode } from "./config.js";
import {
  createWorkflowRegistry,
  type WorkflowPipeline,
} from "./workflows/registry.js";

type StudioPipeline = Pipeline<any, any>;

export function createStudio(pipelines: readonly StudioPipeline[] = []): Studio {
  return new Studio([...pipelines]);
}

export function createStudioForMode(mode: AppMode): Studio {
  const config = loadConfig(mode);
  const registry = createWorkflowRegistry(config);
  const pipelines = Object.values(registry).filter(
    (pipeline): pipeline is WorkflowPipeline => pipeline !== undefined,
  );

  return createStudio(pipelines);
}

export function startStudio(mode: AppMode = "mock"): Studio {
  const studio = createStudioForMode(mode);

  studio.start({
    port: 4021,
    hostname: "127.0.0.1",
    log: true,
  });

  return studio;
}

function parseMode(argv: string[]): AppMode {
  const modeIndex = argv.indexOf("--mode");
  const mode = modeIndex >= 0 ? argv[modeIndex + 1] : undefined;

  if (mode === "mock" || mode === "live") {
    return mode;
  }

  if (mode !== undefined) {
    throw new Error(`Invalid Studio mode: ${mode}`);
  }

  return "mock";
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];

  return (
    entrypoint !== undefined &&
    fileURLToPath(import.meta.url) === resolve(entrypoint)
  );
}

if (isMainModule()) {
  startStudio(parseMode(process.argv.slice(2)));
}
