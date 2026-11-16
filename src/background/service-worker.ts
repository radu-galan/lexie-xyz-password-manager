import { focusOpenVaultTab } from '@/lib/vaultTab'

// Toolbar button: bring the open vault tab to the front, or open one. Two
// vault tabs would overwrite each other's entries (see lib/vaultTab.ts).
chrome.action.onClicked.addListener(async () => {
    if (await focusOpenVaultTab()) return
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
})
