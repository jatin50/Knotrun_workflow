import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const textNode: NodeExecutor = async (config, input, context) => {
  const operation = (config.operation as string) || "trim";
  const rawText = (config.text as string) || "";
  const text = rawText ? interpolate(rawText, input, context?.variables) : (typeof input === "string" ? input : JSON.stringify(input ?? ""));
  const pattern = (config.pattern as string) || "";
  const replacement = (config.replacement as string) || "";

  let result: unknown = text;

  switch (operation) {
    case "trim":
      result = text.trim();
      break;
    case "uppercase":
      result = text.toUpperCase();
      break;
    case "lowercase":
      result = text.toLowerCase();
      break;
    case "length":
      result = text.length;
      break;
    case "regex_extract": {
      if (pattern) {
        const regex = new RegExp(pattern);
        const match = text.match(regex);
        result = match ? match[1] ?? match[0] : null;
      }
      break;
    }
    case "regex_replace": {
      if (pattern) {
        const regex = new RegExp(pattern, "g");
        result = text.replace(regex, replacement);
      }
      break;
    }
    case "substring": {
      const start = Number(config.start ?? 0);
      const end = config.end !== undefined ? Number(config.end) : undefined;
      result = text.substring(start, end);
      break;
    }
    default:
      result = text.trim();
  }

  return {
    operation,
    result,
    originalText: text,
  };
};

export default textNode;
