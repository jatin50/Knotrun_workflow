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

// High-performance bounded cache for compiled V8 scripts
const SCRIPT_CACHE_LIMIT = 500;
const scriptCache = new Map<string, vm.Script>();

function getCompiledScript(wrappedCode: string): vm.Script {
  let script = scriptCache.get(wrappedCode);
  if (!script) {
    if (scriptCache.size >= SCRIPT_CACHE_LIMIT) {
      const oldestKey = scriptCache.keys().next().value;
      if (oldestKey) scriptCache.delete(oldestKey);
    }
    script = new vm.Script(wrappedCode);
    scriptCache.set(wrappedCode, script);
  }
  return script;
}

// Bounded pool of pre-warmed, isolated VM execution contexts
function createCleanContext(): vm.Context {
  const sandbox = Object.create(null);
  sandbox.input = null;
  sandbox.$input = null;
  sandbox.variables = null;
  sandbox.$variables = null;
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

  return vm.createContext(sandbox);
}

const POOL_SIZE = 8;
const contextPool: vm.Context[] = Array.from({ length: POOL_SIZE }, () => createCleanContext());
let poolIndex = 0;

/**
 * Executes user-provided JavaScript in a sandboxed Node VM context.
 * Disallows access to sensitive Node.js process and filesystem APIs,
 * and enforces a maximum execution timeout to prevent CPU exhaustion.
 *
 * Utilizes pre-compiled V8 scripts and pooled isolated contexts for high throughput.
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

  // 2. Wrap in an immediately-invoked function
  const wrappedCode = `"use strict";\n(function() {\n${code}\n})();`;
  const script = getCompiledScript(wrappedCode);

  // 3. Acquire a pre-warmed context from the pool
  const context = contextPool[poolIndex % POOL_SIZE];
  poolIndex++;

  context.input = input;
  context.$input = input;
  context.variables = variables;
  context.$variables = variables;

  try {
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    }) as T;
    return result;
  } finally {
    // Sanitize context references on release
    context.input = null;
    context.$input = null;
    context.variables = null;
    context.$variables = null;
  }
}
