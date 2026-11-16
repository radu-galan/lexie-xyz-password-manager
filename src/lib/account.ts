// The www.lexie.xyz account login, kept in chrome.storage.local next to the
// vault, and requests to its API.
//
// Same session rules as the web app: the login ends when its token is past
// tokensExpiryTimestamp (Unix seconds, from users/login) or a response carries
// X-Account-Token-Invalid: 1 (backend public/index8.php) - never on a plain
// 401, which also means "not allowed".

import { useEffect, useState } from 'react'
import Settings from '@/lib/settings'

const USER_KEY = 'account.user'
export const TOKEN_INVALID_HEADER = 'X-Account-Token-Invalid'

export interface AccountUser {
    usersEmail?: string
    usersFirstName?: string
    usersLastName?: string
    tokensHash: string
    tokensExpiryTimestamp?: number | string | null
}

export interface ApiAnswer<T = any> {
    httpStatusCode: number
    items?: T[]
    message?: string
    fields?: Record<string, { message?: string } | string>
    pagination?: { current: number; last: number; next: number; total_items: number }
}

function isExpired(user: AccountUser | null): boolean {
    const expiry = Number(user?.tokensExpiryTimestamp)
    return Number.isFinite(expiry) && expiry > 0 && expiry * 1000 <= Date.now()
}

export async function getAccountUser(): Promise<AccountUser | null> {
    const result = await chrome.storage.local.get(USER_KEY)
    const user: AccountUser | null = result[USER_KEY]?.tokensHash ? result[USER_KEY] : null
    if (user && isExpired(user)) {
        await chrome.storage.local.remove(USER_KEY)
        return null
    }
    return user
}

async function forgetLogin(token?: string): Promise<void> {
    // Only if it's still the stored login: a late answer for an older login
    // must not log out a newer one.
    const result = await chrome.storage.local.get(USER_KEY)
    if (!token || result[USER_KEY]?.tokensHash === token) await chrome.storage.local.remove(USER_KEY)
}

// The stored login, updated when it changes (login, logout, expiry) in this
// or any other extension page. undefined while loading.
export function useAccountUser(): AccountUser | null | undefined {
    const [user, setUser] = useState<AccountUser | null | undefined>(undefined)
    useEffect(() => {
        let active = true
        // A change seen before the first read answers is newer than that read.
        let changed = false
        getAccountUser().then(
            (u) => { if (active && !changed) setUser(u) },
            // Storage unreadable: show the signed-out panel rather than none at all.
            () => { if (active && !changed) setUser(null) }
        )
        const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (area !== 'local' || !(USER_KEY in changes)) return
            changed = true
            setUser(changes[USER_KEY].newValue?.tokensHash ? changes[USER_KEY].newValue : null)
        }
        chrome.storage.onChanged.addListener(onChanged)
        return () => {
            active = false
            chrome.storage.onChanged.removeListener(onChanged)
        }
    }, [])

    // A login that expires while the page stays open: once a minute (a
    // timeout to the expiry would overflow setTimeout's ~24.8-day limit for a
    // 30-day token), getAccountUser() removes an expired login, and the
    // onChanged listener above then shows the signed-out panel.
    const expiry = Number(user?.tokensExpiryTimestamp)
    useEffect(() => {
        if (!Number.isFinite(expiry) || expiry <= 0) return
        const timer = setInterval(() => {
            if (expiry * 1000 <= Date.now()) getAccountUser().catch(() => {})
        }, 60000)
        return () => clearInterval(timer)
    }, [expiry])
    return user
}

// JSON request to the account API. Non-JSON answers (nginx error page,
// network down) become { httpStatusCode: <status or 0>, message: 'LANG_ERROR_NETWORK' }.
export async function apiRequest<T = any>(
    endpoint: string,
    { method = 'GET', data, auth = true }: { method?: 'GET' | 'POST' | 'DELETE'; data?: Record<string, string>; auth?: boolean } = {}
): Promise<ApiAnswer<T>> {
    const headers: Record<string, string> = {}
    let token: string | undefined
    if (auth) {
        token = (await getAccountUser())?.tokensHash
        if (!token) return { httpStatusCode: 401, message: 'LANG_INVALID_TOKEN' }
        headers['X-Account-Token'] = token
    }
    let response: Response
    try {
        response = await fetch(`${Settings.API_URL}${endpoint}`, {
            method,
            headers,
            cache: 'no-cache',
            body: data ? new URLSearchParams(data) : undefined,
        })
    } catch {
        return { httpStatusCode: 0, message: 'LANG_ERROR_NETWORK' }
    }
    if (token && response.headers.get(TOKEN_INVALID_HEADER) === '1') await forgetLogin(token)
    try {
        const json = await response.json()
        if (!json || typeof json !== 'object') return { httpStatusCode: response.status, message: 'LANG_ERROR_NETWORK' }
        // A JSON body without httpStatusCode (proxy / PHP error page): use the
        // HTTP status, so callers' 0 / 5xx retry checks still see it.
        if (typeof json.httpStatusCode !== 'number') json.httpStatusCode = response.status
        // forbidden() / notFound() answer message "Forbidden" / "Not Found"
        // with the LANG_ key in response_message: surface the key.
        if (json && typeof json.response_message === 'string' && json.response_message.startsWith('LANG_')) {
            json.message = json.response_message
        }
        return json as ApiAnswer<T>
    } catch {
        return { httpStatusCode: response.status, message: 'LANG_ERROR_NETWORK' }
    }
}

// Firefox MV3 can leave host_permissions ungranted (before Firefox 127, or
// revoked in about:addons): every API call then fails as "can't reach the
// server". Ask from the form submit that needs the API - call it before any
// other await, a permission prompt needs the user's click. Chrome (granted at
// install) resolves true without a prompt.
export async function ensureApiPermission(): Promise<boolean> {
    try {
        return await chrome.permissions.request({ origins: [`${Settings.API_URL}*`] })
    } catch {
        // No permissions API / not from a user gesture: let the request try.
        return true
    }
}

export async function login(usersEmail: string, usersPassword: string): Promise<ApiAnswer<AccountUser>> {
    const data = await apiRequest<AccountUser>(Settings.API_ENDPOINT_LOGIN, {
        method: 'POST',
        data: { usersEmail, usersPassword },
        auth: false,
    })
    const user = data.items?.[0]
    if (data.httpStatusCode === 200 && user?.tokensHash) {
        // Only what the extension needs - not access levels / settings.
        const stored: AccountUser = {
            usersEmail: user.usersEmail,
            usersFirstName: user.usersFirstName,
            usersLastName: user.usersLastName,
            tokensHash: user.tokensHash,
            tokensExpiryTimestamp: user.tokensExpiryTimestamp ?? null,
        }
        await chrome.storage.local.set({ [USER_KEY]: stored })
    }
    return data
}

// Deletes the token on the server (GET users/logout), then forgets it here.
export async function logout(): Promise<void> {
    const token = (await getAccountUser())?.tokensHash
    if (token) {
        // Header, not ?accountToken=: a query string ends up in server logs.
        fetch(`${Settings.API_URL}${Settings.API_ENDPOINT_LOGOUT}`, {
            method: 'GET',
            headers: { 'X-Account-Token': token },
            cache: 'no-store',
        }).catch(() => {})
    }
    await chrome.storage.local.remove(USER_KEY)
}

// Years for the date-of-birth dropdown (18 to 118 years ago).
export function getRegisterYears() {
    return apiRequest<{ year: number | string }>(Settings.API_ENDPOINT_REGISTER_YEAR, { auth: false })
}

// POST users/register (same rules as www.lexie.xyz / art.lexie.xyz).
export function register(data: Record<string, string>) {
    return apiRequest(Settings.API_ENDPOINT_REGISTER, { method: 'POST', data, auth: false })
}

// POST users/recover: emails a link to www.lexie.xyz/recover/password/... to
// set a new account password (an email link can't open an extension page).
export function requestPasswordRecovery(usersEmail: string) {
    return apiRequest(Settings.API_ENDPOINT_USER_RECOVER_PASSWORD, { method: 'POST', data: { usersEmail }, auth: false })
}
