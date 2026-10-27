import { NodeExecutor } from "../types";
import { runInSandbox } from "../sandbox";

const codeNode: NodeExecutor = async (config, input, context) => {
  const code = (config.code as string) || "return input;";

  try {
    const result = runInSandbox(code, input, context.variables, 3000);
    return result !== undefined ? result : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Code execution error";
    throw new Error(`Custom Code execution error: ${message}`);
  }
};

export default codeNode;
