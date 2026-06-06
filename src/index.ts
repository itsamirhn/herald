import { handleAdminAliases, handleAdminHooks, requireAccess } from "./routes/admin.ts";
import { handleHookPost } from "./routes/hooks.ts";
import { handleTelegramWebhook } from "./routes/telegram.ts";
import { handleAdminUi } from "./routes/ui.ts";
import type { Env } from "./types.ts";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return new Response("herald ok", { headers: { "content-type": "text/plain" } });
    }

    const hookMatch = path.match(/^\/h\/([0-9a-fA-F-]{36})$/);
    if (hookMatch) {
      if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
      return handleHookPost(req, env, hookMatch[1]);
    }

    const tgMatch = path.match(/^\/tg\/webhook\/([^/]+)$/);
    if (tgMatch) {
      if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
      return handleTelegramWebhook(req, env, tgMatch[1]);
    }

    if (path === "/admin" || path.startsWith("/admin/")) {
      const denied = requireAccess(req);
      if (denied) return denied;

      if (path === "/admin" && req.method === "GET") return handleAdminUi();
      if (path === "/admin/aliases" && req.method === "GET") return handleAdminAliases(req, env);
      if (path === "/admin/hooks" || path.startsWith("/admin/hooks/")) {
        return handleAdminHooks(req, env, url);
      }
      return new Response("not found", { status: 404 });
    }

    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
