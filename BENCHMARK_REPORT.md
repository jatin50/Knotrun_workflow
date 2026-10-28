# ⚡ Performance & Scalability Benchmark Report

Official benchmark results for the **n8n Workflow Automation Platform**. Evaluated across execution engine throughput, multi-node DAG pipelines, heavy data processing scale, memory stability, and HTTP API concurrency.

---

## 🖥 Test Environment

| Property | Value |
|---|---|
| **OS Platform** | Windows 11 (x64) |
| **Node.js Runtime** | v24.22.0 |
| **Processor** | 12x AMD Ryzen 5 7535HS (with Radeon Graphics) |
| **Total System RAM** | 16 GB |
| **Benchmark Script** | `npm run bench` (`scripts/benchmark.mjs`) |

---

## 📊 Summary Scorecard

```
========================================================================================
Test Suite                            Throughput          Avg Latency    p95 Latency
========================================================================================
5-Node Linear Workflow Pipeline       49,755 ops/sec      0.0199 ms      0.0336 ms
Switch Router Pipeline                124,891 ops/sec     0.0079 ms      0.0108 ms
Math Node Calculation                 652,656 ops/sec     0.0013 ms      0.0015 ms
Text Transform & Regex                661,599 ops/sec     0.0014 ms      0.0016 ms
Crypto SHA-256 Hashing                286,726 ops/sec     0.0033 ms      0.0052 ms
Expression Interpolator Engine        288,413 ops/sec     0.0033 ms      0.0053 ms
Sandboxed VM Execution (Isolated)      1,226 ops/sec      0.8148 ms      1.1224 ms
Live HTTP API Throughput               2,062 req/sec      9.32 ms        21.16 ms
========================================================================================
```

---

## 🔬 Suite 1: Node & Utility Micro-benchmarks

Evaluated over **10,000 consecutive runs per test**:

| Component | Operations / sec | Average Latency | p95 Latency | p99 Latency |
|---|---|---|---|---|
| **Math Calculation** (`math.calculate`) | **652,656 ops/s** | 0.0013 ms | 0.0015 ms | 0.0031 ms |
| **Text Transform** (`data.text`) | **661,599 ops/s** | 0.0014 ms | 0.0016 ms | 0.0020 ms |
| **Crypto SHA-256** (`crypto.hash`) | **286,726 ops/s** | 0.0033 ms | 0.0052 ms | 0.0123 ms |
| **Expression Engine** (`interpolate.ts`) | **288,413 ops/s** | 0.0033 ms | 0.0053 ms | 0.0080 ms |
| **Sandboxed VM JS** (`data.code`) | **1,226 ops/s** | 0.8148 ms | 1.1224 ms | 1.5929 ms |

> [!NOTE]
> The sandboxed code node runs inside Node's native `vm.createContext` with stripped globals and hard CPU execution timeout limits, balancing sub-millisecond execution with defense-in-depth isolation.

---

## 🔄 Suite 2: Multi-Node Workflow DAG Pipelines

Evaluated over **2,000 end-to-end workflow executions** through topological sort, dependency resolution, variable propagation, and executor dispatch:

| Workflow Architecture | Nodes | Throughput | Avg Latency | p95 Latency |
|---|---|---|---|---|
| **Linear Pipeline** (`Manual -> SetVar -> Math -> Text -> Crypto`) | 5 | **49,755 ops/sec** | 0.0199 ms | 0.0336 ms |
| **Conditional Branching** (`Manual -> SetVar -> IF -> True / False`) | 5 | **1,162 ops/sec** | 0.8596 ms | 1.1368 ms |
| **Switch Router Pipeline** (`Manual -> Switch -> Text`) | 3 | **124,891 ops/sec** | 0.0079 ms | 0.0108 ms |

---

## 📈 Suite 3: Data Scale & Heavy Payloads

Evaluated by streaming structured record sets through `JSON -> CSV -> Filter -> Aggregate (Sum)`:

| Dataset Size | Pipeline Steps | Execution Time | Output Result |
|---|---|---|---|
| **1,000 Records** | CSV Serialization &rarr; Field Filtering &rarr; Numeric Summation | **3.88 ms** | Total Sum: \$129,500 |
| **10,000 Records** | CSV Serialization &rarr; Field Filtering &rarr; Numeric Summation | **20.03 ms** | Total Sum: \$1,295,000 |

### Memory Footprint & Stability
- **Active Process Heap:** 17.11 MB
- **Heap Delta after 5,000 rapid workflow executions:** `-1.35 MB` (No memory leaks detected; V8 garbage collector reclaims allocated DAG structures cleanly).

---

## 🌐 Suite 4: HTTP API Concurrency

Load test against local Express API instance (`300 requests` at concurrency `c=20`):

| Metric | Result |
|---|---|
| **Requests / Second** | **2,062 req/sec** |
| **Average Latency** | 9.32 ms |
| **Median (p50) Latency** | 8.08 ms |
| **p95 Latency** | 21.16 ms |
| **p99 Latency** | 23.53 ms |

---

## 🚀 Running the Benchmarks Locally

To reproduce these benchmark numbers on any machine:

```bash
# 1. Build project
npm run build

# 2. Run benchmark suite
npm run bench
```
