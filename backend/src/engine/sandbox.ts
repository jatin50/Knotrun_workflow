import vm from "node:vm";

const FORBIDDEN_TOKENS = [
  "process",
  "require",
  "child_process",
  "execSync",
  "spawn",
  "__dirname",
  "__filename",
  "import",
];

/**
 * Executes user-provided JavaScript in a sandboxed Node VM context.
 * Disallows access to sensitive Node.js process and filesystem APIs,
 * and enforces a maximum execution timeout to prevent CPU exhaustion.
 */
export function runInSandbox<T = unknown>(
  code: string,
  input: unknown,
  variables: Record<string, unknown>,
  timeoutMs = 3000
): T {
  // 1. Static validation against dangerous globals and escape attempts
  for (const token of FORBIDDEN_TOKENS) {
    const regex = new RegExp(`\\b${token}\\b`);
    if (regex.test(code)) {
      throw new Error(`Execution blocked by security policy: usage of restricted '${token}'`);
    }
  }

  // 2. Build isolated sandbox with only safe standard primitives
  const sandbox = Object.create(null);
  sandbox.input = input;
  sandbox.variables = variables;
  sandbox.Math = Math;
  sandbox.Date = Date;
  sandbox.JSON = JSON;
  sandbox.String = String;
  sandbox.Number = Number;
  sandbox.Boolean = Boolean;
  sandbox.Array = Array;
  sandbox.Object = Object;
  sandbox.RegExp = RegExp;
  sandbox.parseInt = parseInt;
  sandbox.parseFloat = parseFloat;
  sandbox.isNaN = isNaN;
  sandbox.isFinite = isFinite;
  sandbox.encodeURIComponent = encodeURIComponent;
  sandbox.decodeURIComponent = decodeURIComponent;

  const context = vm.createContext(sandbox);

  // 3. Wrap in an immediately-invoked function
  const wrappedCode = `"use strict";\n(function() {\n${code}\n})();`;

  return vm.runInContext(wrappedCode, context, {
    timeout: timeoutMs,
    displayErrors: true,
  }) as T;
}
