import { NodeExecutor } from "../types";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const codeNode: NodeExecutor = async (config, input, context) => {
  const code = (config.code as string) || "return input;";

  try {
    const fn = new AsyncFunction(
      "input",
      "variables",
      `"use strict";\n${code}`
    );

    const result = await fn(input, context.variables);
    return result !== undefined ? result : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Code execution error";
    throw new Error(`Custom Code execution error: ${message}`);
  }
};

export default codeNode;
