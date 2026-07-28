# Lexie Password Manager — Chrome & Firefox extension

A Manifest V3 extension version of the `www_lexie_xyz` password manager, built from one shared `src/` and packaged separately for Chrome and Firefox. Vault-only v1: view, search, generate, and copy passwords — no autofill into web pages.

Cross-browser storage/messaging goes through [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) (`browser.*` instead of `chrome.*`), since Firefox's native `chrome.*` alias is callback-only while `browser.*` is Promise-based on both browsers via the polyfill.

## Security model — read this

Unlike the web app at `www_lexie_xyz` (where the encryption key and entries are plain React state, gone the instant the tab closes), this extension **persists both the encryption key and the encrypted entries in `chrome.storage.local`**. That means the vault stays unlocked across browser restarts until you explicitly click **Lock**. This is a deliberate convenience-over-purity tradeoff, made because an extension is expected to behave like a persistent local tool rather than a stateless demo.

- **Lock** clears only the stored key — your encrypted entries stay put, and you unlock again with the same key.
- **Reset encryption** is a full wipe — it clears both the stored key *and* the stored entries. Don't confuse the two.
- `chrome.storage.local`'s default quota (a few MB depending on Chrome version) is irrelevant at password-manager scale; no `unlimitedStorage` permission is requested.

## No sync with the web app

This extension's vault and the `www_lexie_xyz` web app's vault are two entirely separate stores — there's no shared backend and nothing syncs automatically. The bridge between them is the same manual JSON export/import (Copy/Download/Load file) both places already have; use the same encryption key on both sides and the encrypted password strings decrypt identically.

## Permissions

Only `storage`. No `host_permissions`, no content scripts — nothing here reads or writes any other page's DOM.

## Structure

```
src/
  background/service-worker.ts   # MV3 service worker
  components/
    encryption-dialog/           # unlock / set-key dialog
    layout/                      # extension header/chrome
    password-manager/            # vault UI: list, add form, generator, JSON import/export
  lib/
    lexie-encryption/            # client-side encrypt/decrypt + parsing
    storage.ts                   # chrome.storage.local wrapper
    utils/passwordGenerator.ts
    themes/                      # MUI theme
  App.tsx, main.tsx
```

## Development

```sh
npm install
npm run dev             # HMR for the extension page (Chrome only); manifest/service-worker changes need a manual reload
npm run build           # builds both targets: dist/chrome/ and dist/firefox/
npm run build:chrome    # Chrome only
npm run build:firefox   # Firefox only
```

**Chrome**: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/chrome`.

**Firefox (temporary, for testing)**: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select any file inside `dist/firefox` (e.g. `manifest.json` — if the file picker's type filter hides it, switch it to "All Files"). Temporary add-ons are wiped when Firefox restarts — reload after every relaunch.

**Firefox (persistent install)**: regular Firefox (Release/Beta) refuses to permanently install an unsigned add-on, even for personal/self-distribution use — it has to be signed by Mozilla first. One-time setup:

1. Get API credentials from https://addons.mozilla.org/developers/addon/api/key/ (requires a free Firefox account).
2. `npm run sign:firefox -- --api-key=<issuer> --api-secret=<secret>` — signs `dist/firefox` via Mozilla's unlisted (non-public) channel and downloads the signed `.xpi` into `web-ext-artifacts/`.
3. Drag that `.xpi` into a Firefox window (or `about:addons` → gear icon → **Install Add-on From File**) to install it permanently.

Re-run step 2 after every version bump — a signed `.xpi` is tied to the `version` in `manifest.json`/`package.json`.

Always do a full build + fresh unpacked-load pass before considering a change done — dev mode's module graph can mask packaging-only issues.

### Chrome vs. Firefox manifest differences

Both targets share the same `manifest.config.ts`, gated on the `TARGET` env var the build scripts set:

- **Background**: Chrome gets `background.service_worker`; Firefox gets `background.scripts` (an event page — Firefox's MV3 service worker support is still inconsistent).
- **Identity**: Firefox requires `browser_specific_settings.gecko.id` for a stable extension ID; Chrome ignores this key.

Everything else (icons, permissions, popup) is identical between the two.
