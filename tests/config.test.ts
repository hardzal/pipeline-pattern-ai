import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("allows mock mode without live credentials", () => {
    expect(loadConfig("mock", {})).toEqual({
      mode: "mock",
      apiKey: undefined,
      baseUrl: undefined,
      model: undefined,
    });
  });

  it("loads the live model configuration", () => {
    expect(
      loadConfig("live", {
        OPENAI_API_KEY: "test-api-key",
        OPENAI_API_BASE_URL: "https://llm.example.test/v1",
        LLM_MODEL: "test-model",
      }),
    ).toEqual({
      mode: "live",
      apiKey: "test-api-key",
      baseUrl: "https://llm.example.test/v1",
      model: "test-model",
    });
  });

  it("rejects live mode when required values are missing", () => {
    expect(() => loadConfig("live", {})).toThrow(
      "Live mode requires: OPENAI_API_KEY, OPENAI_API_BASE_URL, LLM_MODEL",
    );
  });

  it("treats blank environment values as missing", () => {
    expect(() =>
      loadConfig("live", {
        OPENAI_API_KEY: "",
        OPENAI_API_BASE_URL: " ",
        LLM_MODEL: "",
      }),
    ).toThrow(
      "Live mode requires: OPENAI_API_KEY, OPENAI_API_BASE_URL, LLM_MODEL",
    );
  });

  it("rejects an invalid base URL", () => {
    expect(() =>
      loadConfig("live", {
        OPENAI_API_KEY: "test-api-key",
        OPENAI_API_BASE_URL: "not-a-url",
        LLM_MODEL: "test-model",
      }),
    ).toThrow(ConfigError);
  });
});
