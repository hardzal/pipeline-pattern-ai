import {
  OpenAIClient,
  type OpenAICompletionModel,
  type OpenAICompletionModelId,
} from "@anvia/openai";

import type { AppConfig } from "../config.js";

export function createCompletionModel(
  config: AppConfig,
): OpenAICompletionModel {
  if (config.mode !== "live") {
    throw new Error("A live configuration is required to create a model.");
  }

  if (
    config.apiKey === undefined ||
    config.baseUrl === undefined ||
    config.model === undefined
  ) {
    throw new Error(
      "Live model configuration requires apiKey, baseUrl, and model.",
    );
  }

  const client = new OpenAIClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  return client.completionModel({
    modelId: config.model as OpenAICompletionModelId,
    api: "chat",
  });
}
