import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

interface SwitchRule {
  value: string;
  outputName: string;
}

const switchNode: NodeExecutor = async (config, input, context) => {
  const rawExpression = (config.value as string) || "";
  const evaluatedValue = String(interpolate(rawExpression, input, context?.variables)).trim();

  const rules = (Array.isArray(config.rules) ? config.rules : []) as SwitchRule[];
  let matchedOutput = (config.defaultOutput as string) || "default";

  for (const rule of rules) {
    if (rule && typeof rule.value === "string") {
      const targetVal = String(interpolate(rule.value, input, context?.variables)).trim();
      if (evaluatedValue === targetVal) {
        matchedOutput = rule.outputName || rule.value;
        break;
      }
    }
  }

  return {
    matchedOutput,
    evaluatedValue,
    input,
  };
};

export default switchNode;
