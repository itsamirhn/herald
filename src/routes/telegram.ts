import { upsertAlias } from "../db.ts";
import { sendMessage } from "../telegram.ts";
import type { ChatType, Env } from "../types.ts";

interface TelegramChat {
  id: number;
  type: ChatType;
  title?: string;
  username?: string;
}

interface TelegramMessage {
  chat: TelegramChat;
  from?: { username?: string };
  text?: string;
  message_thread_id?: number;
  is_topic_message?: boolean;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

const ALIAS_RE = /^[a-zA-Z0-9_-]{1,32}$/;

export async function handleTelegramWebhook(
  req: Request,
  env: Env,
  secretFromPath: string,
): Promise<Response> {
  if (secretFromPath !== env.TG_WEBHOOK_SECRET) return new Response("not found", { status: 404 });

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

  const msg = update.message ?? update.channel_post;
  if (!msg || typeof msg.text !== "string") return new Response("ok");

  const command = parseCommand(msg.text);
  if (!command) return new Response("ok");

  const threadId = msg.is_topic_message && msg.message_thread_id ? msg.message_thread_id : null;
  const chatType = msg.chat.type;
  const title = msg.chat.title ?? null;
  const reply = (text: string) =>
    sendMessage(env.TG_TOKEN, msg.chat.id, text, undefined, threadId);

  if (command.name === "start" || command.name === "register") {
    const alias = command.arg;
    if (!alias || !ALIAS_RE.test(alias)) {
      const verb = command.name === "start" ? "/start" : "/register";
      await reply(`Usage: ${verb} <alias>\nAlias may contain letters, digits, _ and - (max 32).`);
      return new Response("ok");
    }
    await upsertAlias(env.herald, {
      alias,
      chatId: msg.chat.id,
      username: msg.from?.username ?? null,
      chatType,
      threadId,
      title,
    });
    const where = describeTarget(chatType, title, threadId);
    await reply(`Registered "${alias}" -> ${where}.`);
  }

  return new Response("ok");
}

function parseCommand(text: string): { name: string; arg: string | null } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [head, ...rest] = trimmed.split(/\s+/);
  // Strip "@botname" suffix if present (Telegram appends it in groups).
  const name = head.slice(1).split("@", 1)[0].toLowerCase();
  if (!name) return null;
  const arg = rest.length > 0 ? rest[0] : null;
  return { name, arg };
}

function describeTarget(chatType: ChatType, title: string | null, threadId: number | null): string {
  if (chatType === "private") return "this private chat";
  const base = title ? `${chatType} "${title}"` : chatType;
  return threadId ? `${base} (topic ${threadId})` : base;
}
