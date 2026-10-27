import { NodeExecutor } from "../types";
import { interpolate } from "../../utils/interpolate";
import { validateUrl } from "../../utils/ssrf";
import prisma from "../../lib/prisma";

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

  // Conversational Memory / Chat History
  const enableMemory = Boolean(config.enableMemory);
  let sessionId = "default";
  let pastMessages: Array<{ role: string; content: string }> = [];

  if (enableMemory) {
    const rawSessionId = (config.sessionId as string) || "default";
    sessionId = interpolate(rawSessionId, input, context.variables).trim() || "default";

    const memoryLimit =
      typeof config.memoryLimit === "number" && config.memoryLimit > 0
        ? Math.min(Math.max(config.memoryLimit, 1), 50)
        : 10;

    const dbHistory = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: memoryLimit,
    });

    pastMessages = dbHistory.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      validateUrl(url);

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // If system prompt is configured, provide it as context in the first user turn
      if (systemText) {
        contents.push({ role: "user", parts: [{ text: `System instruction: ${systemText}` }] });
      }

      // Append conversation history
      for (const msg of pastMessages) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }

      // Append current user prompt
      contents.push({ role: "user", parts: [{ text: promptText }] });

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

      // Store user prompt and model response in chat memory database
      if (enableMemory && text) {
        await prisma.chatMessage.createMany({
          data: [
            { sessionId, role: "user", content: promptText },
            { sessionId, role: "assistant", content: text },
          ],
        });
      }

      return {
        text,
        model,
        provider: "gemini",
        ...(enableMemory ? { sessionId, memoryTurns: pastMessages.length } : {}),
        usage: json.usageMetadata ?? null,
      };
    } else {
      // Default: OpenAI or OpenAI-compatible (Groq, OpenRouter, Ollama, etc.)
      const rawEndpoint = (config.endpoint as string) || "https://api.openai.com/v1/chat/completions";
      const endpoint = interpolate(rawEndpoint, input, context.variables);

      // Enforce SSRF validation on custom/configured AI endpoints
      validateUrl(endpoint);

      const messages: Array<{ role: string; content: string }> = [];

      if (systemText) {
        messages.push({ role: "system", content: systemText });
      }

      // Append conversation history
      for (const msg of pastMessages) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Append current user prompt
      messages.push({ role: "user", content: promptText });

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

      // Store user prompt and assistant response in chat memory database
      if (enableMemory && text) {
        await prisma.chatMessage.createMany({
          data: [
            { sessionId, role: "user", content: promptText },
            { sessionId, role: "assistant", content: text },
          ],
        });
      }

      return {
        text,
        model,
        provider: "openai",
        ...(enableMemory ? { sessionId, memoryTurns: pastMessages.length } : {}),
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
