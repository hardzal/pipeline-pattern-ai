# AI Agent Pipeline Patterns

A TypeScript CLI learning project for exploring three common AI agent pipeline patterns through small, practical case studies built with the [Anvia SDK](https://github.com/anvia-hq/anvia).

![AI Agent Pipeline Pattern case studies](docs/details-submission.png)

## Overview

This project contains three case studies. Each one introduces a different way to compose AI-powered steps into a predictable workflow:

| # | Case study | Pipeline pattern | Anvia primitive | Flow |
|---|---|---|---|---|
| 01 | Article Refiner | Sequential pipeline | `.step()` × 3 | Draft → Critique → Rewrite |
| 02 | Idea Review Board | Parallel fan-out and merge | `.parallel()` + `.step()` | Pitch → CEO / Analyst / CTO → Merge |
| 03 | Ticket Triage | Structured extraction and routing | `.extract()` + `.step()` | Ticket → Schema → Route |

## Case Studies

### 01. Article Refiner

> Chain draft → critique → rewrite so each stage reasons over the last.

The Article Refiner demonstrates a three-step sequential Anvia `Pipeline` (`.step()` × 3). Each stage receives the result of the previous stage as its input.

```text
Draft
  ↓
Critique
  ↓
Rewrite
```

Stages:

1. **Draft** — generates or accepts an initial article draft.
2. **Critique** — reviews the draft and identifies weaknesses or possible improvements.
3. **Rewrite** — produces a refined article using both the draft and its critique.

Learning goals:

- Compose dependent AI steps sequentially.
- Pass typed context between pipeline stages.
- Separate content generation, evaluation, and revision responsibilities.
- Observe how the output of one agent influences the next agent.

### 02. Idea Review Board

> Fan one startup pitch to CEO, analyst, and CTO branches, then merge the verdicts.

The Idea Review Board demonstrates Anvia's parallel fan-out followed by a merge step (`.parallel() + .step()`). A single startup pitch is reviewed from three independent perspectives.

```text
                 ┌→ CEO ─────┐
Pitch ───────────┼→ Analyst ─┼→ Merge
                 └→ CTO ─────┘
```

Review branches:

- **CEO** — reviews vision, strategy, and business potential.
- **Analyst** — reviews market assumptions, evidence, risks, and viability.
- **CTO** — reviews technical feasibility, complexity, and scalability.
- **Merge** — combines the independent reviews into one final verdict.

Learning goals:

- Run independent AI tasks concurrently.
- Model fan-out/fan-in workflows.
- Preserve each reviewer's role and perspective.
- Merge multiple outputs into a coherent recommendation.

### 03. Ticket Triage

> Extract typed ticket fields behind a schema gate, then route by priority in TypeScript.

Ticket Triage demonstrates Anvia structured extraction followed by deterministic routing (`.extract() + .step()`). An unstructured support ticket must pass through a Zod schema gate before application code routes it.

```text
Ticket
  ↓
Schema
  ↓
Route
```

Stages:

1. **Ticket** — receives an unstructured support request.
2. **Schema** — extracts and validates typed ticket fields.
3. **Route** — uses TypeScript logic to route the validated ticket by priority.

Learning goals:

- Convert unstructured model output into typed data.
- Validate AI output before using it in application logic.
- Keep probabilistic extraction separate from deterministic routing.
- Handle invalid or incomplete model responses safely.

## Project Principles

The implementations in this repository should follow these principles:

- **Typed boundaries** — define explicit TypeScript types for every stage input and output.
- **Structured outputs** — validate model-generated data before consuming it.
- **Small, focused steps** — give every pipeline stage one clear responsibility.
- **Provider isolation** — use Anvia's provider-neutral runtime so workflow logic remains separate from the selected LLM provider.
- **Testability** — allow real model clients to be replaced by deterministic fakes in tests.
- **Observability** — expose stage results, errors, and execution time where useful.
- **Safe termination** — use explicit limits for any workflow that may retry or loop.

## Tech Stack

- TypeScript
- Node.js 20.12 or newer
- pnpm
- tsx for local execution
- [Anvia SDK](https://docs.anvia.dev/) for agents, structured extraction, and pipeline composition
- [Anvia Studio](https://docs.anvia.dev/) for visual workflow demos and pipeline inspection
- Zod for typed pipeline boundaries and structured output validation

The core pipeline runtime is provided by `@anvia/core`, while `@anvia/studio` provides the local visual inspection UI. A provider adapter such as `@anvia/openai`, `@anvia/anthropic`, `@anvia/gemini`, or `@anvia/mistral` will be selected separately, keeping the pipeline provider-neutral.

## Why Anvia

Anvia maps directly to the three patterns explored by this project:

- `Pipeline.step()` composes sequential transformations for Article Refiner.
- `Pipeline.parallel()` fans a pitch out to named reviewer branches for Idea Review Board.
- `Pipeline.extract()` turns an unstructured ticket into schema-validated data for Ticket Triage.
- `Pipeline.run()` executes the composed workflow and returns its typed output.
- `Studio` displays registered pipelines as inspectable workflow graphs for demonstrations.

The application remains responsible for creating provider clients, reading credentials from environment variables, and passing configured models into Anvia agents or extractors.

## Workflow Demos with Anvia Studio

The three workflows will be registered in Anvia Studio so their stages, branches, inputs, outputs, and execution logs can be inspected visually during demonstrations.

```ts
import { Studio } from "@anvia/studio";

new Studio([
  articleRefinerPipeline,
  ideaReviewBoardPipeline,
  ticketTriagePipeline,
]).start({ port: 4021 });
```

Each pipeline and step should define a stable `id`, readable `name`, and useful `description`. These values become part of the Studio presentation and make the workflow graph easier to understand.

The intended demo flow is:

1. Start Anvia Studio locally.
2. Open the Studio UI in a browser.
3. Select one of the registered pipelines.
4. Provide sample input and run the workflow.
5. Inspect the graph and the result of each stage.

Studio is a development and demonstration surface. The CLI remains the primary application interface, and both interfaces use the same pipeline instances as their source of truth.

## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
pnpm install
```

The Anvia packages will be added during the first implementation milestone. The base installation will use:

```bash
pnpm add @anvia/core @anvia/studio zod
```

The chosen model provider requires one matching adapter, for example:

```bash
pnpm add @anvia/openai
```

### Run the project

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Implementation Roadmap

The case studies will be developed in this order:

1. **Article Refiner** — sequential composition and context passing.
2. **Idea Review Board** — parallel execution and result aggregation.
3. **Ticket Triage** — schema validation and deterministic routing.

Each case study should first exercise its deterministic pipeline shape with Anvia steps. Real agents and a model provider can then be connected after the workflow behavior is covered by tests. Once a pipeline works, it will also be registered in Anvia Studio as a visual demo before development moves to the next case study.

## Current Status

The repository currently contains the initial TypeScript project setup and the definitions of the three planned case studies. Implementation begins with **Article Refiner**.
