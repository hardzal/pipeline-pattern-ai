import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { Studio } from "@anvia/studio";
import type { Pipeline } from "@anvia/core/pipeline";

type StudioPipeline = Pipeline<any, any>;

export function createStudio(pipelines: readonly StudioPipeline[] = []): Studio {
  return new Studio([...pipelines]);
}

export function startStudio(): Studio {
  const studio = createStudio();

  studio.start({
    port: 4021,
    hostname: "127.0.0.1",
    log: true,
  });

  return studio;
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];

  return (
    entrypoint !== undefined &&
    fileURLToPath(import.meta.url) === resolve(entrypoint)
  );
}

if (isMainModule()) {
  startStudio();
}
