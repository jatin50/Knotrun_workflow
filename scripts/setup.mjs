import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

console.log("\n⚡ Initializing Workflow Automation Platform (n8n Clone)...");

// 1. Backend .env check / generation
const backendEnvPath = path.join(backendDir, ".env");
const backendEnvExamplePath = path.join(backendDir, ".env.example");

if (!fs.existsSync(backendEnvPath)) {
  console.log("⚙ Generating backend/.env with secure random keys...");
  const encKey = crypto.randomBytes(32).toString("hex");
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const jwtRefresh = crypto.randomBytes(32).toString("hex");

  let envContent = `# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Database (PostgreSQL / Neon)
DATABASE_URL="postgresql://n8n_clone:n8n_clone@localhost:5432/n8n_clone?schema=public"

# Redis & Queue
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="${jwtSecret}"
JWT_REFRESH_SECRET="${jwtRefresh}"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Credentials Manager (Phase 8 - AES-256-GCM)
CREDENTIALS_ENCRYPTION_KEY="${encKey}"
`;
  fs.writeFileSync(backendEnvPath, envContent, "utf8");
  console.log("✔ Created backend/.env");
} else {
  console.log("✔ backend/.env exists");
}

// 2. Frontend .env check / generation
const frontendEnvPath = path.join(frontendDir, ".env");
if (!fs.existsSync(frontendEnvPath)) {
  console.log("⚙ Generating frontend/.env...");
  fs.writeFileSync(frontendEnvPath, 'VITE_API_URL="http://localhost:4000"\n', "utf8");
  console.log("✔ Created frontend/.env");
} else {
  console.log("✔ frontend/.env exists");
}

// 3. Prisma client generation
console.log("⚙ Generating Prisma client...");
try {
  execSync("npm run prisma:generate", { cwd: backendDir, stdio: "inherit" });
} catch (e) {
  console.warn("⚠ Prisma generate warning:", e.message);
}

// 4. Prisma database schema push & seed
console.log("⚙ Syncing database schema & seeding demo account...");
try {
  execSync("npx prisma db push --skip-generate", { cwd: backendDir, stdio: "inherit" });
  execSync("npm run prisma:seed", { cwd: backendDir, stdio: "inherit" });
} catch (e) {
  console.warn("\n⚠ Note: Database sync could not reach database server right now.");
  console.warn("  Make sure your PostgreSQL or Neon database is running and DATABASE_URL in backend/.env is correct.");
}

console.log(`
====================================================================
  🎉 Workflow Automation Platform Setup Complete!
--------------------------------------------------------------------
  To start all services in development mode:
    npm run dev

  Then open in your browser:
    🌐 Web App:      http://localhost:5173
    🔌 API Server:   http://localhost:4000
    📊 Health Check: http://localhost:4000/health

  Default Login:
    Email:    demo@example.com
    Password: password123
====================================================================
`);
