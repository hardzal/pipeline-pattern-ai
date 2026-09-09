# AI Agent Pipeline Patterns

A TypeScript CLI learning project for exploring three common AI agent pipeline patterns through small, practical case studies.

![AI Agent Pipeline Pattern case studies](docs/details-submission.png)

## Overview

This project contains three case studies. Each one introduces a different way to compose AI-powered steps into a predictable workflow:

| # | Case study | Pipeline pattern | Flow |
|---|---|---|---|
| 01 | Article Refiner | Sequential pipeline | Draft → Critique → Rewrite |
| 02 | Idea Review Board | Parallel fan-out and merge | Pitch → CEO / Analyst / CTO → Merge |
| 03 | Ticket Triage | Structured extraction and routing | Ticket → Schema → Route |

## Case Studies

### 01. Article Refiner

> Chain draft → critique → rewrite so each stage reasons over the last.

The Article Refiner demonstrates a three-step sequential pipeline (`.step() × 3`). Each stage receives the result of the previous stage as its input.

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

The Idea Review Board demonstrates parallel fan-out followed by a merge step (`.parallel() + .step()`). A single startup pitch is reviewed from three independent perspectives.

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

Ticket Triage demonstrates structured output validation followed by deterministic routing (`schema + .step()`). An unstructured support ticket must pass through a schema gate before application code routes it.

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
- **Provider isolation** — keep workflow logic separate from the selected LLM provider.
- **Testability** — allow real model clients to be replaced by deterministic fakes in tests.
- **Observability** — expose stage results, errors, and execution time where useful.
- **Safe termination** — use explicit limits for any workflow that may retry or loop.

## Tech Stack

- TypeScript
- Node.js
- pnpm
- tsx for local execution

Additional AI, validation, CLI, and testing dependencies will be introduced incrementally as each case study is implemented.

## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
pnpm install
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

Each case study should first be implemented with deterministic fake agents. A real LLM provider can then be connected after the workflow behavior is covered by tests.

## Current Status

The repository currently contains the initial TypeScript project setup and the definitions of the three planned case studies. Implementation begins with **Article Refiner**.
