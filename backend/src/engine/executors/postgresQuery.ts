import { NodeExecutor } from "../types";
import prisma from "../../lib/prisma";
import { interpolate } from "../../utils/interpolate";

const postgresQuery: NodeExecutor = async (config, input, context) => {
  const rawQuery = (config.query as string) || "";
  const query = interpolate(rawQuery, input, context.variables).trim();

  if (!query) {
    throw new Error("PostgreSQL node has no query configured");
  }

  try {
    // If query is a SELECT / reading query, run $queryRawUnsafe
    // If it's INSERT / UPDATE / DELETE, $executeRawUnsafe can also be used,
    // but $queryRawUnsafe works for SELECT and queries returning rows.
    const isMutation = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i.test(query);

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
