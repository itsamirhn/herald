export interface Env {
  herald: D1Database;
  TG_TOKEN: string;
  TG_WEBHOOK_SECRET: string;
}

export interface HookRow {
  uuid: string;
  name: string | null;
  targets: string;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
  call_count: number;
  last_called_at: number | null;
}

export interface Hook {
  uuid: string;
  name: string | null;
  targets: string[];
  expires_at: number | null;
  created_at: number;
  updated_at: number;
  call_count: number;
  last_called_at: number | null;
}

export interface AliasRow {
  alias: string;
  chat_id: number;
  username: string | null;
  registered_at: number;
}

export type ParseMode = "Markdown" | "MarkdownV2" | "HTML";

export interface HookPostBody {
  text: string;
  parse_mode?: ParseMode;
  targets?: string[];
}
