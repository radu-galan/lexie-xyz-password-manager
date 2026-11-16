import type { PasswordEntry } from '@/lib/vault/vaultCrypto'

export type { PasswordEntry }

export interface EncryptionKeyData {
    zeros: number[]
    ones: number[]
    sum: number
}

const KEYS = {
    encryptionKey: 'vault.encryptionKey',
    entries: 'vault.entries',
    language: 'vault.language',
    syncedSnapshot: 'vault.syncedSnapshot',
    syncedVersionID: 'vault.syncedVersionID',
    syncedAccount: 'vault.syncedAccount',
    keyVerifier: 'vault.keyVerifier',
} as const

export async function getEncryptionKey(): Promise<EncryptionKeyData | null> {
    const result = await chrome.storage.local.get(KEYS.encryptionKey)
    return result[KEYS.encryptionKey] ?? null
}

export async function setEncryptionKey(key: EncryptionKeyData): Promise<void> {
    await chrome.storage.local.set({ [KEYS.encryptionKey]: key })
}

// Key and entries in one set(): Convert must never leave the new key stored
// next to the old-key entries (or the reverse) if the second write fails.
export async function setEncryptionKeyAndEntries(key: EncryptionKeyData, entries: PasswordEntry[], verifier?: unknown): Promise<void> {
    // One set(): key, entries (and the new key's verifier) never disagree.
    await chrome.storage.local.set({
        [KEYS.encryptionKey]: key,
        [KEYS.entries]: entries,
        ...(verifier ? { [KEYS.keyVerifier]: verifier } : {}),
    })
}

// The vault key's verifier (lib/vault/keyCheck.ts createKeyVerifier). null:
// a vault from before it existed - created on its next successful unlock.
export async function getKeyVerifier(): Promise<unknown> {
    const result = await chrome.storage.local.get(KEYS.keyVerifier)
    return result[KEYS.keyVerifier] ?? null
}

export async function setKeyVerifier(verifier: unknown): Promise<void> {
    await chrome.storage.local.set({ [KEYS.keyVerifier]: verifier })
}

export async function clearKeyVerifier(): Promise<void> {
    await chrome.storage.local.remove(KEYS.keyVerifier)
}

export async function clearEncryptionKey(): Promise<void> {
    await chrome.storage.local.remove(KEYS.encryptionKey)
}

export async function getEntries(): Promise<PasswordEntry[]> {
    const result = await chrome.storage.local.get(KEYS.entries)
    return result[KEYS.entries] ?? []
}

export async function setEntries(entries: PasswordEntry[]): Promise<void> {
    await chrome.storage.local.set({ [KEYS.entries]: entries })
}

export async function clearEntries(): Promise<void> {
    await chrome.storage.local.remove(KEYS.entries)
}

export async function getLanguage(): Promise<string | null> {
    const result = await chrome.storage.local.get(KEYS.language)
    return result[KEYS.language] ?? null
}

export async function setLanguage(language: string): Promise<void> {
    await chrome.storage.local.set({ [KEYS.language]: language })
}

// JSON of the entries with each object's keys sorted. Chrome's storage hands
// objects back with their keys in alphabetical order, so a plain
// JSON.stringify of the entries read after a reload never equals the snapshot
// taken before it, and the vault would always read as "unsaved changes".
export function entriesSnapshot(entries: unknown): string {
    return JSON.stringify(entries, (_key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
            : value
    )
}

// A snapshot stored before entriesSnapshot existed (keys in insertion order).
function canonicalSnapshot(snapshot: string | null): string | null {
    if (!snapshot) return snapshot
    try {
        return entriesSnapshot(JSON.parse(snapshot))
    } catch {
        return snapshot
    }
}

// The www.lexie.xyz account sync state, written together in one set() so the
// three keys never disagree:
//   snapshot  - JSON of the entries as last saved to / loaded from the account
//               (null: nothing synced yet) - drives "unsaved changes"
//   versionID - the saved version the vault is based on (sent with each save
//               so the backend can flag a newer save from another device)
//   account   - email of the account they belong to
export interface SyncedState {
    snapshot: string | null
    versionID: number | string | null
    account: string | null
}

export async function getSyncedState(): Promise<SyncedState> {
    const result = await chrome.storage.local.get([KEYS.syncedSnapshot, KEYS.syncedVersionID, KEYS.syncedAccount])
    return {
        snapshot: canonicalSnapshot(result[KEYS.syncedSnapshot] ?? null),
        versionID: result[KEYS.syncedVersionID] ?? null,
        account: result[KEYS.syncedAccount] ?? null,
    }
}

export async function setSyncedState(snapshot: string, versionID: number | string | null, account: string | null): Promise<void> {
    await chrome.storage.local.set({
        [KEYS.syncedSnapshot]: snapshot,
        [KEYS.syncedVersionID]: versionID,
        ...(account ? { [KEYS.syncedAccount]: account } : {}),
    })
}

export async function clearSyncedState(): Promise<void> {
    await chrome.storage.local.remove([KEYS.syncedSnapshot, KEYS.syncedVersionID, KEYS.syncedAccount])
}
