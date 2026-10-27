import { NodeExecutor } from "../types";
import { runInSandbox } from "../sandbox";

const ifNode: NodeExecutor = async (config, input, context) => {
  const condition = (config.condition as string) || "";

  if (!condition.trim()) {
    return { result: false, input };
  }

  try {
    const code = `return Boolean(${condition});`;
    const result = Boolean(runInSandbox(code, input, context.variables, 2000));
    return { result, input };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Condition failed to evaluate: ${message}`);
  }
};

export default ifNode;
