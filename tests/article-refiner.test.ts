import { describe, expect, it } from "vitest";

import { createArticleRefinerPipeline } from "../src/workflows/article-refiner.js";

const brief = {
  topic: "Manfaat automated testing",
  audience: "Developer pemula",
  language: "id",
};

describe("Article Refiner mock pipeline", () => {
  it("runs draft, critique, and rewrite in sequence", async () => {
    const pipeline = createArticleRefinerPipeline({ mode: "mock" });
    const result = await pipeline.run({ input: brief });

    expect(result.output.brief).toEqual(brief);
    expect(result.output.draft).toContain("Manfaat automated testing");
    expect(result.output.critique.improvements.length).toBeGreaterThan(0);
    expect(result.output.finalArticle).toContain("Perbaikan diterapkan");
    expect(result.output.finalArticle).not.toBe(result.output.draft);
  });

  it("exposes readable stage metadata for Studio", () => {
    const pipeline = createArticleRefinerPipeline({ mode: "mock" });
    const graph = pipeline.graph();
    const labels = graph.nodes.map((node) => node.label);

    expect(graph.id).toBe("article-refiner");
    expect(labels).toEqual(
      expect.arrayContaining(["Draft", "Critique", "Rewrite"]),
    );
  });

  it("rejects an empty brief", async () => {
    const pipeline = createArticleRefinerPipeline({ mode: "mock" });

    await expect(
      pipeline.run({
        input: {
          topic: "",
          audience: "Developer pemula",
          language: "id",
        },
      }),
    ).rejects.toThrow();
  });
});
