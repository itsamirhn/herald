import {
  deleteHook,
  getHook,
  insertHook,
  listAliases,
  listHooks,
  updateHook,
} from "../db.ts";
import type { Env, Hook } from "../types.ts";

interface CreateBody {
  name?: string;
  targets: string[];
  expires_in_seconds?: number | null;
}

interface PatchBody {
  name?: string | null;
  targets?: string[];
  expires_in_seconds?: number | null;
}

export function requireAccess(req: Request): Response | null {
  // Cloudflare Access injects this header after successful auth. Presence is enough
  // because the Access policy at the edge gates who can reach this Worker at all.
  // (Optional hardening: verify the JWT against the team's JWKS.)
  if (!req.headers.get("Cf-Access-Jwt-Assertion")) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

export async function handleAdminHooks(req: Request, env: Env, url: URL): Promise<Response> {
  const m = url.pathname.match(/^\/admin\/hooks(?:\/([^/]+))?$/);
  if (!m) return json({ error: "not found" }, 404);
  const uuid = m[1];

  if (!uuid) {
    if (req.method === "GET") {
      const hooks = await listHooks(env.herald);
      return json({ hooks: hooks.map((h) => withUrl(h, url)) });
    }
    if (req.method === "POST") {
      const body = (await safeJson(req)) as CreateBody | null;
      if (!body || !Array.isArray(body.targets) || body.targets.length === 0) {
        return json({ error: "`targets` (non-empty string[]) required" }, 400);
      }
      const expires_at =
        body.expires_in_seconds && body.expires_in_seconds > 0
          ? Math.floor(Date.now() / 1000) + body.expires_in_seconds
          : null;
      const hook = await insertHook(env.herald, {
        uuid: crypto.randomUUID(),
        name: body.name ?? null,
        targets: body.targets,
        expires_at,
      });
      return json({ hook: withUrl(hook, url) }, 201);
    }
    return json({ error: "method not allowed" }, 405);
  }

  if (req.method === "GET") {
    const hook = await getHook(env.herald, uuid);
    if (!hook) return json({ error: "not found" }, 404);
    return json({ hook: withUrl(hook, url) });
  }
  if (req.method === "PATCH") {
    const body = (await safeJson(req)) as PatchBody | null;
    if (!body) return json({ error: "invalid body" }, 400);
    const patch: { name?: string | null; targets?: string[]; expires_at?: number | null } = {};
    if ("name" in body) patch.name = body.name ?? null;
    if (body.targets !== undefined) {
      if (!Array.isArray(body.targets) || body.targets.length === 0) {
        return json({ error: "targets must be non-empty array" }, 400);
      }
      patch.targets = body.targets;
    }
    if ("expires_in_seconds" in body) {
      patch.expires_at =
        body.expires_in_seconds && body.expires_in_seconds > 0
          ? Math.floor(Date.now() / 1000) + body.expires_in_seconds
          : null;
    }
    const updated = await updateHook(env.herald, uuid, patch);
    if (!updated) return json({ error: "not found" }, 404);
    return json({ hook: withUrl(updated, url) });
  }
  if (req.method === "DELETE") {
    const ok = await deleteHook(env.herald, uuid);
    return json({ deleted: ok }, ok ? 200 : 404);
  }
  return json({ error: "method not allowed" }, 405);
}

export async function handleAdminAliases(_req: Request, env: Env): Promise<Response> {
  const aliases = await listAliases(env.herald);
  return json({ aliases });
}

function withUrl(hook: Hook, url: URL) {
  return { ...hook, url: `${url.origin}/h/${hook.uuid}` };
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
