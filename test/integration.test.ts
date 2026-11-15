// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { PepkioClient } from "../src/client.js";
import { TOOL_ID } from "../src/config.js";

const LOCAL_BASE_URL = "https://tools.localtest.me";
const PRODUCTION_BASE_URL = "https://tools.pepkio.com";

function envConfig(env: "local" | "production") {
  const baseUrl = process.env.PEPKIO_API_BASE_URL
    ? process.env.PEPKIO_API_BASE_URL.replace(/\/$/, "")
    : env === "local"
      ? LOCAL_BASE_URL
      : PRODUCTION_BASE_URL;

  const isLocal = baseUrl.includes("localtest.me");
  const apiKey = isLocal
    ? process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY
    : process.env.PEPKIO_API_KEY;

  return { baseUrl, apiKey, isLocal };
}

describe("integration: local", () => {
  const { baseUrl, apiKey } = envConfig("local");

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Instant Restriction Mapper");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("eco_single_site");
      expect(names).toContain("short_sequence_warning");
      expect(names).toContain("invalid_chars");
    },
    30_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs eco_single_site example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("eco_single_site");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.sequence_length).toBe(26);
      expect(result.result?.topology).toBe("linear");

      const enzymeNames = result.result?.all_enzymes?.map((e) => e.name) ?? [];
      expect(enzymeNames).toContain("EcoRI");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs short_sequence_warning example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("short_sequence_warning");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.warnings?.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs invalid_chars example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("invalid_chars");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.run_id).toBeTruthy();
      expect(result.result?.error).toContain("non-IUPAC");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs findSingleCutters and simulateDigest convenience methods",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const res = await client.findSingleCutters(
        "AAAAAAAAAAGAATTCAAAAAAAAAAGGATCCAAAAAAAAAA",
        { topology: "linear", sequence_name: "TestInsert" },
      );

      expect(res.status).toBe("completed");
      expect(res.result?.sequence_name).toBe("TestInsert");
      const names = res.result?.all_enzymes?.map((e) => e.name) ?? [];
      expect(names).toContain("EcoRI");
      expect(names).toContain("BamHI");

      const digest = await client.simulateDigest(
        "AAAAAAAAAAGAATTCAAAAAAAAAAGGATCCAAAAAAAAAA",
        ["EcoRI"],
        { topology: "linear" },
      );
      expect(digest.status).toBe("completed");
      expect(digest.result?.selected_fragment_sizes).toBeDefined();
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "retrieves previous run by ID",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("eco_single_site");
      const initial = await client.run(input);

      expect(initial.run_id).toBeTruthy();
      const fetched = await client.getRun(initial.run_id);
      expect(fetched.run_id).toBe(initial.run_id);
      expect(fetched.status).toBe("completed");
      expect(fetched.result?.sequence_length).toBe(26);
    },
    60_000,
  );
});

describe("integration: production", () => {
  const { baseUrl, apiKey } = envConfig("production");

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Instant Restriction Mapper");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("eco_single_site");
      expect(names).toContain("short_sequence_warning");
      expect(names).toContain("invalid_chars");
    },
    30_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs eco_single_site example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("eco_single_site");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.sequence_length).toBe(26);
      expect(result.result?.topology).toBe("linear");

      const enzymeNames = result.result?.all_enzymes?.map((e) => e.name) ?? [];
      expect(enzymeNames).toContain("EcoRI");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs short_sequence_warning example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("short_sequence_warning");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.warnings?.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs invalid_chars example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("invalid_chars");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.run_id).toBeTruthy();
      expect(result.result?.error).toContain("non-IUPAC");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs findSingleCutters and simulateDigest convenience methods",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const res = await client.findSingleCutters(
        "AAAAAAAAAAGAATTCAAAAAAAAAAGGATCCAAAAAAAAAA",
        { topology: "linear", sequence_name: "TestInsert" },
      );

      expect(res.status).toBe("completed");
      expect(res.result?.sequence_name).toBe("TestInsert");
      const names = res.result?.all_enzymes?.map((e) => e.name) ?? [];
      expect(names).toContain("EcoRI");
      expect(names).toContain("BamHI");

      const digest = await client.simulateDigest(
        "AAAAAAAAAAGAATTCAAAAAAAAAAGGATCCAAAAAAAAAA",
        ["EcoRI"],
        { topology: "linear" },
      );
      expect(digest.status).toBe("completed");
      expect(digest.result?.selected_fragment_sizes).toBeDefined();
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "retrieves previous run by ID",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("eco_single_site");
      const initial = await client.run(input);

      expect(initial.run_id).toBeTruthy();
      const fetched = await client.getRun(initial.run_id);
      expect(fetched.run_id).toBe(initial.run_id);
      expect(fetched.status).toBe("completed");
      expect(fetched.result?.sequence_length).toBe(26);
    },
    60_000,
  );
});
