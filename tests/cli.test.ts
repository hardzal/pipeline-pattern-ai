import { describe, expect, it } from "vitest";

import {
  formatHelp,
  parseCliArgs,
  validateCliArgs,
} from "../src/index.js";

describe("CLI arguments", () => {
  it("parses a workflow command and its options", () => {
    expect(
      parseCliArgs([
        "article-refiner",
        "--mode",
        "mock",
        "--file",
        "examples/article-brief.json",
        "--json",
      ]),
    ).toEqual({
      command: "article-refiner",
      mode: "mock",
      file: "examples/article-brief.json",
      json: true,
      output: undefined,
      timeoutMs: undefined,
      help: false,
    });
  });

  it("accepts help without a command", () => {
    expect(parseCliArgs(["--help"])).toEqual({
      command: undefined,
      mode: "mock",
      file: undefined,
      json: false,
      output: undefined,
      timeoutMs: undefined,
      help: true,
    });
  });

  it("parses an output path and a positive timeout", () => {
    expect(
      parseCliArgs([
        "ticket-triage",
        "--file",
        "examples/support-ticket.txt",
        "--output",
        "outputs/ticket.json",
        "--timeout",
        "2500",
      ]),
    ).toEqual({
      command: "ticket-triage",
      mode: "mock",
      file: "examples/support-ticket.txt",
      json: false,
      output: "outputs/ticket.json",
      timeoutMs: 2500,
      help: false,
    });
  });

  it("rejects an unknown command", () => {
    expect(() => parseCliArgs(["unknown-workflow"])).toThrow(
      "Unknown command: unknown-workflow",
    );
  });

  it("rejects a missing mode value", () => {
    expect(() => parseCliArgs(["article-refiner", "--mode"])).toThrow(
      "Option --mode requires a value",
    );
  });

  it("requires a command when help is not requested", () => {
    expect(() => validateCliArgs(parseCliArgs([]))).toThrow(
      "A command is required",
    );
  });

  it("documents all planned commands in the help text", () => {
    const help = formatHelp();

    expect(help).toContain("article-refiner");
    expect(help).toContain("idea-review-board");
    expect(help).toContain("ticket-triage");
    expect(help).toContain("--mode mock|live");
    expect(help).toContain("--output <path>");
    expect(help).toContain("--timeout <ms>");
  });
});
