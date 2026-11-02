# addons.thunderbird.net listing – Attachment History

Submit at https://addons.thunderbird.net/developers/ (sign in, "Submit a New
Add-on", choose **"On this site"** so it is listed publicly).

## Basic fields
| Field | Value |
|---|---|
| Name | Attachment History |
| Add-on ID | attachment-downloads@craiglambie.com (already in manifest) |
| Slug / URL | attachment-history |
| Version | 0.1.0 |
| License | MIT |
| Author | Craig Lambie / Lambie Labs |
| Categories | pick the closest: "Message and News Reading" (and optionally "Miscellaneous") |
| Tags | attachments, downloads, history, files |
| Support site | https://github.com/cclambie/thunderbird-attachment-history/issues |
| Homepage | [Lambie Labs post or GitHub URL] |
| Support email | [your choice] |
| Source code | https://github.com/cclambie/thunderbird-attachment-history (the shipped code is unminified; no build step) |
| Privacy policy | paste `PRIVACY.md` |
| Compatibility | Thunderbird 153 ESR (153.0+). Tested on 153.5.1 ESR, Linux 64-bit only |

## Summary (max 250 chars)
Keeps a downloads-style history of attachments you save. One click opens the file, or the folder when you saved several. Browse and search past saves from a toolbar popup or the Tools menu.

## Description
Thunderbird saves attachments and then forgets about them. Attachment History
gives you what Gmail in a browser does: a downloads list for your attachments.

**Features**
- "Save with Attachment History" in the attachment right-click menu
- One-click open of the saved file (single attachment) or folder (several)
- Toolbar popup with your most recent saves
- Full history tab (Tools → Attachment History) with search, "show in folder",
  "go to message", and remove
- Click-to-open notification after saving
- Saved files that were moved or deleted are clearly marked

**Notes**
- Thunderbird's built-in Save As cannot be observed by extensions, so use the
  extension's menu item to have a save recorded.
- Saving several attachments at once puts them in a subfolder of your default
  download folder named after the email subject.
- Tested on Thunderbird 153.5.1 ESR on Linux only. If you try it on another
  version or OS and hit a problem, please open an issue on GitHub (turn on
  "Debug log" on the history page and include the console output).
- Everything stays on your computer; the extension makes no network requests.
  Open source, MIT licensed.

## Permission justifications (for reviewers)
| Permission | Why |
|---|---|
| menus | Adds the attachment context-menu item and Tools menu item |
| messagesRead | Reads the clicked attachment and finds the message it belongs to |
| downloads | Saves the attachment to disk and records the saved path |
| downloads.open | Opens a saved file / shows its folder from the history |
| storage | Stores the history list locally |
| notifications | Shows "attachment saved" notification |
| tabs | Finds an already-open history tab (query by URL) and the message-display tab |
| data_collection_permissions | `none` – no data collected or transmitted |

## Reviewer notes
- No remote code, no network requests, no minification; upload is the contents
  of `src/` zipped as-is.
- To test: open an email with an attachment, right-click the attachment →
  "Save with Attachment History", then Tools → Attachment History.

## Release notes (0.1.0)
Initial release.

## Build the upload package
    npx web-ext build -s src -a dist
(or `cd src && zip -r ../attachment-history-0.1.0.zip .`)

## Before submitting
- [x] Save flow tested end to end on 153.5.1 ESR, Linux
- [ ] Replace placeholder URLs/dates in this file and the blog post
- [ ] Add 3–4 screenshots (popup, history tab, context menu, notification)
- [ ] Consider PNG icons (48/96 px) if ATN rejects the SVG
- [ ] Push to GitHub with README, LICENSE, PRIVACY.md
