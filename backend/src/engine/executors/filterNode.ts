import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

function evaluateCondition(actual: unknown, operator: string, expected: string): boolean {
  const actualStr = actual === null || actual === undefined ? "" : String(actual);
  const actualNum = Number(actual);
  const expectedNum = Number(expected);

  switch (operator) {
    case "equals":
      return actualStr.toLowerCase() === expected.toLowerCase();
    case "not_equals":
      return actualStr.toLowerCase() !== expected.toLowerCase();
    case "contains":
      return actualStr.toLowerCase().includes(expected.toLowerCase());
    case "not_contains":
      return !actualStr.toLowerCase().includes(expected.toLowerCase());
    case "greater_than":
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
    case "less_than":
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum < expectedNum;
    case "is_empty":
      return actualStr.trim() === "" || (Array.isArray(actual) && actual.length === 0);
    case "is_not_empty":
      return actualStr.trim() !== "" && (!Array.isArray(actual) || actual.length > 0);
    default:
      return true;
  }
}

const filterNode: NodeExecutor = async (config, input, context) => {
  const field = (config.field as string) || "";
  const operator = (config.operator as string) || "equals";
  const rawExpected = (config.value as string) || "";
  const expected = interpolate(rawExpected, input, context?.variables).trim();

  // If input is an array, filter the array items
  if (Array.isArray(input)) {
    const passed = input.filter((item) => {
      const actualVal = field ? (item && typeof item === "object" ? (item as any)[field] : item) : item;
      return evaluateCondition(actualVal, operator, expected);
    });

    return {
      passed: passed.length > 0,
      items: passed,
      totalCount: input.length,
      filteredCount: passed.length,
    };
  }

  // If input is an object or primitive
  const actualVal = field && typeof input === "object" && input !== null ? (input as any)[field] : input;
  const passed = evaluateCondition(actualVal, operator, expected);

  return {
    passed,
    input: passed ? input : null,
    actualValue: actualVal,
    expectedValue: expected,
    operator,
  };
};

export default filterNode;
