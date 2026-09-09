import { describe, expect, it } from "vitest";

import { createCompletionModel } from "../src/agents/model.js";
import { createStudioForMode } from "../src/studio.js";
import { createWorkflowRegistry } from "../src/workflows/registry.js";
import { createIdeaReviewBoardPipeline } from "../src/workflows/idea-review-board.js";
import type { IdeaReview } from "../src/schemas/idea.js";

const pitch = [
  "Kita membangun aplikasi belajar coding adaptif.",
  "Aplikasi menyesuaikan latihan berdasarkan kesalahan pengguna.",
].join(" ");

function review(summary: string): IdeaReview {
  return {
    summary,
    strengths: ["Masalah pengguna dijelaskan dengan cukup jelas."],
    concerns: ["Bukti willingness to pay masih perlu diuji."],
  };
}

describe("Idea Review Board mock pipeline", () => {
  it("runs three named reviewers in parallel and merges every review", async () => {
    const startedRoles: string[] = [];
    let releaseAllReviewers!: () => void;
    const allReviewersStarted = new Promise<void>((resolve) => {
      releaseAllReviewers = resolve;
    });

    const pipeline = createIdeaReviewBoardPipeline({
      mode: "mock",
      reviewers: {
        ceo: async (input) => {
          startedRoles.push("ceo");
          if (startedRoles.length === 3) releaseAllReviewers();
          await allReviewersStarted;
          return review(`CEO reviewed: ${input}`);
        },
        analyst: async (input) => {
          startedRoles.push("analyst");
          if (startedRoles.length === 3) releaseAllReviewers();
          await allReviewersStarted;
          return review(`Analyst reviewed: ${input}`);
        },
        cto: async (input) => {
          startedRoles.push("cto");
          if (startedRoles.length === 3) releaseAllReviewers();
          await allReviewersStarted;
          return review(`CTO reviewed: ${input}`);
        },
      },
    });

    const result = await pipeline.run({ input: pitch });

    expect(new Set(startedRoles)).toEqual(new Set(["ceo", "analyst", "cto"]));
    expect(result.output.pitch).toBe(pitch);
    expect(result.output.reviews.ceo.summary).toContain("CEO reviewed");
    expect(result.output.reviews.analyst.summary).toContain("Analyst reviewed");
    expect(result.output.reviews.cto.summary).toContain("CTO reviewed");
    expect(result.output.verdict).toMatch(/mock/i);
    expect(result.output.nextSteps.length).toBeGreaterThan(0);
  });

  it("fails the whole run when one reviewer branch fails", async () => {
    const pipeline = createIdeaReviewBoardPipeline({
      mode: "mock",
      reviewers: {
        analyst: async () => {
          throw new Error("analyst branch failed");
        },
      },
    });

    await expect(pipeline.run({ input: pitch })).rejects.toThrow(
      "analyst branch failed",
    );
  });

  it("exposes three branch nodes and a merge node for Studio", () => {
    const pipeline = createIdeaReviewBoardPipeline({ mode: "mock" });
    const graph = pipeline.graph();
    const branchKeys = graph.nodes
      .filter((node) => node.kind === "branch")
      .map((node) => node.branchKey);

    expect(graph.id).toBe("idea-review-board");
    expect(branchKeys).toEqual(
      expect.arrayContaining(["ceo", "analyst", "cto"]),
    );
    expect(graph.nodes.map((node) => node.label)).toContain("Merge Reviews");
  });

  it("registers the mock workflow in the shared CLI and Studio registry", () => {
    const registry = createWorkflowRegistry({
      mode: "mock",
      apiKey: undefined,
      baseUrl: undefined,
      model: undefined,
    });
    const studio = createStudioForMode("mock");

    expect(registry["idea-review-board"]).toBeDefined();
    expect(
      studio.config().pipelines.find(
        (pipeline) => pipeline.id === "idea-review-board",
      ),
    ).toBeDefined();
  });

  it("builds the same parallel graph in live mode without calling the provider", () => {
    const model = createCompletionModel({
      mode: "live",
      apiKey: "test-api-key",
      baseUrl: "https://llm.example.test/v1",
      model: "test-model",
    });
    const pipeline = createIdeaReviewBoardPipeline({ mode: "live", model });
    const graph = pipeline.graph();

    expect(graph.id).toBe("idea-review-board");
    expect(graph.nodes.filter((node) => node.kind === "branch")).toHaveLength(3);
    expect(graph.nodes.map((node) => node.label)).toContain("Merge Reviews");
  });
});
