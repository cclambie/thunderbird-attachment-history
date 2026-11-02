# Contributing

Issues and PRs welcome, especially from people testing other Thunderbird
versions or Windows/macOS.

- Code is plain WebExtension JS in `src/`; no build step.
- Platform/version differences live mainly in `background.js`
  (`findMessage`, download handling) and `history.js`/`popup.js`
  (`downloads.open` / `downloads.show`).
- When reporting a compatibility problem, enable **Debug log** and include the
  console output, Thunderbird version and OS.
