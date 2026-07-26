export interface EncryptionKeyData {
    zeros: number[]
    ones: number[]
    sum: number
}

export interface PasswordEntry {
    title: string
    description: string
    password: string
    verificationText?: string
}

const KEYS = {
    encryptionKey: 'vault.encryptionKey',
    entries: 'vault.entries',
    language: 'vault.language',
} as const

export async function getEncryptionKey(): Promise<EncryptionKeyData | null> {
    const result = await chrome.storage.local.get(KEYS.encryptionKey)
    return result[KEYS.encryptionKey] ?? null
}

export async function setEncryptionKey(key: EncryptionKeyData): Promise<void> {
    await chrome.storage.local.set({ [KEYS.encryptionKey]: key })
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
