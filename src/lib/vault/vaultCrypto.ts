// Whole-vault encryption for saving the passwords JSON to the account.
// Kept identical in projects/www_lexie_xyz/app/lib/vault/vaultCrypto.ts.
//
// The entries array is JSON-encoded, UTF-8 encoded, and every byte encrypted
// with the user's Lexie key (the same scheme as each entry's password), so
// the server only ever stores
//   {"format":"lexie-encrypted-v1","data":"<one number per byte, space separated>"}
// and never sees titles, descriptions or passwords. A wrong key decrypts to
// bytes that aren't valid UTF-8 JSON, which decryptVault reports as
// VaultDecryptError instead of returning garbage.

import type LexieEncryption from '@/lib/lexie-encryption/LexieEncryption'

export const VAULT_FORMAT = 'lexie-encrypted-v1'

export interface PasswordEntry {
    title: string
    description: string
    password: string
    verificationText?: string
}

export class VaultDecryptError extends Error {
    constructor(message = 'Could not decrypt the vault with this key') {
        super(message)
        this.name = 'VaultDecryptError'
    }
}

export function encryptVault(encryption: LexieEncryption, entries: PasswordEntry[]): string {
    const bytes = new TextEncoder().encode(JSON.stringify(entries))
    const bits = Array.from(bytes, (byte) => byte.toString(2).padStart(8, '0'))
    const data = encryption.encryptObject(bits).join(' ')
    return JSON.stringify({ format: VAULT_FORMAT, data })
}

// Decrypts space-separated Lexie numbers to bytes, or null when a number
// doesn't give back exactly 8 key digits (1-9) - what a wrong key leaves.
// Shared by decryptVault and the unlock / import key check (keyCheck.ts).
export function decryptBytes(encryption: LexieEncryption, numbers: string[]): Uint8Array | null {
    const bytes = new Uint8Array(numbers.length)
    for (let i = 0; i < numbers.length; i++) {
        const digits = String(parseInt(numbers[i], 10) - encryption.sum)
        if (!/^[1-9]{8}$/.test(digits)) return null
        let bits = ''
        for (const digit of digits) bits += encryption.ones.includes(Number(digit)) ? '1' : '0'
        bytes[i] = parseInt(bits, 2)
    }
    return bytes
}

// A null / missing description (older exports, older saves) is kept as '';
// a null verificationText is dropped (no verification text).
export function normalizeEntry<T>(entry: T): T {
    if (!entry || typeof entry !== 'object') return entry
    const record = entry as Record<string, unknown>
    if (record.description != null && record.verificationText !== null) return entry
    const next: Record<string, unknown> = { ...record }
    if (next.description == null) next.description = ''
    if (next.verificationText === null) delete next.verificationText
    return next as T
}

// normalizeEntry for a whole list (imports, saves). Non-objects pass through
// untouched for isEntry to reject.
export function normalizeEntries<T>(entries: T[]): T[] {
    return entries.map(normalizeEntry)
}

export function isEntry(value: unknown): value is PasswordEntry {
    if (!value || typeof value !== 'object') return false
    const entry = value as Record<string, unknown>
    return typeof entry.title === 'string'
        && typeof entry.password === 'string'
        && (entry.description === undefined || typeof entry.description === 'string')
        && (entry.verificationText === undefined || typeof entry.verificationText === 'string')
}

export function decryptVault(encryption: LexieEncryption, payload: string): PasswordEntry[] {
    let envelope: { format?: unknown; data?: unknown }
    try {
        envelope = JSON.parse(payload)
    } catch {
        throw new VaultDecryptError('Not an encrypted Lexie vault')
    }
    if (envelope?.format !== VAULT_FORMAT || typeof envelope.data !== 'string') {
        throw new VaultDecryptError('Not an encrypted Lexie vault')
    }

    const bytes = decryptBytes(encryption, envelope.data.split(' '))
    if (!bytes) throw new VaultDecryptError()

    let entries: unknown
    try {
        entries = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    } catch {
        throw new VaultDecryptError()
    }
    if (!Array.isArray(entries)) throw new VaultDecryptError()
    // Normalize first: isEntry rejects a null description / verificationText,
    // which normalizeEntry exists to accept (older saves).
    const normalized = normalizeEntries(entries)
    if (!normalized.every(isEntry)) throw new VaultDecryptError()
    return normalized
}
