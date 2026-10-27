import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";
import { validateUrl } from "../../utils/ssrf";

/**
 * Pings external URLs to monitor uptime, measure response latency,
 * and keep free-tier instances (Render, Railway, Supabase, Koyeb) awake.
 */
const pinger: NodeExecutor = async (config, input, context) => {
  const rawUrl = (config.url as string) || "";
  const method = ((config.method as string) || "GET").toUpperCase();
  const timeoutSeconds = typeof config.timeoutSeconds === "number" ? Math.min(Math.max(config.timeoutSeconds, 2), 30) : 10;
  const expectedStatus = typeof config.expectedStatus === "number" ? config.expectedStatus : 200;

  const url = interpolate(rawUrl, input, context?.variables).trim();
  if (!url) {
    throw new Error("Pinger node has no target URL configured");
  }

  // Validate URL to prevent SSRF against loopbacks/internal network
  validateUrl(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "n8n-Workflow-Pinger/1.0 (Keep-Alive Monitor)",
        "Cache-Control": "no-cache",
      },
    });

    const responseTimeMs = Date.now() - startTime;
    const isAlive = res.status < 400 || res.status === expectedStatus;

    return {
      alive: isAlive,
      status: res.status,
      statusText: res.statusText,
      responseTimeMs,
      url,
      method,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const isTimeout = err instanceof Error && err.name === "AbortError";

    return {
      alive: false,
      status: isTimeout ? 408 : 0,
      statusText: isTimeout ? "Request Timeout" : (err instanceof Error ? err.message : "Connection Failed"),
      responseTimeMs,
      url,
      method,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
};

export default pinger;
