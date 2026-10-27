import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const services = [
  { name: "backend", cmd: npmCmd, args: ["--prefix", "backend", "run", "dev"], color: "\x1b[34m" },
  { name: "worker ", cmd: npmCmd, args: ["--prefix", "backend", "run", "worker"], color: "\x1b[35m" },
  { name: "frontend", cmd: npmCmd, args: ["--prefix", "frontend", "run", "dev"], color: "\x1b[32m" },
];

const processes = [];

console.log("\x1b[1m\x1b[36m%s\x1b[0m", "Starting n8n workflow automation platform services...");
console.log("  [backend]  -> Express API Server");
console.log("  [worker]   -> BullMQ Background Worker");
console.log("  [frontend] -> Vite React Web Interface\n");

for (const svc of services) {
  const p = spawn(svc.cmd, svc.args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
  });

  processes.push(p);

  const prefix = `${svc.color}[${svc.name}]\x1b[0m `;

  p.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    }
  });

  p.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) process.stderr.write(`${prefix}\x1b[31m${line}\x1b[0m\n`);
    }
  });

  p.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${prefix}exited with code ${code}`);
    }
  });
}

function shutdown() {
  console.log("\nStopping all services...");
  for (const p of processes) {
    if (isWindows) {
      spawn("taskkill", ["/pid", p.pid.toString(), "/f", "/t"]);
    } else {
      p.kill("SIGTERM");
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
