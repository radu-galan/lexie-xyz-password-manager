import browser from 'webextension-polyfill'

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
    const result = await browser.storage.local.get(KEYS.encryptionKey)
    return (result[KEYS.encryptionKey] as EncryptionKeyData | undefined) ?? null
}

export async function setEncryptionKey(key: EncryptionKeyData): Promise<void> {
    await browser.storage.local.set({ [KEYS.encryptionKey]: key })
}

export async function clearEncryptionKey(): Promise<void> {
    await browser.storage.local.remove(KEYS.encryptionKey)
}

export async function getEntries(): Promise<PasswordEntry[]> {
    const result = await browser.storage.local.get(KEYS.entries)
    return (result[KEYS.entries] as PasswordEntry[] | undefined) ?? []
}

export async function setEntries(entries: PasswordEntry[]): Promise<void> {
    await browser.storage.local.set({ [KEYS.entries]: entries })
}

export async function clearEntries(): Promise<void> {
    await browser.storage.local.remove(KEYS.entries)
}

export async function getLanguage(): Promise<string | null> {
    const result = await browser.storage.local.get(KEYS.language)
    return (result[KEYS.language] as string | undefined) ?? null
}

export async function setLanguage(language: string): Promise<void> {
    await browser.storage.local.set({ [KEYS.language]: language })
}
