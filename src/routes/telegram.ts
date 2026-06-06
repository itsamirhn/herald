import { upsertAlias } from "../db.ts";
import { sendMessage } from "../telegram.ts";
import type { Env } from "../types.ts";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
}

export async function handleTelegramWebhook(
  req: Request,
  env: Env,
  secretFromPath: string,
): Promise<Response> {
  if (secretFromPath !== env.TG_WEBHOOK_SECRET) return new Response("not found", { status: 404 });

  // Telegram also sends X-Telegram-Bot-Api-Secret-Token when secret_token is configured;
  // require it matches as a second factor.
  const header = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (header && header !== env.TG_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const msg = update.message;
  if (!msg || typeof msg.text !== "string") return new Response("ok");

  const text = msg.text.trim();
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/, 2);
    const alias = parts[1];
    if (!alias || !/^[a-zA-Z0-9_-]{1,32}$/.test(alias)) {
      await sendMessage(
        env.TG_TOKEN,
        msg.chat.id,
        "Usage: /start <alias>\nAlias may contain letters, digits, _ and - (max 32).",
      );
      return new Response("ok");
    }
    await upsertAlias(env.herald, alias, msg.chat.id, msg.from?.username ?? null);
    await sendMessage(
      env.TG_TOKEN,
      msg.chat.id,
      `Registered as "${alias}". You'll receive heralds targeted at this alias.`,
    );
  }

  return new Response("ok");
}
