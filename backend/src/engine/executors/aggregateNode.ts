import { NodeExecutor } from "../types";

const aggregateNode: NodeExecutor = async (config, input) => {
  const operation = (config.operation as string) || "sum";
  const property = (config.property as string) || "";

  let list: unknown[] = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (input && typeof input === "object") {
    // If input is an object with an array property, check if property matches
    const fieldName = property || "items";
    if (Array.isArray((input as any)[fieldName])) {
      list = (input as any)[fieldName];
    } else {
      list = Object.values(input as Record<string, unknown>);
    }
  }

  const values: number[] = list.map((item) => {
    if (typeof item === "number") return item;
    if (item && typeof item === "object" && property) {
      const val = Number((item as any)[property]);
      return isNaN(val) ? 0 : val;
    }
    const val = Number(item);
    return isNaN(val) ? 0 : val;
  });

  let result: unknown = 0;

  switch (operation) {
    case "sum":
      result = values.reduce((acc, curr) => acc + curr, 0);
      break;
    case "average":
      result = values.length > 0 ? values.reduce((acc, curr) => acc + curr, 0) / values.length : 0;
      break;
    case "count":
      result = list.length;
      break;
    case "min":
      result = values.length > 0 ? Math.min(...values) : 0;
      break;
    case "max":
      result = values.length > 0 ? Math.max(...values) : 0;
      break;
    case "concatenate": {
      const separator = (config.separator as string) ?? ", ";
      result = list.map((item) => (item && typeof item === "object" && property ? (item as any)[property] : String(item))).join(separator);
      break;
    }
    default:
      result = values.reduce((acc, curr) => acc + curr, 0);
  }

  return {
    operation,
    result,
    itemCount: list.length,
    property: property || null,
  };
};

export default aggregateNode;
