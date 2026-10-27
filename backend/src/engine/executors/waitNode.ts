import { NodeExecutor } from "../types";

const waitNode: NodeExecutor = async (config, input) => {
  const seconds = Math.max(1, Math.min(Number(config.seconds) || 2, 60));

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  // A wait/delay node acts as a transparent pass-through for upstream data
  return input !== null && input !== undefined
    ? input
    : { waitedSeconds: seconds, resumedAt: new Date().toISOString() };
};

export default waitNode;
