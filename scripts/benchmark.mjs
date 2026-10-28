/**
 * Automated Performance & Scalability Benchmark Suite
 * Evaluates execution engine latency, throughput (ops/sec), data processing scale,
 * memory usage, and HTTP endpoint concurrency for the n8n workflow platform.
 */

import { performance } from "node:perf_hooks";
import os from "node:os";
import v8 from "node:v8";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDist = path.resolve(__dirname, "../backend/dist");

// Load backend engine and executors
let runWorkflowTest, getExecutor, interpolate, codeNode;
try {
  ({ runWorkflowTest } = require(path.join(backendDist, "engine/engine")));
  ({ getExecutor } = require(path.join(backendDist, "engine/executors")));
  ({ interpolate } = require(path.join(backendDist, "utils/interpolate")));
  codeNode = require(path.join(backendDist, "engine/executors/codeNode")).default;
} catch (err) {
  console.error("Error: Could not load backend distribution. Please run 'npm run build' first.");
  console.error(err.message);
  process.exit(1);
}

// Helpers for statistics
function calculateStats(latenciesMs) {
  if (latenciesMs.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const n = sorted.length;
  return {
    p50: sorted[Math.floor(n * 0.50)],
    p90: sorted[Math.floor(n * 0.90)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.floor(n * 0.99)],
    min: sorted[0],
    max: sorted[n - 1],
    avg: sum / n,
  };
}

function formatBytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

console.log("\n==================================================================");
console.log("       n8n WORKFLOW PLATFORM - PERFORMANCE BENCHMARK SUITE         ");
console.log("==================================================================\n");

console.log("System Specifications:");
console.log(` - OS Platform:      ${os.type()} ${os.release()} (${os.arch()})`);
console.log(` - Node.js Version:   ${process.version}`);
console.log(` - CPU Cores:        ${os.cpus().length}x ${os.cpus()[0]?.model || "CPU"}`);
console.log(` - Total System RAM: ${formatBytes(os.totalmem())}`);
console.log(` - Process Heap:     ${formatBytes(process.memoryUsage().heapUsed)} / ${formatBytes(v8.getHeapStatistics().heap_size_limit)} max`);
console.log("");

const benchmarkResults = [];

// ==================================================================
// SUITE 1: MICRO-BENCHMARKS (Single Node & Utility Throughput)
// ==================================================================
console.log("------------------------------------------------------------------");
console.log("SUITE 1: Node & Utility Micro-benchmarks (10,000 runs each)");
console.log("------------------------------------------------------------------");

async function benchMicroNode(name, fn, iterations = 10000) {
  // Warmup
  for (let i = 0; i < 50; i++) await fn(i);

  const latencies = [];
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const s = performance.now();
    await fn(i);
    latencies.push(performance.now() - s);
  }
  const totalMs = performance.now() - t0;
  const opsSec = (iterations / (totalMs / 1000)).toFixed(0);
  const stats = calculateStats(latencies);

  console.log(
    ` ${name.padEnd(28)} | ${opsSec.padStart(9)} ops/s | avg: ${stats.avg.toFixed(4)}ms | p95: ${stats.p95.toFixed(4)}ms | p99: ${stats.p99.toFixed(4)}ms`
  );

  benchmarkResults.push({
    suite: "Microbenchmarks",
    name,
    opsSec: Number(opsSec),
    avgMs: stats.avg,
    p95Ms: stats.p95,
    p99Ms: stats.p99,
  });
}

const mathExec = getExecutor("math.calculate");
await benchMicroNode("Math Calculation (Add/Mult)", async (i) => {
  await mathExec({ operation: "multiply", valueA: String(i), valueB: "12" }, {});
});

const cryptoExec = getExecutor("crypto.hash");
await benchMicroNode("Crypto Hash (SHA-256)", async (i) => {
  await cryptoExec({ operation: "sha256", text: `test-hash-payload-${i}` }, {});
});

const textExec = getExecutor("data.text");
await benchMicroNode("Text Transform & Regex", async (i) => {
  await textExec({ operation: "regex_replace", pattern: "[0-9]+", replacement: "X" }, `order-id-49102-${i}`);
});

await benchMicroNode("Expression Interpolation", async (i) => {
  interpolate("Hello {{ input.user.name }}! Order #{{ input.orderId }} has status {{ input.status }}", {
    user: { name: "Antigravity" },
    orderId: 1000 + i,
    status: "CONFIRMED",
  });
});

await benchMicroNode("Sandboxed VM Custom JS", async (i) => {
  await codeNode({ code: "return { double: input.val * 2, square: input.val * input.val };" }, { val: i }, { variables: {} });
}, 2000);

console.log("");

// ==================================================================
// SUITE 2: WORKFLOW DAG PIPELINE THROUGHPUT
// ==================================================================
console.log("------------------------------------------------------------------");
console.log("SUITE 2: Multi-Node Workflow DAG Pipelines (2,000 runs each)");
console.log("------------------------------------------------------------------");

async function benchWorkflow(name, nodes, connections, iterations = 2000) {
  // Warmup
  for (let i = 0; i < 20; i++) await runWorkflowTest(nodes, connections);

  const latencies = [];
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const s = performance.now();
    await runWorkflowTest(nodes, connections);
    latencies.push(performance.now() - s);
  }
  const totalMs = performance.now() - t0;
  const opsSec = (iterations / (totalMs / 1000)).toFixed(0);
  const stats = calculateStats(latencies);

  console.log(
    ` ${name.padEnd(28)} | ${opsSec.padStart(9)} ops/s | avg: ${stats.avg.toFixed(4)}ms | p95: ${stats.p95.toFixed(4)}ms | p99: ${stats.p99.toFixed(4)}ms`
  );

  benchmarkResults.push({
    suite: "Workflows",
    name,
    opsSec: Number(opsSec),
    avgMs: stats.avg,
    p95Ms: stats.p95,
    p99Ms: stats.p99,
  });
}

// 1. Linear 5-Node Workflow
const linear5Nodes = [
  { id: "n1", type: "trigger.manual", configuration: {} },
  { id: "n2", type: "data.setVariable", configuration: { key: "batchId", value: "b_991" } },
  { id: "n3", type: "math.calculate", configuration: { operation: "multiply", valueA: "50", valueB: "2" } },
  { id: "n4", type: "data.text", configuration: { operation: "uppercase", text: "computed {{ input.result }}" } },
  { id: "n5", type: "crypto.hash", configuration: { operation: "sha256", text: "{{ input.result }}" } },
];
const linear5Conns = [
  { sourceNode: "n1", targetNode: "n2" },
  { sourceNode: "n2", targetNode: "n3" },
  { sourceNode: "n3", targetNode: "n4" },
  { sourceNode: "n4", targetNode: "n5" },
];
await benchWorkflow("5-Node Linear Pipeline", linear5Nodes, linear5Conns);

// 2. Conditional IF Branching Workflow
const ifNodes = [
  { id: "n1", type: "trigger.manual", configuration: {} },
  { id: "n2", type: "data.setVariable", configuration: { key: "status", value: "approved" } },
  { id: "n3", type: "logic.if", configuration: { condition: "input.status === 'approved'" } },
  { id: "n4_true", type: "data.text", configuration: { operation: "uppercase", text: "approval-granted" } },
  { id: "n4_false", type: "data.text", configuration: { operation: "uppercase", text: "rejection-notice" } },
];
const ifConns = [
  { sourceNode: "n1", targetNode: "n2" },
  { sourceNode: "n2", targetNode: "n3" },
  { sourceNode: "n3", targetNode: "n4_true", sourceHandle: "true" },
  { sourceNode: "n3", targetNode: "n4_false", sourceHandle: "false" },
];
await benchWorkflow("Conditional IF Branching", ifNodes, ifConns);

// 3. Multi-way Switch Router Workflow
const switchNodes = [
  { id: "n1", type: "trigger.manual", configuration: {} },
  {
    id: "n2",
    type: "logic.switch",
    configuration: {
      value: "tier_gold",
      rules: [
        { value: "tier_silver", outputName: "silver" },
        { value: "tier_gold", outputName: "gold" },
        { value: "tier_platinum", outputName: "platinum" },
      ],
    },
  },
  { id: "n3", type: "data.text", configuration: { operation: "uppercase", text: "vip-discount" } },
];
const switchConns = [
  { sourceNode: "n1", targetNode: "n2" },
  { sourceNode: "n2", targetNode: "n3" },
];
await benchWorkflow("Switch Router Pipeline", switchNodes, switchConns);

console.log("");

// ==================================================================
// SUITE 3: DATA SCALE & HEAVY PAYLOAD BENCHMARKS
// ==================================================================
console.log("------------------------------------------------------------------");
console.log("SUITE 3: Data Scale & Heavy Payloads (1,000 to 10,000 records)");
console.log("------------------------------------------------------------------");

const csvExec = getExecutor("data.csv");
const filterExec = getExecutor("data.filter");
const aggExec = getExecutor("logic.aggregate");

// Generate test dataset
function generateRecords(count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push({
      id: i + 1,
      email: `user_${i}@corp.net`,
      amount: (i % 500) + 10,
      active: i % 2 === 0 ? "true" : "false",
      role: i % 10 === 0 ? "admin" : "member",
    });
  }
  return records;
}

const data1k = generateRecords(1000);
const data10k = generateRecords(10000);

// 1K Data Pipeline
const t0_1k = performance.now();
const csv1k = await csvExec({ mode: "jsonToCsv" }, data1k);
const filtered1k = await filterExec({ field: "active", operator: "equals", value: "true" }, data1k);
const agg1k = await aggExec({ operation: "sum", property: "amount" }, filtered1k.items);
const time1k = performance.now() - t0_1k;
console.log(` 1,000 Records Pipeline (CSV -> Filter -> Aggregate)  | Duration: ${time1k.toFixed(2)}ms (Sum: $${agg1k.result})`);

// 10K Data Pipeline
const t0_10k = performance.now();
const csv10k = await csvExec({ mode: "jsonToCsv" }, data10k);
const filtered10k = await filterExec({ field: "active", operator: "equals", value: "true" }, data10k);
const agg10k = await aggExec({ operation: "sum", property: "amount" }, filtered10k.items);
const time10k = performance.now() - t0_10k;
console.log(` 10,000 Records Pipeline (CSV -> Filter -> Aggregate) | Duration: ${time10k.toFixed(2)}ms (Sum: $${agg10k.result})`);

// Memory leak profile across 5,000 rapid iterations
const initialMem = process.memoryUsage();
for (let i = 0; i < 5000; i++) {
  await runWorkflowTest(linear5Nodes, linear5Conns);
}
const finalMem = process.memoryUsage();
const heapDelta = finalMem.heapUsed - initialMem.heapUsed;
console.log(` Memory Footprint after 5,000 runs: Heap Used: ${formatBytes(finalMem.heapUsed)} (Delta: ${formatBytes(heapDelta)})`);

console.log("");

// ==================================================================
// SUITE 4: HTTP API CONCURRENCY & LATENCY
// ==================================================================
console.log("------------------------------------------------------------------");
console.log("SUITE 4: HTTP API Concurrency (live server test)");
console.log("------------------------------------------------------------------");

async function testHttpEndpoint(url, totalRequests = 300, concurrency = 20) {
  try {
    const check = await fetch(url);
    if (!check.ok && check.status !== 401 && check.status !== 404 && check.status !== 429) {
      console.log(` Server endpoint ${url} returned ${check.status}. Skipping HTTP load test.`);
      return;
    }
  } catch {
    console.log(` Live server not responding at ${url}. Skipping live HTTP load test.`);
    return;
  }

  const latencies = [];
  let completed = 0;
  const t0 = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const s = performance.now();
      try {
        await fetch(url);
        latencies.push(performance.now() - s);
      } catch {
        // ignore network error
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const totalMs = performance.now() - t0;
  const rps = (latencies.length / (totalMs / 1000)).toFixed(0);
  const stats = calculateStats(latencies);

  console.log(` Endpoint: ${url} (${totalRequests} reqs @ c=${concurrency})`);
  console.log(`  - Throughput: ${rps} requests/sec`);
  console.log(`  - Latencies:  avg=${stats.avg.toFixed(2)}ms | p50=${stats.p50.toFixed(2)}ms | p95=${stats.p95.toFixed(2)}ms | p99=${stats.p99.toFixed(2)}ms`);
}

await testHttpEndpoint("http://localhost:4000/health", 300, 20);

console.log("\n==================================================================");
console.log("               BENCHMARK COMPLETED SUCCESSFULLY                   ");
console.log("==================================================================\n");
