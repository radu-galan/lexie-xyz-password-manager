# Lexie Password Manager — Chrome extension

A Chrome Manifest V3 extension version of the `www_lexie_xyz` password manager. Vault-only v1: view, search, generate, and copy passwords — no autofill into web pages.

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
npm run dev     # HMR for the extension page; manifest/service-worker changes need a manual reload
npm run build    # outputs dist/
```

Load unpacked: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/`.

Always do a full `npm run build` + fresh "Load unpacked" pass before considering a change done — dev mode's module graph can mask packaging-only issues.
