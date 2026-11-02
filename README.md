# Attachment History (Thunderbird)

Save attachments and get a downloads-style history with one-click open of the
file (single attachment) or folder (multiple attachments).

## Compatibility
Tested on **Thunderbird 153.5.1 ESR, Linux 64-bit** only. Other versions and
platforms may work but are untested. If you try one and hit a problem, please
[open an issue](https://github.com/cclambie/thunderbird-attachment-history/issues). Pull requests to widen support are welcome.

## How it works
Thunderbird's native "Save As" is invisible to WebExtensions, so the extension
adds its own **Save with Attachment History** entry to the attachment context
menu. It fetches the attachment, saves it via the `downloads` API, and records
the result. History is viewable via **Tools → Attachment History** or the
toolbar button popup.

## Reporting problems
On the history page tick **Debug log**, repeat the problem, then copy the
console output (Tools → Developer Tools → Debug Add-ons → Inspect) into an
issue, with your Thunderbird version and OS.

## Develop
- Load temporary: Debug Add-ons → Load Temporary Add-on → `src/manifest.json`
- Or: `npx web-ext run -s src --target=thunderbird --firefox=/usr/bin/thunderbird`
- Package: `npx web-ext build -s src -a dist`

## Privacy
No data leaves your computer. See [PRIVACY.md](PRIVACY.md).

## License
MIT
