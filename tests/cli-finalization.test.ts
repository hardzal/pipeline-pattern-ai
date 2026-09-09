import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { writeWorkflowOutput } from "../src/cli/output-file.js";
import { runWorkflowWithPolicy } from "../src/cli/runtime.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("CLI output file", () => {
  it("writes output and refuses to overwrite an existing file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-pattern-output-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "result.json");

    await writeWorkflowOutput(outputPath, '{"ok":true}\n');

    expect(await readFile(outputPath, "utf8")).toBe('{"ok":true}\n');
    await expect(writeWorkflowOutput(outputPath, "replacement\n")).rejects.toThrow(
      "Output file already exists",
    );
    expect(await readFile(outputPath, "utf8")).toBe('{"ok":true}\n');
  });
});

describe("CLI workflow execution policy", () => {
  it("retries a transient upstream failure once", async () => {
    let attempts = 0;
    const workflow = {
      run: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("temporary upstream failure"), {
            status: 503,
          });
        }

        return { runId: "run-1", output: "ok" };
      },
    };

    const result = await runWorkflowWithPolicy(workflow, "input", {
      timeoutMs: 1_000,
      maxAttempts: 2,
    });

    expect(result.output).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry a non-transient failure", async () => {
    let attempts = 0;
    const workflow = {
      run: async () => {
        attempts += 1;
        throw new Error("invalid input");
      },
    };

    await expect(
      runWorkflowWithPolicy(workflow, "input", {
        timeoutMs: 1_000,
        maxAttempts: 2,
      }),
    ).rejects.toThrow("invalid input");
    expect(attempts).toBe(1);
  });

  it("aborts a workflow that exceeds its timeout", async () => {
    vi.useFakeTimers();
    const workflow = {
      run: ({ abortSignal }: { abortSignal?: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          abortSignal?.addEventListener("abort", () => {
            reject(new Error("aborted by policy"));
          });
        }),
    };

    const pending = runWorkflowWithPolicy(workflow, "input", {
      timeoutMs: 100,
      maxAttempts: 1,
    });
    const timeoutAssertion = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(100);

    await timeoutAssertion;
  });
});
