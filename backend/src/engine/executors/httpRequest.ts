import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const httpRequest: NodeExecutor = async (config, input, context) => {
  const method = ((config.method as string) || "GET").toUpperCase();
  const rawUrl = (config.url as string) || "";
  const secretToken = config.__secretToken as string | undefined;

  const url = interpolate(rawUrl, input, context.variables);

  if (!url) {
    throw new Error("HTTP Request node has no URL configured");
  }

  const headers: Record<string, string> = {};
  if (secretToken) {
    headers["Authorization"] = `Bearer ${secretToken}`;
  }

  let requestBody: string | undefined = undefined;
  if (["POST", "PUT", "PATCH"].includes(method) && config.body) {
    const rawBody = typeof config.body === "string" ? config.body : JSON.stringify(config.body);
    requestBody = interpolate(rawBody, input, context.variables);
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(config.headers as Record<string, string> | undefined),
      },
      body: requestBody,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody)}`);
    }

    return { status: response.status, body: responseBody };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export default httpRequest;
