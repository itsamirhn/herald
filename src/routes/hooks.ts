import { getHook, recordHookCall, resolveAliases } from "../db.ts";
import { sendMessage } from "../telegram.ts";
import type { Env, HookPostBody } from "../types.ts";

const PARSE_MODES = new Set(["Markdown", "MarkdownV2", "HTML"]);

export async function handleHookPost(
  req: Request,
  env: Env,
  uuid: string,
): Promise<Response> {
  const hook = await getHook(env.herald, uuid);
  if (!hook) return json({ error: "not found" }, 404);

  const today = new Date().toISOString().slice(0, 10);
  if (hook.expires_on !== null && hook.expires_on < today) {
    return json({ error: "gone", expired_on: hook.expires_on }, 410);
  }

  let body: HookPostBody;
  try {
    body = (await req.json()) as HookPostBody;
  } catch {
    return json({ error: "invalid json body" }, 400);
  }
  if (!body || typeof body.text !== "string" || body.text.length === 0) {
    return json({ error: "`text` (string) is required" }, 400);
  }
  if (body.parse_mode && !PARSE_MODES.has(body.parse_mode)) {
    return json({ error: "invalid parse_mode" }, 400);
  }

  const aliasList = body.targets && body.targets.length > 0 ? body.targets : hook.targets;
  const { resolved, missing } = await resolveAliases(env.herald, aliasList);

  if (resolved.length === 0) {
    return json({ sent: 0, failed: [], missing_aliases: missing, error: "no recipients" }, 422);
  }

  const settled = await Promise.allSettled(
    resolved.map((r) => sendMessage(env.TG_TOKEN, r.chat_id, body.text, body.parse_mode, r.thread_id)),
  );

  let sent = 0;
  const failed: { alias: string; error: string }[] = [];
  resolved.forEach((r, i) => {
    const s = settled[i];
    if (s.status === "fulfilled" && s.value.ok) {
      sent++;
    } else {
      const err =
        s.status === "fulfilled" ? `telegram ${s.value.status}: ${s.value.error ?? ""}` : String(s.reason);
      failed.push({ alias: r.alias, error: err });
    }
  });

  await recordHookCall(env.herald, uuid);

  const status = sent > 0 ? 200 : 502;
  return json({ sent, failed, missing_aliases: missing }, status);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
