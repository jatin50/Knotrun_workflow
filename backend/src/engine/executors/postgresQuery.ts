import { NodeExecutor } from "../types";
import prisma from "../../lib/prisma";
import { interpolate } from "../../utils/interpolate";

const FORBIDDEN_TABLES = [
  "users",
  "credentials",
  "variables",
  "workspaces",
  "workflows",
  "workflow_versions",
  "nodes",
  "connections",
  "triggers",
  "executions",
  "execution_data",
  "chat_messages",
  "api_keys",
  "audit_logs",
  "_prisma_migrations",
  "pg_shadow",
  "pg_authid",
];

const FORBIDDEN_COMMANDS = [
  "DROP",
  "ALTER",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "VACUUM",
  "REINDEX",
  "EXEC",
  "EXECUTE",
  "PREPARE",
];

/**
 * Validates and sanitizes SQL queries to prevent multi-statement execution,
 * dynamic execution tricks, destructive administrative commands, and
 * unauthorized access to core platform tables.
 */
function validateSqlQuery(query: string): string {
  const clean = query.trim();

  if (!clean) {
    throw new Error("PostgreSQL node has no query configured");
  }

  // 1. Block multiple stacked SQL statements (e.g. `SELECT 1; DROP TABLE users;`)
  if (/;[\s\S]*\S/.test(clean)) {
    throw new Error("Execution blocked: Multiple stacked SQL statements in a single node are forbidden.");
  }

  // 2. Block destructive administrative or dynamic execution commands
  for (const cmd of FORBIDDEN_COMMANDS) {
    const regex = new RegExp(`\\b${cmd}\\b`, "i");
    if (regex.test(clean)) {
      throw new Error(`Execution blocked: Destructive command '${cmd}' is forbidden by security policy.`);
    }
  }

  // 3. Prevent reading or modifying core internal platform tables (including quoted and schema-qualified)
  for (const table of FORBIDDEN_TABLES) {
    const regex = new RegExp(`(\\b|"|\\.)${table}(\\b|"|\\s|$)`, "i");
    if (regex.test(clean)) {
      throw new Error(`Execution blocked: Access to internal platform table '${table}' is forbidden.`);
    }
  }

  // Strip trailing semicolon if present
  return clean.replace(/;$/, "");
}

const postgresQuery: NodeExecutor = async (config, input, context) => {
  const rawQuery = (config.query as string) || "";
  const interpolated = interpolate(rawQuery, input, context.variables);
  const query = validateSqlQuery(interpolated);

  try {
    const isMutation = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(query);

    if (isMutation) {
      const affectedRows = await prisma.$executeRawUnsafe(query);
      return {
        success: true,
        affectedRows,
        query,
      };
    } else {
      const rows = (await prisma.$queryRawUnsafe(query)) as unknown[];
      return {
        rows,
        rowCount: Array.isArray(rows) ? rows.length : 1,
        query,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database query failed";
    throw new Error(`PostgreSQL Query Error: ${message}`);
  }
};

export default postgresQuery;
