import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const emailNode: NodeExecutor = async (config, input, context) => {
  const rawTo = (config.to as string) || "";
  const rawSubject = (config.subject as string) || "Workflow Notification";
  const rawBody = (config.body as string) || "";
  const from = (config.from as string) || "noreply@automation.local";

  const to = interpolate(rawTo, input, context?.variables).trim();
  const subject = interpolate(rawSubject, input, context?.variables);
  const body = interpolate(rawBody, input, context?.variables);

  if (!to) {
    throw new Error("Email node has no recipient 'to' address configured");
  }

  // Token resolution: injected credential secret or config or env
  const apiKey =
    (config.__secretToken as string | undefined) ||
    (config.apiKey as string | undefined) ||
    process.env.RESEND_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    // If a Resend / SendGrid API key is provided, send real email via Resend API
    if (apiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: body.includes("<") ? body : undefined,
          text: !body.includes("<") ? body : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Email dispatch failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      return {
        sent: true,
        to,
        from,
        subject,
        provider: "resend",
        id: (data as any)?.id ?? `email_${Date.now()}`,
        sentAt: new Date().toISOString(),
      };
    }

    // Default: Return structured dispatch receipt
    return {
      sent: true,
      to,
      from,
      subject,
      provider: "simulated_dispatch",
      note: "Email logged. Connect a Resend API Credential to dispatch live emails via SMTP/API.",
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Email request timed out after 15 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export default emailNode;
