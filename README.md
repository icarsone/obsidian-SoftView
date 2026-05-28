# SoftView

SoftView is an Obsidian plugin that opens the current Markdown note in a warm, focused reading view inside Obsidian.

It does not generate external HTML, does not open a system browser, and does not modify the source Markdown file. Your Markdown note remains the single source of truth.

## Features

- Open the current Markdown note in a custom SoftView pane.
- Render Markdown through Obsidian's `MarkdownRenderer`.
- Keep Obsidian-style internal links, images, callouts, tags, and embeds as close to native rendering as possible.
- Use a warm paper-like reading layout with comfortable width, line height, spacing, quotes, callouts, and code blocks.
- Open from the ribbon book icon.
- Open from the command `Open current note`.
- Assign your own hotkey in Obsidian settings if you want one.
- Refresh with the icon button in the toolbar.
- Toggle `跟随当前笔记` to follow the currently opened Markdown file.
- Click internal links inside SoftView and navigate within the reading pane.
- Use `返回上一篇` to go back to the previous SoftView article and restore the prior scroll position.

## Build

From this plugin directory:

```bash
npm install
npm run build
```

On Windows PowerShell, if `npm.ps1` is blocked, use:

```bash
npm.cmd install
npm.cmd run build
```

Obsidian loads these files:

```text
manifest.json
main.js
styles.css
```

## Install Locally

During local development, place the plugin folder here:

```text
.obsidian/plugins/meimaid-reader/
```

Then enable `SoftView` in Obsidian's Community plugins settings.

## Use

1. Open any Markdown note in Obsidian.
2. Click the ribbon book icon, or run `Open current note` from the command palette.
3. Read in the SoftView pane.
4. Use the refresh icon after editing the source note.
5. Turn on `跟随当前笔记` if you want SoftView to update when you switch notes.

## Notes

The current local test folder may still be `.obsidian/plugins/meimaid-reader/`, but the plugin id is now `softview` for release.
