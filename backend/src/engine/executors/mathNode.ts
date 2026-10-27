import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

function resolveNumber(val: unknown, input: unknown, variables?: Record<string, unknown>): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const interpolated = interpolate(val, input, variables);
    const parsed = Number(interpolated);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

const mathNode: NodeExecutor = async (config, input, context) => {
  const operation = (config.operation as string) || "add";
  const a = resolveNumber(config.valueA ?? config.value, input, context?.variables);
  const b = resolveNumber(config.valueB, input, context?.variables);

  let result = 0;

  switch (operation) {
    case "add":
      result = a + b;
      break;
    case "subtract":
      result = a - b;
      break;
    case "multiply":
      result = a * b;
      break;
    case "divide":
      result = b !== 0 ? a / b : 0;
      break;
    case "round":
      result = Math.round(a);
      break;
    case "ceil":
      result = Math.ceil(a);
      break;
    case "floor":
      result = Math.floor(a);
      break;
    case "percentage":
      result = b !== 0 ? (a / b) * 100 : 0;
      break;
    case "abs":
      result = Math.abs(a);
      break;
    case "min":
      result = Math.min(a, b);
      break;
    case "max":
      result = Math.max(a, b);
      break;
    default:
      result = a + b;
  }

  return {
    operation,
    result,
    valueA: a,
    valueB: b,
  };
};

export default mathNode;
