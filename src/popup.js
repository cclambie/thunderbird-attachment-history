const COUNT = 5;
const list = document.getElementById("list");

(async () => {
  const { history = [] } = await messenger.storage.local.get("history");
  document.getElementById("empty").hidden = history.length > 0;

  for (const entry of history.slice(0, COUNT)) {
    const single = entry.files.length === 1;
    const id = entry.files[0].downloadId;
    let exists = false;
    try {
      const [d] = await messenger.downloads.search({ id });
      exists = !!d && d.exists !== false;
    } catch {}

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = single ? entry.files[0].name : `${entry.files.length} attachments`;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = `${new Date(entry.savedAt).toLocaleString()} · ${single ? "open file" : "open folder"}`;

    const btn = document.createElement("button");
    btn.title = entry.files[0].path;
    btn.disabled = !exists;
    btn.append(name, sub);
    btn.onclick = async () => {
      try {
        await (single ? messenger.downloads.open(id) : messenger.downloads.show(id));
        window.close();
      } catch (err) {
        sub.textContent = `Could not open: ${err.message}`;
      }
    };
    const li = document.createElement("li");
    if (!exists) li.className = "gone";
    li.append(btn);
    list.append(li);
  }
})();

document.getElementById("all").onclick = async () => {
  await messenger.runtime.sendMessage({ type: "open-history" });
  window.close();
};
