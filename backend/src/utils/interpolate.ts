const FORBIDDEN_PROPERTIES = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Safely resolves a nested property path from an object without using code evaluation.
 * Protects against Prototype Pollution and arbitrary code execution.
 */
function getSafeValue(root: unknown, path: string): unknown {
  if (!path || root === null || root === undefined) return undefined;

  // Normalize array indexing: e.g. items[0].name -> items.0.name
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  const segments = normalized.split(".").map((s) => s.trim()).filter(Boolean);

  let current: any = root;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    // Block prototype pollution vectors
    if (FORBIDDEN_PROPERTIES.has(segment)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Evaluates template expressions in the format `{{ input.property }}` or `{{ variables.key }}`
 * using safe, sandboxed path navigation without `eval` or `new Function`.
 */
export function interpolate(
  template: string,
  input: unknown,
  variables: Record<string, unknown> = {}
): string {
  if (!template || typeof template !== "string") return "";

  return template.replace(/\{\{\s*([a-zA-Z0-9_$.[\]]+)\s*\}\}/g, (match, expr) => {
    const trimmed = expr.trim();
    let val: unknown = undefined;

    if (trimmed === "input") {
      val = input;
    } else if (trimmed.startsWith("input.")) {
      val = getSafeValue(input, trimmed.slice("input.".length));
    } else if (trimmed === "variables") {
      val = variables;
    } else if (trimmed.startsWith("variables.")) {
      val = getSafeValue(variables, trimmed.slice("variables.".length));
    } else {
      // Fallback: check variables first, then input
      val = getSafeValue(variables, trimmed);
      if (val === undefined) {
        val = getSafeValue(input, trimmed);
      }
    }

    if (val === undefined || val === null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}
