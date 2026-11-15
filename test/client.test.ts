// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError, type ToolManifest } from "../src/types.js";

const mockManifest: ToolManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "Instant Restriction Mapper",
  description: "Client-side restriction enzyme finder with circular/linear maps, methylation warnings, compatible-end grouping, virtual gel preview, and SVG/PNG export — no server upload.",
  examples: [
    {
      name: "eco_single_site",
      description: "Linear DNA with single EcoRI site",
      input: {
        sequence: "AAAAAAAAAAGAATTCAAAAAAAAAA",
        topology: "linear",
        cut_frequency: 1,
      },
      output: {
        all_enzymes: [{ name: "EcoRI" }],
      },
    },
    {
      name: "short_sequence_warning",
      description: "Short sequence triggers warning",
      input: {
        sequence: "ATGC",
      },
      output: {
        warnings: ["Sequence too short"],
      },
    },
    {
      name: "invalid_chars",
      description: "Invalid non-IUPAC characters",
      input: {
        sequence: "ATGCXGG",
      },
      output: {
        error: "Sequence contains non-IUPAC characters",
      },
    },
  ],
};

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves default production base URL", () => {
    delete process.env.PEPKIO_API_BASE_URL;
    expect(resolveBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
  });

  it("resolves PEPKIO_API_BASE_URL environment override", () => {
    process.env.PEPKIO_API_BASE_URL = "https://custom.endpoint.com/";
    expect(resolveBaseUrl()).toBe("https://custom.endpoint.com");
  });

  it("resolves explicit base URL override over env", () => {
    process.env.PEPKIO_API_BASE_URL = "https://custom.endpoint.com";
    expect(resolveBaseUrl("https://explicit.endpoint.com/")).toBe("https://explicit.endpoint.com");
  });

  it("identifies local test URLs", () => {
    expect(isLocalUrl("https://tools.localtest.me")).toBe(true);
    expect(isLocalUrl("http://localhost:3004")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:3004")).toBe(true);
    expect(isLocalUrl("https://tools.pepkio.com")).toBe(false);
  });

  it("resolves production API key from PEPKIO_API_KEY", () => {
    process.env.PEPKIO_API_KEY = "prod-key-123";
    delete process.env.LOCAL_PEPKIO_API_KEY;
    expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-key-123");
  });

  it("resolves local API key from LOCAL_PEPKIO_API_KEY when available", () => {
    process.env.PEPKIO_API_KEY = "prod-key-123";
    process.env.LOCAL_PEPKIO_API_KEY = "local-key-456";
    expect(resolveApiKey("https://tools.localtest.me")).toBe("local-key-456");
  });

  it("falls back to PEPKIO_API_KEY on local URL when LOCAL_PEPKIO_API_KEY is unset", () => {
    process.env.PEPKIO_API_KEY = "fallback-key";
    delete process.env.LOCAL_PEPKIO_API_KEY;
    expect(resolveApiKey("https://tools.localtest.me")).toBe("fallback-key");
  });

  it("formats API paths consistently", () => {
    expect(apiPath("https://tools.pepkio.com", "/tools/instant-restriction-mapper/manifest")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/instant-restriction-mapper/manifest",
    );
    expect(apiPath("https://tools.pepkio.com", "runs/123")).toBe(
      "https://tools.pepkio.com/api/tools/v1/runs/123",
    );
  });
});

describe("schemas & parseRunInput", () => {
  it("validates and parses required sequence", () => {
    const input = parseRunInput({
      sequence: "GAATTC",
    });
    expect(input.sequence).toBe("GAATTC");
  });

  it("parses optional options like topology and cut_frequency", () => {
    const input = parseRunInput({
      sequence: "AAAAAAAAAAGAATTCAAAAAAAAAA",
      topology: "linear",
      cut_frequency: 1,
      hide_short_sites: true,
      show_isoschizomers: false,
      selected_enzymes: ["EcoRI", "BamHI"],
    });
    expect(input.topology).toBe("linear");
    expect(input.cut_frequency).toBe(1);
    expect(input.selected_enzymes).toEqual(["EcoRI", "BamHI"]);
  });

  it("throws validation error on empty sequence", () => {
    expect(() => parseRunInput({ sequence: "" })).toThrow();
  });

  it("throws validation error on missing sequence", () => {
    expect(() => parseRunInput({})).toThrow();
  });
});

describe("PepkioClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("instantiates with default base URL", () => {
    const client = new PepkioClient();
    expect(client.getBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it("fetches and caches tool manifest", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient();
    const manifest = await client.getManifest();
    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.examples).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cached call
    const cached = await client.getManifest();
    expect(cached).toBe(manifest);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lists examples from manifest", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient();
    const examples = await client.getExamples();
    expect(examples).toHaveLength(3);
    expect(examples[0].name).toBe("eco_single_site");
  });

  it("retrieves example input by name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient();
    const input = await client.getExampleInput("eco_single_site");
    expect(input.sequence).toBe("AAAAAAAAAAGAATTCAAAAAAAAAA");
    expect(input.topology).toBe("linear");
    expect(input.cut_frequency).toBe(1);
  });

  it("throws for unknown example name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient();
    await expect(client.getExampleInput("nonexistent_example")).rejects.toThrow(
      /Example "nonexistent_example" not found/,
    );
  });

  it("executes run with authentication and valid payload", async () => {
    const mockRunResponse = {
      run_id: "run-test-123",
      status: "completed",
      result: {
        sequence_name: "Untitled",
        sequence_length: 26,
        topology: "linear",
        groups: [
          {
            overhang: "5",
            label: "5′ overhang",
            enzymes: [
              {
                name: "EcoRI",
                recognition: "GAATTC",
                overhang: "5",
                cut_count: 1,
                positions: [10],
                cut_positions: [11],
                methylation: { blocked: false, reasons: [] },
                blocked: false,
                is_primary: true,
              },
            ],
          },
        ],
        all_enzymes: [
          {
            name: "EcoRI",
            recognition: "GAATTC",
            overhang: "5",
            cut_count: 1,
            positions: [10],
            cut_positions: [11],
            methylation: { blocked: false, reasons: [] },
            blocked: false,
            is_primary: true,
          },
        ],
        fragment_sizes: [26],
        selected_fragment_sizes: [],
        warnings: [],
      },
      error: null,
      result_url: "https://tools.pepkio.com/api/tools/v1/runs/run-test-123",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockRunResponse),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-token" });
    const result = await client.run({
      sequence: "AAAAAAAAAAGAATTCAAAAAAAAAA",
      topology: "linear",
      cut_frequency: 1,
    });

    expect(result.status).toBe("completed");
    expect(result.run_id).toBe("run-test-123");
    expect(result.result?.all_enzymes?.[0].name).toBe("EcoRI");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/instant-restriction-mapper/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws 401 when running without API key", async () => {
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;

    const client = new PepkioClient({ apiKey: undefined });
    await expect(
      client.run({
        sequence: "GAATTC",
      }),
    ).rejects.toThrow(PepkioAPIError);
  });

  it("handles HTTP error status codes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "Invalid DNA characters" }),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.run({ sequence: "XYZ" })).rejects.toMatchObject({
      name: "PepkioAPIError",
      status: 400,
      message: "Invalid DNA characters",
    });
  });

  it("handles top-level response body error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "failed-run-1",
          status: "failed",
          error: "Sequence parsing failed",
        }),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.run({ sequence: "ATCG" })).rejects.toMatchObject({
      name: "PepkioAPIError",
      message: "Sequence parsing failed",
      runId: "failed-run-1",
    });
  });

  it("supports convenience helpers: mapSequence, findSingleCutters, findDoubleCutters, findAllCutters, simulateDigest", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-helper",
          status: "completed",
          result: { sequence_length: 10 },
        }),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });

    await client.mapSequence("GAATTC");
    const call0 = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(call0.input).toEqual({ sequence: "GAATTC" });

    await client.findSingleCutters("GAATTC", { topology: "linear" });
    const call1 = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(call1.input).toEqual({ sequence: "GAATTC", topology: "linear", cut_frequency: 1 });

    await client.findDoubleCutters("GAATTC");
    const call2 = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(call2.input).toEqual({ sequence: "GAATTC", cut_frequency: 2 });

    await client.findAllCutters("GAATTC");
    const call3 = JSON.parse(fetchMock.mock.calls[3][1].body as string);
    expect(call3.input).toEqual({ sequence: "GAATTC", cut_frequency: "all" });

    await client.simulateDigest("GAATTC", ["EcoRI", "BamHI"]);
    const call4 = JSON.parse(fetchMock.mock.calls[4][1].body as string);
    expect(call4.input).toEqual({ sequence: "GAATTC", selected_enzymes: ["EcoRI", "BamHI"] });
  });

  it("fetches run by ID via getRun", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-999",
          status: "completed",
          result: { sequence_name: "Test" },
        }),
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const run = await client.getRun("run-999");
    expect(run.run_id).toBe("run-999");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/runs/run-999",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("polls run until completed with waitForRun", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ run_id: "poll-1", status: "running" }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            run_id: "poll-1",
            status: "completed",
            result: { sequence_length: 50 },
          }),
      };
    });
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.waitForRun("poll-1", { intervalMs: 10, timeoutMs: 500 });
    expect(res.status).toBe("completed");
    expect(callCount).toBe(2);
  });
});
