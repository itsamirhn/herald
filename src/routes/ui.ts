const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>herald · admin</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --muted:#666; --bg:#fafafa; --card:#fff; --border:#e3e3e3; --accent:#2b6cb0; --danger:#c33; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e8e8e8; --muted:#9aa; --bg:#121212; --card:#1c1c1c; --border:#2a2a2a; --accent:#79b8ff; --danger:#f88; } }
  * { box-sizing: border-box; }
  body { font: 14px/1.45 system-ui, -apple-system, sans-serif; color: var(--fg); background: var(--bg); margin: 0; padding: 24px; }
  main { max-width: 980px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: var(--muted); margin-bottom: 24px; }
  section { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  section h2 { margin: 0 0 12px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { font-weight: 600; color: var(--muted); }
  tr:last-child td { border-bottom: none; }
  code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--fg); cursor: pointer; }
  button.primary { background: var(--accent); color: white; border-color: var(--accent); }
  button.danger { color: var(--danger); border-color: var(--danger); }
  button:hover { filter: brightness(0.95); }
  form.grid { display: grid; gap: 10px; grid-template-columns: 140px 1fr; align-items: center; }
  form.grid label { color: var(--muted); }
  input[type=text], input[type=number] { font: inherit; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); width: 100%; }
  .targets { display: flex; flex-wrap: wrap; gap: 8px; }
  .targets label { display: inline-flex; gap: 4px; align-items: center; padding: 4px 8px; border: 1px solid var(--border); border-radius: 999px; cursor: pointer; }
  .row-actions { display: flex; gap: 6px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; background: var(--bg); border: 1px solid var(--border); margin-right: 4px; font-size: 12px; }
  .url-cell { word-break: break-all; }
  .empty { color: var(--muted); font-style: italic; padding: 12px 0; }
  dialog { border: 1px solid var(--border); border-radius: 8px; background: var(--card); color: var(--fg); padding: 20px; max-width: 480px; width: 90%; }
  dialog::backdrop { background: rgba(0,0,0,0.4); }
  .toast { position: fixed; bottom: 20px; right: 20px; background: var(--fg); color: var(--bg); padding: 10px 14px; border-radius: 6px; opacity: 0; transition: opacity .2s; pointer-events: none; }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
<main>
  <h1>herald</h1>
  <div class="sub">webhook URLs that fan out to Telegram</div>

  <section>
    <h2>Aliases</h2>
    <div id="aliases-empty" class="empty" hidden>No aliases yet. DM your bot with <code>/start &lt;alias&gt;</code> to register one.</div>
    <table id="aliases-table" hidden>
      <thead><tr><th>Alias</th><th>Username</th><th>Chat ID</th><th>Registered</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section>
    <h2>Create webhook</h2>
    <form id="create-form" class="grid">
      <label for="c-name">Name</label>
      <input id="c-name" type="text" placeholder="(optional) deploy-alert" />
      <label>Targets</label>
      <div id="c-targets" class="targets"><span class="empty">register an alias first</span></div>
      <label for="c-expires">Expires on</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="c-expires" type="date" style="width:180px" />
        <span style="color:var(--muted)">leave empty for never</span>
        <button type="submit" class="primary" style="margin-left:auto">Create</button>
      </div>
    </form>
  </section>

  <section>
    <h2>Hooks</h2>
    <div id="hooks-empty" class="empty" hidden>No hooks yet.</div>
    <table id="hooks-table" hidden>
      <thead><tr><th>Name</th><th>URL</th><th>Targets</th><th>Expires</th><th>Calls</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
  </section>
</main>

<dialog id="edit-dialog">
  <h2 style="margin-top:0;font-size:16px">Edit hook</h2>
  <form id="edit-form" class="grid" method="dialog">
    <input id="e-uuid" type="hidden" />
    <label for="e-name">Name</label>
    <input id="e-name" type="text" />
    <label>Targets</label>
    <div id="e-targets" class="targets"></div>
    <label for="e-expires">Expires on</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input id="e-expires" type="date" style="width:180px" />
      <button type="button" id="e-clear-expires" style="font-size:12px">Clear</button>
      <span style="color:var(--muted)">empty = never</span>
    </div>
    <div></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" id="e-cancel">Cancel</button>
      <button type="button" id="e-save" class="primary">Save</button>
    </div>
  </form>
</dialog>

<div id="toast" class="toast"></div>

<script>
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
};
const fmtTs = (s) => s ? new Date(s * 1000).toLocaleString() : '-';
const fmtExpires = (d) => {
  if (!d) return 'never';
  const today = new Date().toISOString().slice(0, 10);
  return d + (d < today ? ' (expired)' : '');
};

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

let aliases = [];
let hooks = [];

function renderTargetPicker(container, selected) {
  container.innerHTML = '';
  if (aliases.length === 0) {
    container.innerHTML = '<span class="empty">register an alias first</span>';
    return;
  }
  for (const a of aliases) {
    const id = container.id + '-' + a.alias;
    const wrap = document.createElement('label');
    wrap.innerHTML = '<input type="checkbox" value="' + a.alias + '" id="' + id + '" /> ' + a.alias;
    if (selected.includes(a.alias)) wrap.querySelector('input').checked = true;
    container.appendChild(wrap);
  }
}
function pickedTargets(container) {
  return $$('input[type=checkbox]', container).filter(c => c.checked).map(c => c.value);
}

function renderAliases() {
  const tbody = $('#aliases-table tbody');
  tbody.innerHTML = '';
  if (aliases.length === 0) { $('#aliases-table').hidden = true; $('#aliases-empty').hidden = false; return; }
  $('#aliases-empty').hidden = true; $('#aliases-table').hidden = false;
  for (const a of aliases) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="mono">' + a.alias + '</td>' +
      '<td>' + (a.username ? '@' + a.username : '-') + '</td>' +
      '<td class="mono">' + a.chat_id + '</td>' +
      '<td>' + fmtTs(a.registered_at) + '</td>';
    tbody.appendChild(tr);
  }
}

function renderHooks() {
  const tbody = $('#hooks-table tbody');
  tbody.innerHTML = '';
  if (hooks.length === 0) { $('#hooks-table').hidden = true; $('#hooks-empty').hidden = false; return; }
  $('#hooks-empty').hidden = true; $('#hooks-table').hidden = false;
  for (const h of hooks) {
    const tr = document.createElement('tr');
    const targetPills = h.targets.map(t => '<span class="pill mono">' + t + '</span>').join('');
    tr.innerHTML =
      '<td>' + (h.name || '<span style="color:var(--muted)">-</span>') + '</td>' +
      '<td class="mono url-cell"><a href="#" data-copy="' + h.url + '">' + h.url + '</a></td>' +
      '<td>' + targetPills + '</td>' +
      '<td>' + fmtExpires(h.expires_on) + '</td>' +
      '<td>' + h.call_count + (h.last_called_at ? '<br><span style="color:var(--muted);font-size:11px">' + fmtTs(h.last_called_at) + '</span>' : '') + '</td>' +
      '<td class="row-actions"><button data-edit="' + h.uuid + '">Edit</button><button class="danger" data-del="' + h.uuid + '">Delete</button></td>';
    tbody.appendChild(tr);
  }
}

async function refresh() {
  const [a, h] = await Promise.all([api('/admin/aliases'), api('/admin/hooks')]);
  aliases = a.aliases || []; hooks = (h.hooks || []);
  renderAliases();
  renderHooks();
  renderTargetPicker($('#c-targets'), []);
}

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.dataset.copy) {
    e.preventDefault();
    await navigator.clipboard.writeText(t.dataset.copy);
    toast('URL copied');
    return;
  }
  if (t.dataset.del) {
    if (!confirm('Delete this hook?')) return;
    try { await api('/admin/hooks/' + t.dataset.del, { method: 'DELETE' }); toast('Deleted'); refresh(); }
    catch (err) { toast(err.message); }
    return;
  }
  if (t.dataset.edit) {
    const h = hooks.find(x => x.uuid === t.dataset.edit);
    if (!h) return;
    $('#e-uuid').value = h.uuid;
    $('#e-name').value = h.name || '';
    $('#e-expires').value = h.expires_on || '';
    $('#e-expires').dataset.original = h.expires_on || '';
    renderTargetPicker($('#e-targets'), h.targets);
    $('#edit-dialog').showModal();
  }
});

$('#e-cancel').addEventListener('click', () => $('#edit-dialog').close());
$('#e-clear-expires').addEventListener('click', () => { $('#e-expires').value = ''; });
$('#e-save').addEventListener('click', async () => {
  const uuid = $('#e-uuid').value;
  const targets = pickedTargets($('#e-targets'));
  if (targets.length === 0) { toast('Pick at least one target'); return; }
  const body = { name: $('#e-name').value || null, targets };
  const exp = $('#e-expires').value;
  const original = $('#e-expires').dataset.original || '';
  if (exp !== original) body.expires_on = exp || null;
  try { await api('/admin/hooks/' + uuid, { method: 'PATCH', body: JSON.stringify(body) });
        $('#edit-dialog').close(); toast('Saved'); refresh(); }
  catch (err) { toast(err.message); }
});

$('#create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const targets = pickedTargets($('#c-targets'));
  if (targets.length === 0) { toast('Pick at least one target'); return; }
  const body = { name: $('#c-name').value || undefined, targets };
  const exp = $('#c-expires').value;
  if (exp) body.expires_on = exp;
  try {
    const { hook } = await api('/admin/hooks', { method: 'POST', body: JSON.stringify(body) });
    $('#c-name').value = ''; $('#c-expires').value = '';
    await navigator.clipboard.writeText(hook.url).catch(() => {});
    toast('Created. URL copied to clipboard');
    refresh();
  } catch (err) { toast(err.message); }
});

refresh().catch(err => toast('Load failed: ' + err.message));
</script>
</body>
</html>`;

export function handleAdminUi(): Response {
  return new Response(HTML, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
