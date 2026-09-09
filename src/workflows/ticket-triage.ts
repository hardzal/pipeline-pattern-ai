import { Pipeline } from "@anvia/core/pipeline";
import type { OpenAICompletionModel } from "@anvia/openai";

import { createMockTicketExtraction } from "../mocks/fixtures.js";
import {
  ticketExtractionSchema,
  ticketTextSchema,
  ticketTriageResultSchema,
  type TicketExtraction,
  type TicketPriority,
  type TicketRoute,
  type TicketTriageResult,
} from "../schemas/ticket.js";

export type TicketExtractor = (ticket: string) => unknown | Promise<unknown>;

type MockTicketTriageOptions = {
  mode: "mock";
  extractor?: TicketExtractor;
};

type LiveTicketTriageOptions = {
  mode: "live";
  model: OpenAICompletionModel;
};

export type TicketTriagePipelineOptions =
  | MockTicketTriageOptions
  | LiveTicketTriageOptions;

const routeByPriority: Record<TicketPriority, TicketRoute> = {
  high: "urgent-review",
  normal: "standard-queue",
  low: "low-priority-queue",
};

export function routeTicket(ticket: TicketExtraction): {
  route: TicketRoute;
  reason: string;
} {
  const route = routeByPriority[ticket.priority];

  return {
    route,
    reason: `Priority ${ticket.priority} deterministically maps to ${route}.`,
  };
}

function createBasePipeline(): Pipeline<string> {
  return new Pipeline<string>({
    id: "ticket-triage",
    name: "Ticket Triage",
    description: "Extract a support ticket and route it deterministically.",
    inputSchema: ticketTextSchema,
  });
}

function createRouteStage(
  pipeline: Pipeline<string, TicketExtraction>,
): Pipeline<string, TicketTriageResult> {
  return pipeline.step<TicketTriageResult>({
    id: "route",
    name: "Route Ticket",
    description: "Map validated priority to a local support queue.",
    run: ({ input }) =>
      ticketTriageResultSchema.parse({
        ticket: input,
        ...routeTicket(input),
      }),
  });
}

export function createTicketTriagePipeline(
  options: TicketTriagePipelineOptions,
): Pipeline<string, TicketTriageResult> {
  const basePipeline = createBasePipeline();

  if (options.mode === "mock") {
    const extractor = options.extractor ?? createMockTicketExtraction;
    const extractedPipeline = basePipeline.step<TicketExtraction>({
      id: "extract",
      name: "Extract Ticket (Mock)",
      description:
        "Parse the ticket with a deterministic fixture; this path does not call an LLM extractor.",
      metadata: {
        mode: "mock",
        usesExtractor: false,
        source: "deterministic-fixture",
      },
      run: async ({ input }) =>
        ticketExtractionSchema.parse(await extractor(input)),
    });

    return createRouteStage(extractedPipeline);
  }

  const extractedPipeline = basePipeline.extract<TicketExtraction, OpenAICompletionModel>({
    id: "extract",
    name: "Extract Ticket",
    description: "Extract customer, summary, and priority with a schema gate.",
    metadata: {
      mode: "live",
      usesExtractor: true,
    },
    model: options.model,
    text: ({ input }) => input,
    outputSchema: ticketExtractionSchema,
    instructions:
      "Extract a support ticket into the requested schema. Use customer null when the customer is not explicitly named. Priority must be low, normal, or high; use normal only as the documented fallback when the ticket has no explicit severity signal. Do not invent customer details.",
  });

  return createRouteStage(extractedPipeline);
}
