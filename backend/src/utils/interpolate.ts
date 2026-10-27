/**
 * Evaluates template expressions in the format `{{ input.property }}` or `{{ variables.key }}`.
 * If expression evaluation fails or doesn't match, preserves the original template string.
 */
export function interpolate(
  template: string,
  input: unknown,
  variables: Record<string, unknown>
): string {
  if (!template || typeof template !== "string") return "";

  return template.replace(/\{\{\s*([a-zA-Z0-9_$.?]+)\s*\}\}/g, (match, path) => {
    try {
      const fn = new Function(
        "input",
        "variables",
        `"use strict"; return (${path});`
      );
      const val = fn(input, variables);
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    } catch {
      return match;
    }
  });
}
