// SPDX-License-Identifier: MIT
import type {
  CutFrequency,
  EnzymeGroup,
  EnzymeSiteResult,
  InstantRestrictionMapperInput,
  MethylationStatus,
  OverhangType,
  Topology,
} from "./schemas.js";

export type {
  CutFrequency,
  EnzymeGroup,
  EnzymeSiteResult,
  InstantRestrictionMapperInput,
  MethylationStatus,
  OverhangType,
  Topology,
};

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface RunResult<T = InstantRestrictionMapperResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { message?: string; code?: string; details?: unknown } | null;
  result_url?: string;
  permalink?: string;
  duration_ms?: number;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export interface InstantRestrictionMapperResult {
  sequence_name?: string;
  sequence_length?: number;
  topology?: Topology | string;
  groups?: EnzymeGroup[];
  all_enzymes?: EnzymeSiteResult[];
  fragment_sizes?: number[];
  selected_fragment_sizes?: number[];
  warnings?: string[];
  fasta_header_stripped?: boolean;
  error?: string;
  metadata?: {
    enzyme_db_version?: string;
    enzyme_count?: number;
    db_last_updated?: string;
    filters?: {
      cut_frequency?: CutFrequency;
      hide_short_sites?: boolean;
      show_isoschizomers?: boolean;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly runId?: string;
  readonly code?: string;

  constructor(
    message: string,
    opts: { status: number; body?: unknown; runId?: string; code?: string },
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.body = opts.body;
    this.runId = opts.runId;
    this.code = opts.code;
  }
}
