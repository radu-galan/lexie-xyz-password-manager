// Does this Lexie key open the entries stored in this browser?
//
// Each entry's password (and verification text) is UTF-8 text encrypted byte
// by byte: every byte became an 8-digit number of digits 1-9, plus the key's
// sum. The right key gives back exactly 8 such digits per number and bytes
// that form valid UTF-8 without control characters. A wrong sum usually
// leaves wrong-length or 0-containing numbers, but a sum off by a small
// amount (one mistyped last digit) only shifts the low digits and can pass
// (~20-25% for a lone 12-character password; less with more entries); a
// wrong digit split gives random
// bytes, which fail these checks for practically every real password
// (a random byte is printable ASCII ~37% of the time, so a 10-character
// password passes by chance about once in 20,000 tries; all stored entries
// together, far less).
//
// Limit: a key that differs only in digits that never occur in the stored
// numbers decrypts them identically, so it can't be told apart. That only
// happens with a vault of one or two very short passwords; with a few real
// entries every digit occurs (tested: 0 of ~20,000 random wrong keys passed).

import type LexieEncryption from '@/lib/lexie-encryption/LexieEncryption'
import StringParser from '@/lib/lexie-encryption/StringParser'
import { decryptBytes } from '@/lib/vault/vaultCrypto'

// What decrypting '' gave (one NUL byte), which older Converts then stored.
export const LEGACY_EMPTY = '\u0000'

// Decrypts one stored password / verification text. An empty one (imported)
// and a legacy NUL (an empty password converted before '' was kept as '')
// both read as '': decrypting '' would give a NUL byte to show and copy.
// A non-string (stored before imports were validated, opened with "Open
// anyway") reads as '' instead of throwing and blanking the vault page.
export function decryptText(encryption: LexieEncryption, cipher: unknown): string {
    if (!cipher || typeof cipher !== 'string') return ''
    const text = new StringParser(encryption, '').decryptByteArray(cipher.trim().split(' '))
    return text === LEGACY_EMPTY ? '' : text
}

// Encrypts one password / verification text as stored ('' stays '').
export function encryptText(encryption: LexieEncryption, text: string): string {
    return text ? new StringParser(encryption, text).encryptString().join(' ') : ''
}

// Deliberately strict (owner's decision): a decrypted control character
// (other than tab / CR / LF) counts as a wrong key, even though a password
// with a pasted ESC or vertical tab then needs "Open anyway". Real passwords
// practically never contain them, and loosening this lets wrong keys through
// more often on small vaults.
function hasControlChars(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        // Tab / newline / carriage return can be pasted into a password or
        // verification text: don't refuse the right key over them.
        if (code === 0x09 || code === 0x0a || code === 0x0d) continue
        if (code < 0x20 || code === 0x7f) return true
    }
    return false
}

// The decrypted text, or null when the numbers or the UTF-8 don't check out.
function decryptStrict(encryption: LexieEncryption, cipher: string): string | null {
    const bytes = decryptBytes(encryption, cipher.trim().split(' '))
    if (!bytes) return null
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
        return null
    }
}

function decryptsCleanly(encryption: LexieEncryption, cipher: string): boolean {
    const text = decryptStrict(encryption, cipher)
    if (text === null) return false
    // A lone NUL byte is an empty password re-encrypted by Convert before it
    // kept '' as '': the right key must still open such a vault.
    if (text === LEGACY_EMPTY) return true
    return !hasControlChars(text)
}

// Does this key open one stored ciphertext? ('' / missing: nothing to open.)
export function keyOpensText(encryption: LexieEncryption, cipher: unknown): boolean {
    if (cipher === undefined || cipher === null || cipher === '') return true
    // Imported JSON can hold anything: a non-string never decrypts.
    return typeof cipher === 'string' && decryptsCleanly(encryption, cipher)
}

// true when there's nothing to check against (empty vault).
export function keyOpensEntries(
    encryption: LexieEncryption,
    entries: Array<{ password?: unknown; verificationText?: unknown }>
): boolean {
    for (const entry of entries) {
        // Stored before imports were validated: a null / non-object entry
        // never opens (and must not throw, which would leave unlock silent).
        if (!entry || typeof entry !== 'object') return false
        if (!keyOpensText(encryption, entry.password) || !keyOpensText(encryption, entry.verificationText)) return false
    }
    return true
}

// Exact key check (owner's decision): a random salt and a slow salted hash
// (PBKDF2-SHA-256) of the key. Unlock recomputes and compares, so any wrong
// key - including a sum mistyped by one digit, which the look-of-the-text
// heuristic above lets through on small vaults - is refused, while nothing
// about the key can be read from what is stored (only brute-forced slowly).
export const KEY_HASH_ITERATIONS = 300000

export interface KeyVerifier {
    v: 2
    salt: string
    hash: string
    iterations: number
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
    const pairs = hex.match(/../g) || []
    const bytes = new Uint8Array(new ArrayBuffer(pairs.length))
    pairs.forEach((pair, i) => { bytes[i] = parseInt(pair, 16) })
    return bytes
}

// Canonical form of the key: the 1-digits, the 0-digits (sorted) and the sum.
async function keyHash(encryption: LexieEncryption, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
    const material = JSON.stringify({
        ones: [...encryption.ones].map(Number).sort(),
        zeros: [...encryption.zeros].map(Number).sort(),
        sum: Number(encryption.sum),
    })
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(material), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256)
    return toHex(new Uint8Array(bits))
}

export async function createKeyVerifier(encryption: LexieEncryption): Promise<KeyVerifier> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    return { v: 2, salt: toHex(salt), hash: await keyHash(encryption, salt, KEY_HASH_ITERATIONS), iterations: KEY_HASH_ITERATIONS }
}

export function isHashedVerifier(verifier: unknown): verifier is KeyVerifier {
    const v = verifier as Partial<KeyVerifier> | null
    return !!v && v.v === 2 && typeof v.salt === 'string' && typeof v.hash === 'string' && Number(v.iterations) > 0
}

// The first verifier format (64 random bytes stored with their encryption):
// exact too, but it let the key be recovered from storage. Still accepted
// once, so it can be replaced by a hashed one on that unlock.
export function isLegacyVerifier(verifier: unknown): boolean {
    const v = verifier as { plain?: unknown; cipher?: unknown } | null
    return !!v && typeof v.plain === 'string' && typeof v.cipher === 'string' && !!v.plain
}

export async function keyMatchesVerifier(encryption: LexieEncryption, verifier: unknown): Promise<boolean> {
    if (isHashedVerifier(verifier)) {
        return (await keyHash(encryption, fromHex(verifier.salt), Number(verifier.iterations))) === verifier.hash
    }
    if (isLegacyVerifier(verifier)) {
        const v = verifier as { plain: string; cipher: string }
        return decryptStrict(encryption, v.cipher) === v.plain
    }
    return false
}
