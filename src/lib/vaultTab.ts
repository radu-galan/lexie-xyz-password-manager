// One vault page at a time. Each vault tab keeps its own copy of the entries
// in memory and writes it to chrome.storage.local, so two open vault tabs
// would overwrite each other's changes.
//
// - The toolbar button (background/service-worker.ts) first asks an open
//   vault page to bring itself to the front (FOCUS_MESSAGE) and only opens a
//   new tab when none answers.
// - A vault page opened another way (duplicated tab, bookmark) finds the
//   'lexie-vault' Web Lock already held by the first page and waits, showing
//   "already open"; it takes over by itself once that tab closes.

export const FOCUS_MESSAGE = 'lexie-vault:focus'
const LOCK_NAME = 'lexie-vault'

export type VaultTabState = 'pending' | 'owner' | 'waiting'

let started = false
let current: VaultTabState = 'pending'
const listeners = new Set<(state: VaultTabState) => void>()

function setState(state: VaultTabState): void {
    current = state
    for (const listener of listeners) listener(state)
}

// Calls onChange('owner') once this page holds the vault, ('waiting') while
// another page does, and returns an unsubscribe. The lock is requested once
// per page: React StrictMode runs effects twice in development, and a second
// request would wait on this page's own lock. A later caller (a remounted
// gate) gets the current state right away instead of staying on 'pending'.
export function claimVaultTab(onChange: (state: VaultTabState) => void): () => void {
    listeners.add(onChange)
    if (current !== 'pending') onChange(current)
    const unsubscribe = () => { listeners.delete(onChange) }
    if (started) return unsubscribe
    started = true
    if (!navigator.locks) {
        // No Web Locks (very old browser): don't block the vault.
        becomeOwner()
        return unsubscribe
    }
    const holdForever = () => new Promise<void>(() => {})
    // A refused lock request (SecurityError etc.) must not leave the page
    // blank on 'pending' for good: open the vault, as without Web Locks.
    const fallback = () => becomeOwner()
    navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (lock) {
            becomeOwner()
            return holdForever()
        }
        setState('waiting')
        // Queue for the lock: granted when the other vault tab closes.
        // Not fallback here: another tab holds the vault, and opening it in
        // this one too would let the two overwrite each other's entries.
        navigator.locks.request(LOCK_NAME, () => {
            becomeOwner()
            return holdForever()
        }).catch(() => {})
        return undefined
    }).catch(fallback)
    return unsubscribe
}

let owner = false

function becomeOwner(): void {
    // Once: the lock callback's .catch(fallback) can run this a second time
    // after the first call threw, and two listeners would answer twice.
    if (owner) {
        setState('owner')
        return
    }
    owner = true
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== FOCUS_MESSAGE) return false
        // Always answer: an unanswered message leaves the toolbar click
        // waiting with no tab focused or opened.
        focusThisTab().then(
            (focused) => sendResponse({ focused }),
            () => sendResponse({ focused: false })
        )
        return true // answer asynchronously
    })
    setState('owner')
}

async function focusThisTab(): Promise<boolean> {
    // tabs.getCurrent / tabs.update / windows.update need no "tabs" permission.
    const tab = await chrome.tabs.getCurrent()
    if (!tab?.id) return false
    await chrome.tabs.update(tab.id, { active: true })
    if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true })
    return true
}

// Asks the open vault page to bring itself to the front. false when none
// answers ("Receiving end does not exist": no vault page is open) or it
// couldn't focus itself.
export async function focusOpenVaultTab(): Promise<boolean> {
    try {
        const answer = await chrome.runtime.sendMessage({ type: FOCUS_MESSAGE })
        return !!answer?.focused
    } catch {
        return false
    }
}

// From a waiting page: bring the open vault tab forward and close this one.
// If the other tab closed meanwhile, this page gets the lock and opens.
export async function switchToOpenVaultTab(): Promise<void> {
    if (await focusOpenVaultTab()) await closeThisTab()
}

// Firefox doesn't let a page window.close() a tab the user opened; removing
// it through the tabs API works in both browsers (no "tabs" permission needed).
async function closeThisTab(): Promise<void> {
    const tab = await chrome.tabs.getCurrent()
    if (tab?.id !== undefined) await chrome.tabs.remove(tab.id)
    else window.close()
}
