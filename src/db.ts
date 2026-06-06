import type { AliasRow, Hook, HookRow } from "./types.ts";

function rowToHook(row: HookRow): Hook {
  return { ...row, targets: JSON.parse(row.targets) as string[] };
}

export async function getHook(db: D1Database, uuid: string): Promise<Hook | null> {
  const row = await db.prepare("SELECT * FROM hooks WHERE uuid = ?").bind(uuid).first<HookRow>();
  return row ? rowToHook(row) : null;
}

export async function listHooks(db: D1Database): Promise<Hook[]> {
  const { results } = await db
    .prepare("SELECT * FROM hooks ORDER BY created_at DESC")
    .all<HookRow>();
  return results.map(rowToHook);
}

export async function insertHook(
  db: D1Database,
  hook: { uuid: string; name: string | null; targets: string[]; expires_at: number | null },
): Promise<Hook> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO hooks (uuid, name, targets, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(hook.uuid, hook.name, JSON.stringify(hook.targets), hook.expires_at, now, now)
    .run();
  return {
    uuid: hook.uuid,
    name: hook.name,
    targets: hook.targets,
    expires_at: hook.expires_at,
    created_at: now,
    updated_at: now,
    call_count: 0,
    last_called_at: null,
  };
}

export async function updateHook(
  db: D1Database,
  uuid: string,
  patch: { name?: string | null; targets?: string[]; expires_at?: number | null },
): Promise<Hook | null> {
  const existing = await getHook(db, uuid);
  if (!existing) return null;
  const next = {
    name: patch.name === undefined ? existing.name : patch.name,
    targets: patch.targets ?? existing.targets,
    expires_at: patch.expires_at === undefined ? existing.expires_at : patch.expires_at,
  };
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE hooks SET name = ?, targets = ?, expires_at = ?, updated_at = ?
       WHERE uuid = ?`,
    )
    .bind(next.name, JSON.stringify(next.targets), next.expires_at, now, uuid)
    .run();
  return { ...existing, ...next, updated_at: now };
}

export async function deleteHook(db: D1Database, uuid: string): Promise<boolean> {
  const res = await db.prepare("DELETE FROM hooks WHERE uuid = ?").bind(uuid).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function recordHookCall(db: D1Database, uuid: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("UPDATE hooks SET call_count = call_count + 1, last_called_at = ? WHERE uuid = ?")
    .bind(now, uuid)
    .run();
}

export async function listAliases(db: D1Database): Promise<AliasRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM aliases ORDER BY alias ASC")
    .all<AliasRow>();
  return results;
}

export async function resolveAliases(
  db: D1Database,
  aliases: string[],
): Promise<{ resolved: AliasRow[]; missing: string[] }> {
  if (aliases.length === 0) return { resolved: [], missing: [] };
  const placeholders = aliases.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT * FROM aliases WHERE alias IN (${placeholders})`)
    .bind(...aliases)
    .all<AliasRow>();
  const found = new Set(results.map((r) => r.alias));
  const missing = aliases.filter((a) => !found.has(a));
  return { resolved: results, missing };
}

export async function upsertAlias(
  db: D1Database,
  alias: string,
  chatId: number,
  username: string | null,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO aliases (alias, chat_id, username, registered_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(alias) DO UPDATE SET
         chat_id = excluded.chat_id,
         username = excluded.username,
         registered_at = excluded.registered_at`,
    )
    .bind(alias, chatId, username, now)
    .run();
}
