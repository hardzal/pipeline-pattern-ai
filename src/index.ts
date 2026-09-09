import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadConfig, type AppMode } from "./config.js";

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

  return { command, mode, file, json, help };
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

export function main(argv: string[] = process.argv.slice(2)): number {
  try {
    const args = parseCliArgs(argv);

    // Running without a command is treated as a request for usage help.
    if (args.help || args.command === undefined) {
      console.log(formatHelp());
      return 0;
    }

    validateCliArgs(args);

    const config = loadConfig(args.mode);

    const status = {
      status: "ready",
      command: args.command,
      mode: config.mode,
      file: args.file ?? null,
      json: args.json,
      message:
        "CLI configuration is valid. This workflow will be implemented in a later milestone.",
    };

    if (args.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log("AI Pattern CLI");
      console.log(`Command: ${status.command}`);
      console.log(`Mode: ${status.mode}`);
      if (status.file !== null) {
        console.log(`Input file: ${status.file}`);
      }
      console.log(status.message);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    console.error("Run `pnpm dev --help` for usage.");
    return 1;
  }
}

if (isMainModule()) {
  process.exitCode = main();
}
