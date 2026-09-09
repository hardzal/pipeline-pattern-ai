import { describe, expect, it } from "vitest";

import { createCompletionModel } from "../src/agents/model.js";
import { createStudioForMode } from "../src/studio.js";
import { createWorkflowRegistry } from "../src/workflows/registry.js";
import { createTicketTriagePipeline } from "../src/workflows/ticket-triage.js";

const highPriorityTicket = [
  "Customer: Rina Pratama",
  "Subject: Produksi tidak dapat login",
  "Priority: high",
  "Semua pengguna menerima error 500 sejak deploy terakhir.",
].join("\n");

describe("Ticket Triage mock pipeline", () => {
  it("routes a high-priority ticket to urgent review", async () => {
    const pipeline = createTicketTriagePipeline({ mode: "mock" });
    const result = await pipeline.run({ input: highPriorityTicket });

    expect(result.output.ticket.customer).toBe("Rina Pratama");
    expect(result.output.ticket.priority).toBe("high");
    expect(result.output.route).toBe("urgent-review");
    expect(result.output.reason).toContain("high");
  });

  it("uses the normal fallback and null customer for an ambiguous ticket", async () => {
    const pipeline = createTicketTriagePipeline({ mode: "mock" });
    const result = await pipeline.run({
      input: "Bagaimana cara mengubah alamat email akun saya?",
    });

    expect(result.output.ticket.customer).toBeNull();
    expect(result.output.ticket.priority).toBe("normal");
    expect(result.output.route).toBe("standard-queue");
  });

  it("routes low-priority tickets to the low-priority queue", async () => {
    const pipeline = createTicketTriagePipeline({ mode: "mock" });
    const result = await pipeline.run({
      input: "Priority: low\nSaya ingin menyampaikan saran kecil untuk tampilan halaman profil.",
    });

    expect(result.output.ticket.priority).toBe("low");
    expect(result.output.route).toBe("low-priority-queue");
  });

  it("rejects invalid extraction before the router can produce output", async () => {
    const pipeline = createTicketTriagePipeline({
      mode: "mock",
      extractor: () => ({
        customer: null,
        summary: "Invalid extraction",
        priority: "urgent",
      }),
    });

    await expect(pipeline.run({ input: "Ticket dengan extraction invalid" })).rejects.toThrow();
  });

  it("rejects an empty ticket", async () => {
    const pipeline = createTicketTriagePipeline({ mode: "mock" });

    await expect(pipeline.run({ input: "   " })).rejects.toThrow();
  });

  it("exposes extraction and routing stages with mock metadata", () => {
    const pipeline = createTicketTriagePipeline({ mode: "mock" });
    const graph = pipeline.graph();
    const extractionNode = graph.nodes.find((node) => node.id === "extract");

    expect(graph.id).toBe("ticket-triage");
    expect(graph.nodes.map((node) => node.label)).toEqual(
      expect.arrayContaining(["Extract Ticket (Mock)", "Route Ticket"]),
    );
    expect(extractionNode?.metadata).toMatchObject({
      mode: "mock",
      usesExtractor: false,
    });
  });

  it("registers the workflow in the shared CLI and Studio registry", () => {
    const registry = createWorkflowRegistry({
      mode: "mock",
      apiKey: undefined,
      baseUrl: undefined,
      model: undefined,
    });
    const studio = createStudioForMode("mock");

    expect(registry["ticket-triage"]).toBeDefined();
    expect(
      studio.config().pipelines.find(
        (pipeline) => pipeline.id === "ticket-triage",
      ),
    ).toBeDefined();
  });

  it("builds a live extractor graph without calling the provider", () => {
    const model = createCompletionModel({
      mode: "live",
      apiKey: "test-api-key",
      baseUrl: "https://llm.example.test/v1",
      model: "test-model",
    });
    const pipeline = createTicketTriagePipeline({ mode: "live", model });
    const graph = pipeline.graph();

    expect(graph.nodes.find((node) => node.id === "extract")?.kind).toBe(
      "extractor",
    );
    expect(graph.nodes.map((node) => node.label)).toContain("Route Ticket");
  });
});
