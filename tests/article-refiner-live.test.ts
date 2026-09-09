import { describe, expect, it } from "vitest";

import { createArticleRefinerPipeline } from "../src/workflows/article-refiner.js";
import { createCompletionModel } from "../src/agents/model.js";
import { createStudioForMode } from "../src/studio.js";

describe("Article Refiner live wiring", () => {
  it("creates a provider model from the live configuration", () => {
    const model = createCompletionModel({
      mode: "live",
      apiKey: "test-api-key",
      baseUrl: "https://llm.example.test/v1",
      model: "test-model",
    });

    expect(model).toBeDefined();
  });

  it("builds the same three-stage graph in live mode", () => {
    const model = createCompletionModel({
      mode: "live",
      apiKey: "test-api-key",
      baseUrl: "https://llm.example.test/v1",
      model: "test-model",
    });
    const pipeline = createArticleRefinerPipeline({ mode: "live", model });
    const graph = pipeline.graph();

    expect(graph.id).toBe("article-refiner");
    expect(graph.nodes.map((node) => node.label)).toEqual(
      expect.arrayContaining(["Draft", "Critique", "Rewrite"]),
    );
  });

  it("registers the mock pipeline in Studio", () => {
    const studio = createStudioForMode("mock");
    const pipeline = studio.config().pipelines.find(
      (candidate) => candidate.id === "article-refiner",
    );

    expect(pipeline).toBeDefined();
    expect(pipeline?.stageCount).toBeGreaterThanOrEqual(3);
  });
});
