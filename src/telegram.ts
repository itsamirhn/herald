import type { ParseMode } from "./types.ts";

const API = "https://api.telegram.org";

export interface SendResult {
  ok: boolean;
  status: number;
  error?: string;
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  parseMode?: ParseMode,
): Promise<SendResult> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;
  const res = await fetch(`${API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, status: res.status };
  const errText = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: errText.slice(0, 500) };
}
