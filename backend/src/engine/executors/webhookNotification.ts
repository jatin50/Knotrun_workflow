import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const webhookNotification: NodeExecutor = async (config, input, context) => {
  const platform = (config.platform as string) || "slack";
  const rawUrl =
    (config.__secretToken as string | undefined) ||
    (config.webhookUrl as string | undefined) ||
    "";

  const webhookUrl = interpolate(rawUrl, input, context.variables).trim();

  if (!webhookUrl) {
    throw new Error(
      "Communication node has no Webhook URL configured. Please provide a URL or select a Credential."
    );
  }

  const rawMessage = (config.message as string) || "Workflow notification triggered";
  const message = interpolate(rawMessage, input, context.variables);

  let payload: Record<string, unknown>;

  if (platform === "discord") {
    payload = {
      content: message,
      username: config.senderName || "Workflow Bot",
    };
  } else if (platform === "slack") {
    payload = {
      text: message,
      username: config.senderName || "Workflow Bot",
      ...(config.channel ? { channel: config.channel } : {}),
    };
  } else {
    // Custom / Generic webhook
    payload = {
      text: message,
      input,
      timestamp: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Notification failed (${response.status}): ${errBody}`);
    }

    return {
      delivered: true,
      platform,
      message,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Notification timed out after 10 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export default webhookNotification;
