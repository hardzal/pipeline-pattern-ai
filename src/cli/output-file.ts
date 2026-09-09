import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class OutputFileExistsError extends Error {
  constructor(filePath: string) {
    super(`Output file already exists: ${filePath}`);
    this.name = "OutputFileExistsError";
  }
}

export async function writeWorkflowOutput(
  filePath: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await writeFile(filePath, content, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new OutputFileExistsError(filePath);
    }

    throw new Error(`Unable to write output file: ${filePath}`, {
      cause: error,
    });
  }
}
