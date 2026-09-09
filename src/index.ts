import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadConfig, type AppMode } from "./config.js";
import { readWorkflowInput } from "./cli/input.js";
import { formatWorkflowOutput } from "./cli/output.js";
import { writeWorkflowOutput } from "./cli/output-file.js";
import { runWorkflowWithPolicy } from "./cli/runtime.js";
import {
  createWorkflowRegistry,
  getWorkflow,
} from "./workflows/registry.js";

export type { AppMode } from "./config.js";

export const COMMANDS = [
  "article-refiner",
  "idea-review-board",
  "ticket-triage",
] as const;

export type CliCommand = (typeof COMMANDS)[number];

export type CliArgs = {
  command: CliCommand | undefined;
  mode: AppMode;
  file: string | undefined;
  json: boolean;
  output: string | undefined;
  timeoutMs: number | undefined;
  help: boolean;
};

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function formatHelp(): string {
  return `AI Pattern CLI

Usage:
  pnpm dev <command> [options]

Commands:
  article-refiner     Refine an article through draft, critique, and rewrite stages
  idea-review-board   Review a startup pitch from CEO, Analyst, and CTO perspectives
  ticket-triage       Extract ticket data and route it by priority

Options:
  --mode mock|live    Select the execution mode (default: mock)
  --file <path>      Read workflow input from a file
  --json              Print the result as JSON
  --output <path>    Write the formatted result to a new file
  --timeout <ms>     Abort a run that exceeds this timeout (default: 60000)
  -h, --help         Show this help message

Examples:
  pnpm dev article-refiner --mode mock --file examples/article-brief.json
  pnpm dev idea-review-board --mode mock --file examples/startup-pitch.txt
  pnpm dev ticket-triage --mode mock --file examples/support-ticket.txt --json
`;
}

function isCliCommand(value: string): value is CliCommand {
  return (COMMANDS as readonly string[]).includes(value);
}

function requireOptionValue(
  argv: string[],
  option: string,
  index: number,
): string {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new CliUsageError(`Option ${option} requires a value`);
  }

  return value;
}

export function parseCliArgs(argv: string[]): CliArgs {
  // `pnpm dev -- --help` may pass the separator through to the script.
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  let command: CliCommand | undefined;
  let mode: AppMode = "mock";
  let file: string | undefined;
  let json = false;
  let output: string | undefined;
  let timeoutMs: number | undefined;
  let help = false;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const argument = normalizedArgv[index];

    if (argument === undefined) {
      continue;
    }

    if (argument === "-h" || argument === "--help") {
      help = true;
      continue;
    }

    if (argument === "--json") {
      json = true;
      continue;
    }

    if (argument === "--mode" || argument.startsWith("--mode=")) {
      const value = argument.startsWith("--mode=")
        ? argument.slice("--mode=".length)
        : requireOptionValue(normalizedArgv, "--mode", index);

      if (argument === "--mode") {
        index += 1;
      }

      if (value !== "mock" && value !== "live") {
        throw new CliUsageError(
          `Invalid mode: ${value}. Expected "mock" or "live"`,
        );
      }

      mode = value;
      continue;
    }

    if (argument === "--file" || argument.startsWith("--file=")) {
      const value = argument.startsWith("--file=")
        ? argument.slice("--file=".length)
        : requireOptionValue(normalizedArgv, "--file", index);

      if (argument === "--file") {
        index += 1;
      }

      file = value;
      continue;
    }

    if (argument === "--output" || argument.startsWith("--output=")) {
      const value = argument.startsWith("--output=")
        ? argument.slice("--output=".length)
        : requireOptionValue(normalizedArgv, "--output", index);

      if (argument === "--output") {
        index += 1;
      }

      output = value;
      continue;
    }

    if (argument === "--timeout" || argument.startsWith("--timeout=")) {
      const rawValue = argument.startsWith("--timeout=")
        ? argument.slice("--timeout=".length)
        : requireOptionValue(normalizedArgv, "--timeout", index);

      if (argument === "--timeout") {
        index += 1;
      }

      const parsedValue = Number(rawValue);
      if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new CliUsageError(
          `Invalid timeout: ${rawValue}. Expected a positive integer in milliseconds`,
        );
      }

      timeoutMs = parsedValue;
      continue;
    }

    if (argument.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${argument}`);
    }

    if (command !== undefined) {
      throw new CliUsageError(`Unexpected argument: ${argument}`);
    }

    if (!isCliCommand(argument)) {
      throw new CliUsageError(`Unknown command: ${argument}`);
    }

    command = argument;
  }

  return { command, mode, file, json, output, timeoutMs, help };
}

export function validateCliArgs(args: CliArgs): void {
  if (!args.help && args.command === undefined) {
    throw new CliUsageError("A command is required. Use --help to see usage");
  }
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];

  return (
    entrypoint !== undefined &&
    fileURLToPath(import.meta.url) === resolve(entrypoint)
  );
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  try {
    const args = parseCliArgs(argv);

    // Running without a command is treated as a request for usage help.
    if (args.help || args.command === undefined) {
      console.log(formatHelp());
      return 0;
    }

    validateCliArgs(args);

    const config = loadConfig(args.mode);

    const registry = createWorkflowRegistry(config);
    const workflow = getWorkflow(registry, args.command);
    const input = await readWorkflowInput(args.command, args.file);
    const result = await runWorkflowWithPolicy(
      workflow,
      input,
      args.timeoutMs === undefined ? {} : { timeoutMs: args.timeoutMs },
    );
    const formattedOutput = formatWorkflowOutput(result.output, {
      json: args.json,
      mode: config.mode,
      runId: result.runId,
    });

    if (args.output !== undefined) {
      await writeWorkflowOutput(args.output, `${formattedOutput}\n`);
    }

    console.log(formattedOutput);

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    console.error("Run `pnpm dev --help` for usage.");
    return 1;
  }
}

if (isMainModule()) {
  void main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
