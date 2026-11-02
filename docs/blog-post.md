# Attachment History: a downloads panel for Thunderbird

*Lambie Labs · [date]*

If you've used Gmail in a browser, you know the small thing it does well: you
download an attachment, and a moment later there it is in your downloads list,
one click from opening. Thunderbird saves the file and then forgets about it.
You go hunting through Downloads, or the folder you picked three weeks ago,
for the invoice you saved.

So I built **Attachment History**, a Thunderbird extension that keeps a
downloads-style history of the attachments you save, with one-click access to
the file or, for a multi-attachment save, the folder.

## What it does

- **Save with Attachment History**: a new entry in the attachment right-click
  menu. Single attachment: you choose where it goes. Multiple attachments: they
  go into one subfolder named after the email's subject.
- **A toolbar popup** showing your last few saves. Click one to open the file
  (single) or the folder (multiple).
- **A full history tab** (Tools → Attachment History) with search, "show in
  folder", "go to the original message", and removal. Files you've since moved
  or deleted are greyed out rather than failing silently.
- **A notification** after each save, which you can click to open what you just
  saved.

Nothing leaves your machine. The extension makes no network requests and keeps
its list in Thunderbird's local storage.

## The interesting problem

My first assumption was that I'd listen for Thunderbird's own "Save As" and
log it. Extensions can't: Thunderbird's built-in attachment saving doesn't go
through the WebExtension `downloads` API, and there's no event for it. So the
extension supplies its own save command, fetches the attachment with
`messages.getAttachmentFile()`, and saves it through `downloads.download()`.
That way it knows exactly where the file ended up.

That has a cost: you have to use the extension's menu item rather than the
native one. The alternative, a privileged Experiment API hooking the native
save, is more transparent but fragile across versions and can't be offered as
a normal store extension. I chose the supported route.

The second wrinkle: the context-menu click gives the extension the attachment
but not the message it belongs to, and the tab it hands over isn't one the
message APIs recognise. The extension searches the open tabs for the message
whose attachments match what you clicked.

## Status and compatibility

Tested on **Thunderbird 153.5.1 ESR, Linux 64-bit**. That's the only
combination I've verified, so that's all I claim. Other versions and platforms
(Windows, macOS, older ESRs) may well work, and I'd love to hear. If you try it
and something breaks, please open an issue on GitHub: switch on **Debug log** on
the history page, repeat the problem, and paste the console output along with
your Thunderbird version and OS. Pull requests extending support are welcome.

## Get it, or help

- Thunderbird Add-ons: [add link once approved]
- Source (MIT licensed): https://github.com/cclambie/thunderbird-attachment-history
- Issues and ideas: https://github.com/cclambie/thunderbird-attachment-history/issues

Planned: native-style "Save All", a configurable save folder, filtering by
sender or type, and support for more Thunderbird versions.
