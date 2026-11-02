// Attachment History - background (event page).
// All listeners are registered at top level so the page can be woken by them.

const HISTORY_URL = messenger.runtime.getURL("history.html");
const HISTORY_KEY = "history";
const MAX_ENTRIES = 500;
const DEBUG_KEY = "debugLog";

// Debug logging: toggled from the history page. Errors are always logged;
// everything sent through log() only appears when debug logging is on.
let debugEnabled = false;
const debugReady = messenger.storage.local.get(DEBUG_KEY).then((r) => {
  debugEnabled = !!r[DEBUG_KEY];
});
messenger.storage.onChanged.addListener((changes) => {
  if (changes[DEBUG_KEY]) {
    debugEnabled = !!changes[DEBUG_KEY].newValue;
    if (debugEnabled) logEnvironment();
  }
});
function log(...args) {
  if (debugEnabled) console.log("[Attachment History]", ...args);
}
async function logEnvironment() {
  const [browser, platform] = await Promise.all([
    messenger.runtime.getBrowserInfo?.().catch(() => null),
    messenger.runtime.getPlatformInfo().catch(() => null),
  ]);
  log("Debug logging on.", {
    extension: messenger.runtime.getManifest().version,
    app: browser && `${browser.name} ${browser.version}`,
    platform,
  });
}

messenger.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "open-history") return openHistoryTab();
});

messenger.runtime.onInstalled.addListener(() => {
  messenger.menus.create({
    id: "save-attachments",
    contexts: ["message_attachments"],
    title: "Save with Attachment History",
  });
  messenger.menus.create({
    id: "open-history",
    contexts: ["tools_menu"],
    title: "Attachment History",
  });
});

messenger.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-history") {
    return openHistoryTab();
  }
  if (info.menuItemId === "save-attachments") {
    await debugReady;
    log("Menu clicked", { tab: tab?.id, attachments: info.attachments });
    try {
      await saveAttachments(info, tab);
    } catch (err) {
      console.error("Attachment History: save failed", err);
      notify("Save failed", String(err.message || err));
    }
  }
});

messenger.notifications.onClicked.addListener(async (notificationId) => {
  const history = await loadHistory();
  const entry = history.find((e) => e.id === notificationId);
  if (!entry) return openHistoryTab();
  try {
    await openEntry(entry);
  } catch {
    openHistoryTab();
  }
});

async function openHistoryTab() {
  const [existing] = await messenger.tabs.query({ url: HISTORY_URL });
  if (existing) {
    await messenger.tabs.update(existing.id, { active: true });
    await messenger.windows.update(existing.windowId, { focused: true });
  } else {
    await messenger.tabs.create({ url: HISTORY_URL });
  }
}

// The shape of these results has changed between Thunderbird versions:
// either a plain array of MessageHeaders or a MessageList ({ messages }).
const firstMessage = (r) => (Array.isArray(r) ? r[0] : r?.messages?.[0]);

async function findMessage(info, tab) {
  const fromInfo = firstMessage(info.selectedMessages);
  if (fromInfo) return fromInfo;

  // The tab passed to the menu handler is not always one that Thunderbird's
  // message APIs recognise, so gather candidates from every window's tabs
  // (the tab we were given and the focused window first).
  const tabs = await messenger.tabs.query({});
  const focused = await messenger.windows.getLastFocused().catch(() => null);
  const rank = (t) => (t.id === tab?.id ? 0 : t.windowId === focused?.id && t.active ? 1 : t.active ? 2 : 3);
  tabs.sort((x, y) => rank(x) - rank(y));

  log("Searching tabs for message", tabs.map((t) => t.id));
  const wanted = info.attachments ?? [];
  const tried = [];
  for (const t of tabs) {
    for (const getter of [
      (id) => messenger.messageDisplay.getDisplayedMessages(id),
      (id) => messenger.mailTabs.getSelectedMessages(id),
    ]) {
      let msg;
      try { msg = firstMessage(await getter(t.id)); } catch { continue; }
      if (!msg) continue;
      tried.push({ tab: t.id, message: msg.id });
      log("Candidate message", { tab: t.id, message: msg.id });
      // Confirm this is the message the attachment belongs to.
      try {
        const atts = await messenger.messages.listAttachments(msg.id);
        if (wanted.every((w) => atts.some((a) => a.partName === w.partName && a.name === w.name))) {
          return msg;
        }
      } catch { /* try next */ }
    }
  }

  console.warn(
    "Attachment History: no message found",
    JSON.stringify({ tab, tabs: tabs.map(({ id, windowId, type, active }) => ({ id, windowId, type, active })), tried }, null, 2),
  );
  return null;
}

async function saveAttachments(info, tab) {
  const attachments = info.attachments || [];
  if (!attachments.length) return;

  const message = await findMessage(info, tab);
  if (!message) throw new Error("Could not determine the message.");

  log("Found message", { id: message.id, subject: message.subject });
  const batch = attachments.length > 1;
  const folderName = sanitize(message.subject) || "attachments";
  const files = [];

  for (const att of attachments) {
    const file = await messenger.messages.getAttachmentFile(
      message.id,
      att.partName,
    );
    log("Fetched attachment", { name: att.name, bytes: file.size });
    const url = URL.createObjectURL(file);
    try {
      let downloadId;
      try {
        downloadId = await messenger.downloads.download({
          url,
          // Single file: let the user pick the location. Multiple files:
          // the downloads API cannot pick a folder, so use a subfolder of
          // the default download directory.
          filename: batch ? `${folderName}/${sanitize(att.name)}` : sanitize(att.name),
          saveAs: !batch,
          conflictAction: "uniquify",
        });
      } catch (err) {
        if (/cancel/i.test(String(err.message))) {
          log("Save cancelled by user");
          return;
        }
        throw err;
      }
      log("Download started", { downloadId, batch });
      const item = await waitForDownload(downloadId);
      log("Download complete", { downloadId, path: item.filename });
      files.push({
        downloadId,
        name: att.name,
        path: item.filename,
        size: item.fileSize ?? att.size,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (!files.length) return;

  const entry = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    message: {
      id: message.id,
      subject: message.subject,
      author: message.author,
    },
    files,
    folder: dirname(files[0].path),
  };
  await addEntry(entry);
  log("History entry stored", entry);

  await messenger.notifications.create(entry.id, {
    type: "basic",
    title: batch ? `Saved ${files.length} attachments` : "Attachment saved",
    message: batch
      ? `${entry.folder}\nClick to open the folder.`
      : `${files[0].name}\nClick to open the file.`,
  });
}

// Open the file for single-file entries, or the folder for batches.
async function openEntry(entry) {
  log("Opening from notification", { id: entry.id, files: entry.files.length });
  if (entry.files.length === 1) {
    await messenger.downloads.open(entry.files[0].downloadId);
  } else {
    await messenger.downloads.show(entry.files[0].downloadId);
  }
}

function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    const finish = (fn, val) => {
      messenger.downloads.onChanged.removeListener(listener);
      fn(val);
    };
    const check = async () => {
      const [item] = await messenger.downloads.search({ id });
      if (!item) return finish(reject, new Error("Download vanished."));
      if (item.state === "complete") return finish(resolve, item);
      if (item.state === "interrupted")
        return finish(reject, new Error(`Download interrupted: ${item.error}`));
    };
    const listener = (delta) => {
      if (delta.id === id && delta.state) check().catch((e) => finish(reject, e));
    };
    messenger.downloads.onChanged.addListener(listener);
    check().catch((e) => finish(reject, e));
  });
}

async function loadHistory() {
  const { [HISTORY_KEY]: history = [] } =
    await messenger.storage.local.get(HISTORY_KEY);
  return history;
}

async function addEntry(entry) {
  const history = await loadHistory();
  history.unshift(entry);
  await messenger.storage.local.set({ [HISTORY_KEY]: history.slice(0, MAX_ENTRIES) });
}

function notify(title, message) {
  return messenger.notifications.create({ type: "basic", title, message });
}

function sanitize(name = "") {
  return name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 80);
}

function dirname(path) {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i > 0 ? path.slice(0, i) : path;
}
