import { execSync } from "node:child_process";

const maxRetries = 12;
const delayMs = 4000;

async function run() {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Deploy] Running Prisma migrations (attempt ${attempt}/${maxRetries})...`);
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("[Deploy] Prisma migrations applied successfully!");
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error("[Deploy] Failed to apply migrations after maximum retries:", err.message);
        process.exit(1);
      }
      console.warn(
        `[Deploy] Database may still be initializing. Retrying in ${delayMs / 1000} seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

run();
