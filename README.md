# 🍎📝🌙 TrueMoji (Keep fork)

A fork of [TrueMoji](https://github.com/voidksa/TrueMoji) by **voidksa**, the Chrome extension that swaps your system emoji for Apple, Google, Twemoji, Fluent and other image sets. All the credit for the extension itself goes to voidksa. This fork adds three things I needed every day and could not get from the store build.

Based on TrueMoji 2.0.1. Fork version 2.0.1.5.

## What this fork adds

### Apple emoji in Google Keep, without breaking your notes

TrueMoji 2.0.1 skips editable text on purpose, so Google Keep shows system emoji both on the board and inside an open note. Earlier builds that did draw inside Keep's editor put image tags into the note, and Keep reads its text back from the editor, so the emoji could fall out of the note.

This fork never touches the text inside an editor:

* Closed note cards on the board get normal image replacement. Keep draws them with read only editor markup, so on keep.google.com only truly editable elements count as editors.
* In an open note the real emoji characters stay in the note. Each glyph is made transparent with the CSS Custom Highlight API and the Apple image is drawn on top in a click through layer. Typing, the caret, copy and paste and Keep's saving all see plain text.
* A glyph is hidden only while its image is loaded and on screen, so the worst case is the system emoji, never a missing one.
* Images are cached per page and prewarmed from the board, so an opened note shows Apple images on its first frame with no flash.

### Google Docs emoji in their real colors under Dark Reader's Filter mode

Google Docs draws the whole document body on a canvas. Dark Reader's Filter mode inverts that canvas, so every emoji in the body comes out with inverted colors (yellow faces turn blue). This is Dark Reader issue #8730, and no generic extension can split a canvas.

This fork asks Docs for its annotated canvas. `docs-annotate.js` runs in the page before Docs starts and sets `_docs_annotate_canvas_by_ext`, the same switch writing extensions use to get Docs' screen reader layer. Docs then adds an invisible rect with the text, font and position of every run. The content script measures each emoji with that font and lays a small page colored card with the Apple image over it inside the same tile, so it scrolls and zooms with the page. Under Filter mode the card goes dark with the page and Dark Reader's own image rule keeps the emoji in its real colors.

### A speed pass

* Page changes are collected and handled once per frame, in one walk per changed subtree. Editors, scripts and the extension's own nodes are skipped whole.
* A cheap character test runs before the full emoji pattern, so text without emoji costs almost nothing.
* Images come from one batched message to the background worker, with a cache shared by every tab. A text node is swapped only when all of its images are ready, so there are no blank frames.
* Shadow roots are found in one idle pass instead of on every added element.
* Frames and pages with no emoji never load the emoji dataset, and the dataset is read from a compact copy.
* The Keep overlay reads every position before it writes and does nothing when no editor moved or changed.

Bench medians, headless Chromium, same test pages, 3 runs each:

| Test | TrueMoji 2.0.1 | This fork 2.0.1.5 |
| --- | --- | --- |
| Gmail style page, CPU while idle for 5 s | 1,749 ms | 267 ms |
| Gmail style page, CPU while scrolling | 2,328 ms | 249 ms |
| Keep page, CPU while typing | 91 ms, but it draws no Apple emoji in Keep | 271 ms |
| Busy page with 1,800 emoji, long tasks while loading | 3,477 ms | 1,763 ms |

Everywhere else the fork behaves like TrueMoji 2.0.1: same packs, picker, popup, options and privacy policy.

## Install (unpacked)

1. Download `TrueMoji-keep-fork-2.0.1.5.zip` from the [latest release](https://github.com/firestarter1996/TrueMoji/releases/latest) and unzip it, or clone this repo.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and pick the folder that holds `manifest.json`.
4. If the store copy of TrueMoji is installed, turn it off so only one copy runs.

Chrome reads an unpacked extension's files only when it loads them. After you update the files, press the reload arrow on the extension's card in `chrome://extensions`, then reload your tabs. Chrome also shows a "disable developer mode extensions" notice at launch for any unpacked extension; that is expected.

## Credit

TrueMoji is made by [voidksa](https://github.com/voidksa). The packs, picker, options, popup, translations and the whole base of this extension are their work. If you want the official build, get it from the [Chrome Web Store](https://chromewebstore.google.com/detail/truemoji/elcfpmpgobljibnhecmkmpgdmljdfbbg), and if it helps you, support voidksa through [Creators](https://creators.sa/en/voidksa) or [Buy Me a Coffee](https://buymeacoffee.com/voidksa).

The Arabic readme ([README_ar.md](README_ar.md)) and the screenshots are upstream's and describe the official extension.

## Privacy

Same as upstream: no personal data, telemetry or analytics. The fork adds no network calls. The privacy policy ships inside the extension as `PRIVACY.html`.

## License

MIT, see [LICENSE](LICENSE). Copyright (c) 2024 voidksa. Fork changes are released under the same license.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=firestarter1996/TrueMoji&type=Date)](https://star-history.com/#firestarter1996/TrueMoji&Date)
