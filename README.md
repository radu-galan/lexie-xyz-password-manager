# Lexie Password Manager — Chrome extension

A Chrome Manifest V3 extension version of the `www_lexie_xyz` password manager. Vault-only: view, search, generate, and copy passwords — no autofill into web pages. Optionally saves the vault, encrypted, to a www.lexie.xyz account.

## Security model — read this

Unlike the web app at `www_lexie_xyz` (where the encryption key and entries are plain React state, gone the instant the tab closes), this extension **persists both the encryption key and the encrypted entries in `chrome.storage.local`**. That means the vault stays unlocked across browser restarts until you explicitly click **Lock**. This is a deliberate convenience-over-purity tradeoff, made because an extension is expected to behave like a persistent local tool rather than a stateless demo.

- **Lock** clears only the stored key — your encrypted entries stay put, and you unlock again with the same key.
- **Unlocking checks the key exactly** against a stored key verifier (`vault.keyVerifier`: a random salt and a PBKDF2-SHA-256 hash of the key, 300,000 iterations; `src/lib/vault/keyCheck.ts`), so any wrong key, even a sum mistyped by one digit, is refused - and nothing about the key can be read from storage. A new vault and a Convert store the verifier right away. An older vault without one is checked by how its decrypted passwords look, then asks once "Do your passwords look right?" - only **Yes** stores the verifier. A stored key that fails the check ("Open anyway") warns again on every load.
- **One vault tab at a time** (`src/lib/vaultTab.ts`): the toolbar button focuses the open vault tab instead of opening another, and any second vault tab waits ("open in another tab") until the first closes — two tabs would overwrite each other's entries.
- **Reset encryption** is a full wipe — it clears both the stored key *and* the stored entries. Don't confuse the two.
- `chrome.storage.local`'s default quota (a few MB depending on Chrome version) is irrelevant at password-manager scale; no `unlimitedStorage` permission is requested.

## Account sync with www.lexie.xyz (optional)

Signed out, this vault is local only, exactly as before. Signing in with a www.lexie.xyz account adds the features below. The panel above the password generator has **Sign in**, **Create account** (same form and rules as www.lexie.xyz: names, email, password, date of birth, sex) and **Recover password** (`src/components/account/AccountForms.jsx`); the recover email's link opens www.lexie.xyz to set the new password, since an email link can't open an extension page.

- **Save to account** — encrypts the *whole* entries JSON (titles and descriptions too) with the current Lexie key and stores it as a new version. The server only ever gets `{"format":"lexie-encrypted-v1","data":"<numbers>"}` and rejects anything else.
- **Versions** — every save is kept, listed with its timestamp and where it was saved from (website / Chrome / Firefox); **Load** decrypts any of them with the current key. A version saved under another key reports that instead of loading garbage.
- On unlock with an empty vault, the newest saved version is loaded automatically.

The web app's password manager reads and writes the same versions, so the same account + same key moves a vault between them. The account login (token only) is kept in `chrome.storage.local` under `account.user`; it ends after the backend's 30-day token validity or when the API answers `X-Account-Token-Invalid: 1`. API: `https://apiwww.lexie.xyz/` (`src/lib/settings.ts`), backend `projects/backend/Modules/LexieXyz`.

Copy/Download/Load file still work as a manual bridge.

## Permissions

`storage`, plus `host_permissions` for `https://apiwww.lexie.xyz/*` (account sign-in and saved versions only). No content scripts — nothing here reads or writes any other page's DOM.

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
npm run build          # Chrome  -> dist/
npm run build:firefox  # Firefox -> dist-firefox/ (MV3 event page instead of a service worker, gecko id password-manager@lexie.xyz)
```

Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/`.
Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select `dist-firefox/manifest.json`. In Firefox, MV3 host permissions can be ungranted (before Firefox 127, or revoked): Sign in / Create account / Recover password ask for *apiwww.lexie.xyz* access first.

Both `dist/` and `dist-firefox/` are committed: run both builds before each commit so they match `src/`.

Always do a full `npm run build` + fresh "Load unpacked" pass before considering a change done — dev mode's module graph can mask packaging-only issues.
