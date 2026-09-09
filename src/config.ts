import "dotenv/config";

import { z } from "zod";

export type AppMode = "mock" | "live";

type Environment = Readonly<Record<string, string | undefined>>;

export type AppConfig = {
  mode: AppMode;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  model: string | undefined;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function optionalEnvironmentString() {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  );
}

const environmentSchema = z.object({
  OPENAI_API_KEY: optionalEnvironmentString(),
  OPENAI_API_BASE_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().url().optional(),
  ),
  LLM_MODEL: optionalEnvironmentString(),
});

function parseEnvironment(environment: Environment) {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter((field) => field.length > 0)
      .join(", ");

    throw new ConfigError(
      `Invalid environment configuration${fields ? ` for: ${fields}` : ""}`,
    );
  }

  return result.data;
}

export function loadConfig(
  mode: AppMode,
  environment: Environment = process.env,
): AppConfig {
  const env = parseEnvironment(environment);

  if (mode === "live") {
    const missing: string[] = [];

    if (env.OPENAI_API_KEY === undefined) {
      missing.push("OPENAI_API_KEY");
    }

    if (env.OPENAI_API_BASE_URL === undefined) {
      missing.push("OPENAI_API_BASE_URL");
    }

    if (env.LLM_MODEL === undefined) {
      missing.push("LLM_MODEL");
    }

    if (missing.length > 0) {
      throw new ConfigError(
        `Live mode requires: ${missing.join(", ")}. ` +
          "Configure them in .env or use --mode mock.",
      );
    }
  }

  return {
    mode,
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_API_BASE_URL,
    model: env.LLM_MODEL,
  };
}
