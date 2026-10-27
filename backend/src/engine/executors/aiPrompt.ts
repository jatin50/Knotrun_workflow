import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";

const aiPrompt: NodeExecutor = async (config, input, context) => {
  const provider = (config.provider as string) || "openai";
  const model = (config.model as string) || (provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
  const rawPrompt = (config.prompt as string) || "";
  const rawSystem = (config.systemPrompt as string) || "";

  const promptText = interpolate(rawPrompt, input, context.variables);
  const systemText = interpolate(rawSystem, input, context.variables);

  if (!promptText.trim()) {
    throw new Error("AI Prompt node has no prompt text configured");
  }

  // Token resolution: check injected secret from credential first, then config.apiKey, then env
  const apiKey =
    (config.__secretToken as string | undefined) ||
    (config.apiKey as string | undefined) ||
    (provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error(
      `No API key found for AI node (${provider}). Please select a Credential or specify an API key.`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents = [
        ...(systemText ? [{ role: "user", parts: [{ text: `System instruction: ${systemText}` }] }] : []),
        { role: "user", parts: [{ text: promptText }] },
      ];

      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errText}`);
      }

      const json = (await res.json()) as any;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return {
        text,
        model,
        provider: "gemini",
        usage: json.usageMetadata ?? null,
      };
    } else {
      // Default: OpenAI or OpenAI-compatible (Groq, OpenRouter, Ollama, etc.)
      const endpoint =
        (config.endpoint as string) || "https://api.openai.com/v1/chat/completions";

      const messages = [
        ...(systemText ? [{ role: "system", content: systemText }] : []),
        { role: "user", content: promptText },
      ];

      const res = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: typeof config.temperature === "number" ? config.temperature : 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${errText}`);
      }

      const json = (await res.json()) as any;
      const text = json.choices?.[0]?.message?.content ?? "";
      return {
        text,
        model,
        provider: "openai",
        usage: json.usage ?? null,
      };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI request timed out after 30 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export default aiPrompt;
