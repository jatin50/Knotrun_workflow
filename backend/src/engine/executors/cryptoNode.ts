import crypto from "node:crypto";
import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const cryptoNode: NodeExecutor = async (config, input, context) => {
  const operation = (config.operation as string) || "sha256";
  const rawText = (config.text as string) || "";
  const text = rawText ? interpolate(rawText, input, context?.variables) : (typeof input === "string" ? input : JSON.stringify(input));
  const rawSecret = (config.secret as string) || "";
  const secret = rawSecret ? interpolate(rawSecret, input, context?.variables) : "";

  let result: string;

  switch (operation) {
    case "sha256":
      result = crypto.createHash("sha256").update(text).digest("hex");
      break;
    case "sha512":
      result = crypto.createHash("sha512").update(text).digest("hex");
      break;
    case "md5":
      result = crypto.createHash("md5").update(text).digest("hex");
      break;
    case "hmac_sha256":
      result = crypto.createHmac("sha256", secret || "default_secret").update(text).digest("hex");
      break;
    case "base64_encode":
      result = Buffer.from(text, "utf-8").toString("base64");
      break;
    case "base64_decode":
      result = Buffer.from(text, "base64").toString("utf-8");
      break;
    case "random_uuid":
      result = crypto.randomUUID();
      break;
    default:
      result = crypto.createHash("sha256").update(text).digest("hex");
  }

  return {
    operation,
    result,
    input,
  };
};

export default cryptoNode;
