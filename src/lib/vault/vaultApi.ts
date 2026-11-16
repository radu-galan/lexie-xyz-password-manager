import Settings from '@/lib/settings'
import { apiRequest } from '@/lib/account'

// Backend: projects/backend/Modules/LexieXyz/Controllers/PasswordsVersionsController.php

export interface PasswordsVersion {
    passwordsVersionsID: number | string
    passwordsVersionsBytes: number | string
    passwordsVersionsSource: 'web' | 'chrome' | 'firefox'
    passwordsVersionsDateTime: string
    // Unix seconds - show this, not the zone-less passwordsVersionsDateTime.
    passwordsVersionsTimestamp: number | null
    passwordsVersionsJson?: string
}

export function listPasswordsVersions(page = 1, limit = 10) {
    return apiRequest<PasswordsVersion>(`${Settings.API_ENDPOINT_PASSWORDS_VERSIONS}?page=${page}&limit=${limit}`)
}

export function getLatestPasswordsVersion() {
    return apiRequest<PasswordsVersion>(Settings.API_ENDPOINT_PASSWORDS_VERSIONS_LATEST)
}

export function getPasswordsVersion(id: number | string) {
    return apiRequest<PasswordsVersion>(`${Settings.API_ENDPOINT_PASSWORDS_VERSIONS}/${encodeURIComponent(String(id))}`)
}

// Backend cap (site config passwordsVersionsMaxBytes): checked before
// sending, because a body over PHP's post_max_size arrives empty.
export const MAX_VAULT_BYTES = 7340032

// baseVersionID: the version this vault was loaded from / last saved as (null:
// never synced). The backend answers 409 + the newer version when another
// device saved since; resend with force to save anyway.
export function savePasswordsVersion(encryptedJson: string, baseVersionID: number | string | null, force = false) {
    return apiRequest<PasswordsVersion>(Settings.API_ENDPOINT_PASSWORDS_VERSIONS, {
        method: 'POST',
        data: {
            passwordsVersionsJson: encryptedJson,
            passwordsVersionsSource: Settings.BROWSER,
            passwordsVersionsBaseID: baseVersionID == null ? '' : String(baseVersionID),
            passwordsVersionsForce: force ? '1' : '0',
        },
    })
}
