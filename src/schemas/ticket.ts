import { z } from "zod";

export const ticketTextSchema = z.string().trim().min(1, "Ticket text is required");

export const ticketPrioritySchema = z.enum(["low", "normal", "high"]);

export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketRouteSchema = z.enum([
  "urgent-review",
  "standard-queue",
  "low-priority-queue",
]);

export type TicketRoute = z.infer<typeof ticketRouteSchema>;

export const ticketExtractionSchema = z.object({
  customer: z.string().trim().min(1).nullable(),
  summary: z.string().trim().min(1),
  priority: ticketPrioritySchema,
});

export type TicketExtraction = z.infer<typeof ticketExtractionSchema>;

export const ticketTriageResultSchema = z.object({
  ticket: ticketExtractionSchema,
  route: ticketRouteSchema,
  reason: z.string().trim().min(1),
});

export type TicketTriageResult = z.infer<typeof ticketTriageResultSchema>;
