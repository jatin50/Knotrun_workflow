/**
 * Performance Regression Gate & Automated SLA Assertion Checker
 * Runs key microbenchmarks and multi-node DAG workflows and asserts
 * that performance meets defined SLAs. Useful as a CI gate to prevent performance regressions.
 */

import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDist = path.resolve(__dirname, "../backend/dist");

let runWorkflowTest, getExecutor;
try {
  ({ runWorkflowTest } = require(path.join(backendDist, "engine/engine")));
  ({ getExecutor } = require(path.join(backendDist, "engine/executors")));
} catch (err) {
  console.error("Error: Could not load backend distribution. Please run 'npm run build' first.");
  process.exit(1);
}

console.log("\n==========================================================================");
console.log("       PERFORMANCE REGRESSION GATE (CI SLA ASSERTIONS)                    ");
console.log("==========================================================================\n");

const GATES = [
  {
    name: "Math Calculation Throughput",
    minOpsSec: 400_000,
    run: async () => {
      const exec = getExecutor("math.calculate");
      const iters = 20_000;
      for (let i = 0; i < 50; i++) await exec({ operation: "add", valueA: i, valueB: 10 });
      const t0 = performance.now();
      for (let i = 0; i < iters; i++) await exec({ operation: "add", valueA: i, valueB: 10 });
      const elapsed = (performance.now() - t0) / 1000;
      return Math.round(iters / elapsed);
    },
  },
  {
    name: "Crypto SHA-256 Throughput",
    minOpsSec: 150_000,
    run: async () => {
      const exec = getExecutor("crypto.hash");
      const iters = 10_000;
      for (let i = 0; i < 50; i++) await exec({ algorithm: "sha256", text: "benchmark" });
      const t0 = performance.now();
      for (let i = 0; i < iters; i++) await exec({ algorithm: "sha256", text: "benchmark" });
      const elapsed = (performance.now() - t0) / 1000;
      return Math.round(iters / elapsed);
    },
  },
  {
    name: "Sandboxed VM Execution (V8 Cache Guard)",
    minOpsSec: 2_500,
    run: async () => {
      const exec = getExecutor("data.code");
      const iters = 2_000;
      const code = "return { out: $input.val * 2 };";
      for (let i = 0; i < 20; i++) await exec({ code }, { val: i });
      const t0 = performance.now();
      for (let i = 0; i < iters; i++) await exec({ code }, { val: i });
      const elapsed = (performance.now() - t0) / 1000;
      return Math.round(iters / elapsed);
    },
  },
  {
    name: "5-Node Linear DAG Throughput",
    minOpsSec: 30_000,
    run: async () => {
      const nodes = [
        { id: "n1", type: "trigger.manual", configuration: {} },
        { id: "n2", type: "math.calculate", configuration: { operation: "add", valueA: 50, valueB: 20 } },
        { id: "n3", type: "data.text", configuration: { operation: "uppercase", text: "gate-test" } },
        { id: "n4", type: "crypto.hash", configuration: { algorithm: "md5", text: "hash-check" } },
        { id: "n5", type: "math.calculate", configuration: { operation: "round", valueA: 42.87 } },
      ];
      const connections = [
        { sourceNode: "n1", targetNode: "n2" },
        { sourceNode: "n2", targetNode: "n3" },
        { sourceNode: "n3", targetNode: "n4" },
        { sourceNode: "n4", targetNode: "n5" },
      ];
      const iters = 5_000;
      for (let i = 0; i < 20; i++) await runWorkflowTest(nodes, connections);
      const t0 = performance.now();
      for (let i = 0; i < iters; i++) await runWorkflowTest(nodes, connections);
      const elapsed = (performance.now() - t0) / 1000;
      return Math.round(iters / elapsed);
    },
  },
];

let failed = 0;

for (const gate of GATES) {
  process.stdout.write(`Testing: ${gate.name.padEnd(42)} ... `);
  try {
    const opsSec = await gate.run();
    const passed = opsSec >= gate.minOpsSec;
    if (passed) {
      console.log(`PASSED (${opsSec.toLocaleString()} ops/s >= SLA ${gate.minOpsSec.toLocaleString()} ops/s)`);
    } else {
      console.log(`FAILED! (${opsSec.toLocaleString()} ops/s < SLA ${gate.minOpsSec.toLocaleString()} ops/s)`);
      failed++;
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failed++;
  }
}

console.log("\n--------------------------------------------------------------------------");
if (failed === 0) {
  console.log("✅ ALL PERFORMANCE GATES PASSED (0 regressions detected)");
  console.log("==========================================================================\n");
  process.exit(0);
} else {
  console.error(`❌ REGRESSION DETECTED: ${failed} gate(s) failed performance thresholds.`);
  console.log("==========================================================================\n");
  process.exit(1);
}
