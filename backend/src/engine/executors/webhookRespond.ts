import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const webhookRespond: NodeExecutor = async (config, input, context) => {
  const statusCode = typeof config.statusCode === "number" ? config.statusCode : 200;
  const rawBody = (config.responseBody as string) || "";
  const interpolatedBody = rawBody ? interpolate(rawBody, input, context?.variables) : "";

  let parsedBody: unknown = input;
  if (interpolatedBody.trim()) {
    try {
      parsedBody = JSON.parse(interpolatedBody);
    } catch {
      parsedBody = interpolatedBody;
    }
  }

  return {
    statusCode,
    responseBody: parsedBody,
    input,
    respondedAt: new Date().toISOString(),
  };
};

export default webhookRespond;
