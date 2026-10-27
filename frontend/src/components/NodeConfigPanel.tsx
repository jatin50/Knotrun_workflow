import { useState } from "react";
import { getNodeTypeDef, type NodeConfig } from "../nodes/nodeTypes";
import type { Credential } from "../lib/credential.api";

interface Props {
  nodeType: string;
  configuration: NodeConfig;
  onChange: (configuration: NodeConfig) => void;
  onDelete: () => void;
  onClose: () => void;
  webhookUrl?: string | null;
  credentials?: Credential[];
}

function NodeConfigPanel({
  nodeType,
  configuration,
  onChange,
  onDelete,
  onClose,
  webhookUrl,
  credentials = [],
}: Props) {
  const def = getNodeTypeDef(nodeType);
  const [copied, setCopied] = useState(false);

  function set(key: string, value: unknown) {
    onChange({ ...configuration, [key]: value });
  }

  async function copyWebhookUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-84 shrink-0 border-l border-slate-800 bg-slate-900/60 p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{def.label}</h2>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {def.category} node
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
          ✕
        </button>
      </div>

      {/* MANUAL TRIGGER */}
      {def.type === "trigger.manual" && (
        <p className="text-xs text-slate-400">
          Starts the workflow manually when you click "Test" or "Run". No extra parameters required.
        </p>
      )}

      {/* WEBHOOK TRIGGER */}
      {def.type === "trigger.webhook" && (
        <div className="space-y-2">
          {webhookUrl ? (
            <>
              <label className="text-xs text-slate-400">Webhook URL</label>
              <div className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-300 break-all font-mono">
                {webhookUrl}
              </div>
              <button
                onClick={copyWebhookUrl}
                className="text-xs text-indigo-400 hover:underline"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <p className="text-xs text-slate-500 pt-1">
                POST requests to this URL trigger the workflow asynchronously. The request body is passed to downstream nodes.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Save the workflow once to generate this node's public webhook URL.
            </p>
          )}
        </div>
      )}

      {/* SCHEDULE TRIGGER */}
      {def.type === "trigger.schedule" && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Cron expression</label>
          <input
            value={(configuration.cron as string) ?? ""}
            onChange={(e) => set("cron", e.target.value)}
            placeholder="*/5 * * * *"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm font-mono outline-none focus:border-slate-500"
          />
          <p className="text-[11px] text-slate-500">
            Standard 5-field cron. E.g. <code className="text-indigo-300">*/5 * * * *</code> (every 5 min) or <code className="text-indigo-300">0 9 * * *</code> (daily at 9am).
          </p>
        </div>
      )}

      {/* HTTP REQUEST */}
      {def.type === "http.request" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Method</label>
            <select
              value={(configuration.method as string) ?? "GET"}
              onChange={(e) => set("method", e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">URL (supports expressions)</label>
            <input
              value={(configuration.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://api.example.com/users/{{ input.id }}"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500 font-mono text-xs"
            />
          </div>
          {["POST", "PUT", "PATCH"].includes(((configuration.method as string) || "GET").toUpperCase()) && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Request Body (JSON)</label>
              <textarea
                value={(configuration.body as string) ?? ""}
                onChange={(e) => set("body", e.target.value)}
                placeholder='{\n  "data": "{{ input.summary }}"\n}'
                rows={3}
                className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs font-mono outline-none focus:border-slate-500"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Authentication / Credential</label>
            <select
              value={(configuration.credentialId as string) ?? ""}
              onChange={(e) => set("credentialId", e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">None (No Auth)</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            {Boolean(configuration.credentialId) && (
              <p className="text-[11px] text-emerald-400">
                Injected into Authorization: Bearer header at runtime.
              </p>
            )}
          </div>
        </>
      )}

      {/* AI PROMPT */}
      {def.type === "ai.prompt" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">AI Provider</label>
            <select
              value={(configuration.provider as string) ?? "openai"}
              onChange={(e) => {
                const prov = e.target.value;
                onChange({
                  ...configuration,
                  provider: prov,
                  model: prov === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini",
                });
              }}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="openai">OpenAI / Compatible (Groq, OpenRouter)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Model Name</label>
            <input
              value={(configuration.model as string) ?? ""}
              onChange={(e) => set("model", e.target.value)}
              placeholder="gpt-4o-mini, gemini-1.5-flash..."
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">API Key Credential</label>
            <select
              value={(configuration.credentialId as string) ?? ""}
              onChange={(e) => set("credentialId", e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Use Server Environment Key</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">System Instructions (Optional)</label>
            <textarea
              value={(configuration.systemPrompt as string) ?? ""}
              onChange={(e) => set("systemPrompt", e.target.value)}
              placeholder="You are an automation assistant..."
              rows={2}
              className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Prompt Template</label>
            <textarea
              value={(configuration.prompt as string) ?? ""}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="Analyze the following input: {{ input }}"
              rows={4}
              className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs font-mono outline-none focus:border-slate-500"
            />
            <p className="text-[11px] text-slate-500">
              Output will be available downstream as <code className="text-indigo-300">input.text</code>.
            </p>
          </div>

          {/* CONVERSATION MEMORY */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(configuration.enableMemory)}
                  onChange={(e) => set("enableMemory", e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                Remember Chat History
              </label>
              {Boolean(configuration.enableMemory) && (
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  Memory Active
                </span>
              )}
            </div>

            {Boolean(configuration.enableMemory) && (
              <div className="space-y-2 pl-2 border-l-2 border-indigo-500/50 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Session ID (Expression or String)</label>
                  <input
                    value={(configuration.sessionId as string) ?? ""}
                    onChange={(e) => set("sessionId", e.target.value)}
                    placeholder="{{ input.sessionId || 'default' }}"
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs font-mono outline-none focus:border-slate-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Runs sharing this Session ID remember their conversation turns.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Context Window (Max Messages)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={(configuration.memoryLimit as number) ?? 10}
                    onChange={(e) => set("memoryLimit", Number(e.target.value))}
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs outline-none focus:border-slate-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Number of recent conversation turns to feed to the model (1–50).
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* POSTGRESQL DATABASE */}
      {def.type === "db.postgres" && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400">SQL Query</label>
          <textarea
            value={(configuration.query as string) ?? ""}
            onChange={(e) => set("query", e.target.value)}
            placeholder="SELECT id, name, email FROM users LIMIT 10;"
            rows={5}
            className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs font-mono outline-none focus:border-slate-500"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Executes SQL directly on your connected Neon database. Supports interpolation like <code className="text-indigo-300">{"'{{ input.userId }}'"}</code>.
          </p>
        </div>
      )}

      {/* COMMUNICATION (SLACK / DISCORD) */}
      {def.type === "communication.webhook" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Platform</label>
            <select
              value={(configuration.platform as string) ?? "slack"}
              onChange={(e) => set("platform", e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="slack">Slack Incoming Webhook</option>
              <option value="discord">Discord Webhook</option>
              <option value="custom">Generic Webhook</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Webhook URL</label>
            <input
              value={(configuration.webhookUrl as string) ?? ""}
              onChange={(e) => set("webhookUrl", e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs font-mono outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Or Select Stored Credential</label>
            <select
              value={(configuration.credentialId as string) ?? ""}
              onChange={(e) => set("credentialId", e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">None (Use URL above)</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Sender / Bot Name</label>
            <input
              value={(configuration.senderName as string) ?? ""}
              onChange={(e) => set("senderName", e.target.value)}
              placeholder="Workflow Bot"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Message Text</label>
            <textarea
              value={(configuration.message as string) ?? ""}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Alert: New workflow output: {{ input.text }}"
              rows={4}
              className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs font-mono outline-none focus:border-slate-500"
            />
          </div>
        </>
      )}

      {/* IF LOGIC */}
      {def.type === "logic.if" && (
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Condition</label>
          <input
            value={(configuration.condition as string) ?? ""}
            onChange={(e) => set("condition", e.target.value)}
            placeholder="e.g. input.status === 200"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500 font-mono text-xs"
          />
          <p className="text-xs text-slate-500">
            Expression with access to <code className="text-indigo-300">input</code> and <code className="text-indigo-300">variables</code>. Connect the green handle for true, red handle for false.
          </p>
        </div>
      )}

      {/* WAIT / DELAY */}
      {def.type === "logic.wait" && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Wait Duration (seconds)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={(configuration.seconds as number) ?? 2}
            onChange={(e) => set("seconds", Number(e.target.value))}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
          />
          <p className="text-[11px] text-slate-500">
            Pauses workflow execution for specified seconds (1-60s) before passing input to the next node.
          </p>
        </div>
      )}

      {/* SET VARIABLE */}
      {def.type === "data.setVariable" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Variable Key</label>
            <input
              value={(configuration.key as string) ?? ""}
              onChange={(e) => set("key", e.target.value)}
              placeholder="e.g. orderId"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Variable Value</label>
            <input
              value={(configuration.value as string) ?? ""}
              onChange={(e) => set("value", e.target.value)}
              placeholder="e.g. 1042"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-slate-500 font-mono text-xs"
            />
          </div>
        </>
      )}

      {/* CUSTOM JAVASCRIPT CODE */}
      {def.type === "data.code" && (
        <div className="space-y-1">
          <label className="text-xs text-slate-400">JavaScript Code</label>
          <textarea
            value={(configuration.code as string) ?? ""}
            onChange={(e) => set("code", e.target.value)}
            placeholder="// Write JS with access to input and variables\nreturn {\n  ...input,\n  processed: true\n};"
            rows={8}
            className="w-full rounded-md bg-slate-800 border border-slate-700 p-2 text-xs font-mono outline-none focus:border-slate-500"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Must return the output value for downstream nodes. Supports <code className="text-indigo-300">input</code>, <code className="text-indigo-300">variables</code>, and <code className="text-indigo-300">await</code>.
          </p>
        </div>
      )}

      <button
        onClick={onDelete}
        className="text-xs text-red-400 hover:text-red-300 transition pt-3 border-t border-slate-800 w-full text-left font-medium"
      >
        Delete this node
      </button>
    </div>
  );
}

export default NodeConfigPanel;
