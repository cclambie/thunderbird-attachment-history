const HISTORY_KEY = "history";
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
let history = [];

async function load() {
  ({ [HISTORY_KEY]: history = [] } = await messenger.storage.local.get(HISTORY_KEY));
  await render();
}

async function render() {
  const q = searchEl.value.trim().toLowerCase();
  const shown = history.filter((e) =>
    !q ||
    [e.message.subject, e.message.author, ...e.files.map((f) => f.name)]
      .join("\n").toLowerCase().includes(q));

  listEl.replaceChildren();
  emptyEl.hidden = history.length > 0;

  for (const entry of shown) {
    const exists = await Promise.all(
      entry.files.map(async (f) => {
        try {
          const [d] = await messenger.downloads.search({ id: f.downloadId });
          return !!d && d.exists !== false;
        } catch { return false; }
      }));
    listEl.append(renderEntry(entry, exists));
  }
}

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function renderEntry(entry, exists) {
  const single = entry.files.length === 1;
  const allGone = exists.every((x) => !x);
  const errorEl = el("div", { className: "error" });

  const run = (fn) => async () => {
    errorEl.textContent = "";
    try { await fn(); }
    catch (err) { errorEl.textContent = `Could not open: ${err.message}`; }
  };

  const actions = el("div", { className: "actions" });
  actions.append(
    single
      ? el("button", { textContent: "Open file", disabled: allGone,
          onclick: run(() => messenger.downloads.open(entry.files[0].downloadId)) })
      : el("button", { textContent: "Open folder", disabled: allGone,
          onclick: run(() => messenger.downloads.show(entry.files[0].downloadId)) }),
    single && el("button", { textContent: "Show in folder", disabled: allGone,
          onclick: run(() => messenger.downloads.show(entry.files[0].downloadId)) }),
    el("button", { textContent: "Go to message",
          onclick: run(() => openMessage(entry.message.id)) }),
    el("button", { textContent: "Remove from list", onclick: async () => {
          history = history.filter((e) => e.id !== entry.id);
          await messenger.storage.local.set({ [HISTORY_KEY]: history });
        } }),
  );

  const title = single
    ? el("div", { className: "name", textContent: entry.files[0].name })
    : el("div", { className: "name", textContent: `${entry.files.length} attachments` });
  const meta = el("div", { className: "meta",
    textContent: `${new Date(entry.savedAt).toLocaleString()} · ${entry.message.subject} · ${entry.message.author}` });

  const box = el("div", { className: "entry" + (allGone ? " missing" : "") }, title, meta);
  if (!single) {
    box.append(el("ul", {}, ...entry.files.map((f, i) =>
      el("li", { textContent: f.name + (exists[i] ? "" : " (missing)") }))));
  }
  box.append(el("div", { className: "meta", textContent: entry.folder }), actions, errorEl);
  return box;
}

async function openMessage(id) {
  await messenger.messageDisplay.open({ messageId: id, location: "tab" });
}

document.getElementById("clear").onclick = async () => {
  if (!confirm("Clear the attachment history list? Saved files are not deleted.")) return;
  await messenger.storage.local.set({ [HISTORY_KEY]: [] });
};
searchEl.oninput = render;

const debugEl = document.getElementById("debug");
messenger.storage.local.get("debugLog").then((r) => { debugEl.checked = !!r.debugLog; });
debugEl.onchange = () => messenger.storage.local.set({ debugLog: debugEl.checked });
messenger.storage.onChanged.addListener((c) => { if (c[HISTORY_KEY]) load(); });
load();
