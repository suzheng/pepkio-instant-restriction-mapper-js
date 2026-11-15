# Pepkio Instant Restriction Mapper

Node.js and TypeScript client library with CLI for automated restriction enzyme cut-site detection, single-cutter cloning vector selection, and virtual digestion fragment sizing via the Pepkio Tools API.

# What It Does

Restriction mapping is an essential step in molecular cloning, plasmid construct validation, and diagnostic restriction digest design. Manual restriction site analysis is error-prone due to degenerate IUPAC recognition motifs, non-palindromic sequences, cleavage overhang offsets, and circular plasmid topology origin-wrapping.

This package provides a typed Node.js client and command-line interface for the Pepkio Instant Restriction Mapper REST API. It enables researchers to scan linear or circular DNA sequences against REBASE-curated restriction endonucleases, identify exact 5' and 3' strand cleavage positions, determine overhang chemistry (5' sticky, 3' sticky, blunt), filter for unique single cutters, check methylation sensitivity (Dam, Dcm, CpG), and compute fragment length distributions for virtual digestions.

Programmatic runs require a network connection and a Pepkio API key. Calculations are processed via the Pepkio Tools API.

# Features

- **REBASE-Curated Enzyme Database**: Maps cleavage sites for common Type II, Type IIP, and Type IIS restriction enzymes (e.g., EcoRI, BamHI, HindIII, BsaI, BsmBI, NotI).
- **Topology-Aware Digest Simulation**: Accurately computes cleavage coordinates and fragment length distributions for both circular plasmids (accounting for origin-spanning fragments) and linear DNA templates.
- **Single-Cutter & Cut Frequency Filtering**: Quickly identifies unique restriction sites for cloning vector linearization, multiple cloning site (MCS) verification, and insert screening.
- **Overhang & Geometry Classification**: Reports exact cut positions and specifies 5' overhang, 3' overhang, or blunt ends.
- **Methylation Sensitivity Awareness**: Identifies overlapping Dam, Dcm, or CpG methylation sites that may block enzyme cleavage.
- **Typed ESM Client**: Full TypeScript type definitions, Zod validation, and helper methods (`mapSequence`, `findSingleCutters`, `findDoubleCutters`, `findAllCutters`, `simulateDigest`).
- **Command-Line Interface (CLI)**: Inspect manifests and run restriction mapping calculations directly from your terminal.

# Installation

```bash
npm install pepkio-instant-restriction-mapper
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before invoking `run()`:

```bash
export PEPKIO_API_KEY="your-api-key"
```

Create and manage keys in your [Pepkio Account](https://www.pepkio.com/account/api-keys).

Optional configuration variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (required for `run`) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default: `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-instant-restriction-mapper";

const client = new PepkioClient({ apiKey: process.env.PEPKIO_API_KEY });

// 1. Scan DNA sequence for unique single-cutter restriction sites
const result = await client.findSingleCutters(
  "GAATTCATCGATGCATGCGAATTC",
  { topology: "linear" }
);

if (result.result) {
  console.log(`Found ${result.result.all_enzymes.length} enzymes`);
  for (const enzyme of result.result.all_enzymes) {
    console.log(`- ${enzyme.name}: cuts at ${enzyme.cut_positions.join(", ")}`);
  }
}

// 2. Or run with a predefined manifest example
const exampleInput = await client.getExampleInput("eco_single_site");
const exampleResult = await client.run(exampleInput);
console.log("Run status:", exampleResult.status);
console.log("Permalink:", exampleResult.permalink);
```

# CLI

```bash
# List available manifest examples
npx pepkio-instant-restriction-mapper manifest --examples

# Run a manifest example
npx pepkio-instant-restriction-mapper run --example eco_single_site

# Run analysis on a custom DNA sequence
npx pepkio-instant-restriction-mapper run --sequence "GAATTCGCGGCCGC" --topology linear
```

# Typical Use Cases

- **Cloning Vector Linearization**: Identify unique single-cutter restriction enzymes within a multiple cloning site (MCS) without disrupting essential plasmid elements.
- **Diagnostic Restriction Digest Verification**: Predict expected fragment size distributions to compare against agarose gel electrophoresis bands.
- **Golden Gate & Type IIS Assembly**: Verify absence of internal recognition sites (e.g., BsaI, BsmBI) in coding sequences and insert fragments.
- **Methylation Conflict Detection**: Detect potential cleavage inhibition caused by overlapping Dam or Dcm bacterial methyltransferase sites.

# Scientific Background

Type II restriction endonucleases recognize specific palindromic or asymmetric double-stranded DNA sequences, typically 4 to 8 base pairs in length, and cleave phosphodiester bonds to produce blunt or staggered (sticky) ends. In circular plasmids, $N$ cleavage sites divide the DNA into $N$ fragments, with fragments crossing the sequence coordinate origin $(1 / L)$ having wrapped boundaries. Linear DNA molecules cut at $N$ sites generate $N + 1$ fragments. Overlapping prokaryotic methylation (Dam $G\text{m}^6\text{ATC}$, Dcm $C\text{m}^5\text{CAGG}$) can sterically inhibit endonuclease binding and catalysis.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/instant-restriction-mapper

The web interface provides an interactive circular plasmid map viewer, virtual agarose gel simulation lanes, enzyme search filters, and shareable permalinks.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-instant-restriction-mapper-js

Web Application: https://www.pepkio.com/tools/instant-restriction-mapper

Python client (PyPI): https://pypi.org/project/pepkio-instant-restriction-mapper/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/9f04660cdb281828e1b116ec2d95ca281fb0a572ce1beba50a5cce70b232c1bd)
