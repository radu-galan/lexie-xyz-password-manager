import { useCallback, useEffect, useRef, useState } from 'react'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import HistoryIcon from '@mui/icons-material/History'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import LogoutIcon from '@mui/icons-material/Logout'
import { ensureApiPermission, logout } from '@/lib/account'
import { LoginForm, CreateAccountForm, RecoverPasswordForm } from '@/components/account/AccountForms'
import { encryptVault, decryptVault, isEntry, normalizeEntries, VaultDecryptError } from '@/lib/vault/vaultCrypto'
import { keyOpensEntries } from '@/lib/vault/keyCheck'
import { getLatestPasswordsVersion, getPasswordsVersion, listPasswordsVersions, savePasswordsVersion, MAX_VAULT_BYTES } from '@/lib/vault/vaultApi'
import { translateMessage } from '@/lib/languages'

const PAGE_SIZE = 10

function formatVersionDate(version, language) {
    const seconds = Number(version.passwordsVersionsTimestamp)
    if (!Number.isFinite(seconds) || seconds <= 0) return version.passwordsVersionsDateTime
    return new Date(seconds * 1000).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium' })
}

function sourceLabel(translations, source) {
    return translations[`LANG_SOURCE_${source}`] || source
}

function formatSize(bytes) {
    const n = Number(bytes) || 0
    return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}


// Saves the vault to the www.lexie.xyz account as a new version (encrypted
// here with the current Lexie key) and loads any saved version back. Same
// versions as the web app's password manager.
//   user                  - the stored login (useAccountUser), undefined while loading
//   baseVersionID         - the version the vault was loaded from / last saved
//                           as (null: never synced); sent with each save so
//                           the backend can flag a newer save from elsewhere
//   onLoaded(entries, id, synced) - replace the vault with decrypted saved
//                           version (next save based on id); synced: it is
//                           the account's newest version
//   onSaved(id)           - the current entries are now saved version id
//                           (returns false: the vault was reset meanwhile)
export default function AccountVaultPanel({ user, encryption, entries, dirty, neverSynced, baseVersionID, translations, language, onLoaded, onSaved, onNotice }) {
    // Signed-out form: null (closed) | 'login' | 'register' | 'recover'.
    const [authMode, setAuthMode] = useState(null)
    // Email of an account just created: prefills Sign in, shows "Account created".
    const [registeredEmail, setRegisteredEmail] = useState(null)
    const openAuth = (mode) => { setAuthMode(mode); setRegisteredEmail(null) }
    const [saving, setSaving] = useState(false)
    const [loadingID, setLoadingID] = useState(null)
    const [error, setError] = useState('')
    const [versionsOpen, setVersionsOpen] = useState(false)
    const [versions, setVersions] = useState([])
    const [pagination, setPagination] = useState(null)
    // Bumped after a save: refreshes the list if it is open by then.
    const [versionsStamp, setVersionsStamp] = useState(0)
    const autoLoadedFor = useRef(null)
    const [autoLoadFailed, setAutoLoadFailed] = useState(false)
    const [autoLoadRetry, setAutoLoadRetry] = useState(0)
    // The entries now, for an auto-load / Load whose answer arrives after
    // they changed: it must not overwrite them.
    const currentEntries = useRef(entries)
    useEffect(() => { currentEntries.current = entries }, [entries])
    // The key in use now (null once this panel unmounts on lock / reset): an
    // answer that arrives after the key changed must not be decrypted with the
    // old one and pushed into the vault.
    const currentEncryption = useRef(encryption)
    useEffect(() => {
        currentEncryption.current = encryption
        return () => { currentEncryption.current = null }
    }, [encryption])

    // The account's latest version didn't decrypt with this key (likely a
    // mistyped key): saving then asks first, so a typo doesn't bury the real
    // vault behind a new "latest". Reset when the key changes.
    const [keyMismatch, setKeyMismatch] = useState(false)
    const [mismatchFor, setMismatchFor] = useState(encryption)
    if (mismatchFor !== encryption) {
        setMismatchFor(encryption)
        setKeyMismatch(false)
    }

    // Another account's version list / error must not linger after a re-login.
    const userToken = user?.tokensHash ?? null
    const [listedFor, setListedFor] = useState(userToken)
    if (listedFor !== userToken) {
        setListedFor(userToken)
        setVersions([])
        setPagination(null)
        setError('')
        // A wrong-key result is about the previous account's versions.
        setKeyMismatch(false)
    }

    const applyVersion = useCallback((version, { silent = false, isLatest = false, baseID = null, synced = true } = {}) => {
        if (currentEncryption.current !== encryption) return
        try {
            const loaded = decryptVault(encryption, version.passwordsVersionsJson)
            onLoaded(loaded, baseID ?? version.passwordsVersionsID, synced)
            // Passwords this key doesn't open (saved after "Open anyway"):
            // loaded with a warning; the next save asks first (handleSave).
            setError(keyOpensEntries(encryption, loaded) ? '' : translations.LANG_VERSION_MIXED_KEYS)
            // Only the latest decrypting clears the mismatch: an older version
            // that opens with this key says nothing about the latest, which a
            // save would still bury without asking.
            if (isLatest) setKeyMismatch(false)
            if (!silent) onNotice?.(translations.LANG_LOADED_VERSION)
        } catch (err) {
            const wrongKey = err instanceof VaultDecryptError
            setError(wrongKey ? translations.LANG_VERSION_WRONG_KEY : translations.LANG_ERROR_GENERIC)
            // Remember which version didn't open: a save after the confirm is
            // based on it, so a newer save from another device still answers 409.
            if (wrongKey && isLatest) setKeyMismatch(version.passwordsVersionsID ?? false)
        }
    }, [encryption, onLoaded, onNotice, translations])

    const userTokenRef = useRef(userToken)
    const userEmailRef = useRef(user?.usersEmail ?? null)
    useEffect(() => { userEmailRef.current = user?.usersEmail ?? null }, [user])
    useEffect(() => { userTokenRef.current = userToken }, [userToken])

    const loadVersions = useCallback(async (page = 1) => {
        const requestedFor = userTokenRef.current
        let data
        try {
            data = await listPasswordsVersions(page, PAGE_SIZE)
        } catch {
            // Storage read failed (apiRequest reads the login): say so instead
            // of an unhandled rejection and a silent "Load more".
            data = { httpStatusCode: 0, message: 'LANG_ERROR_GENERIC' }
        }
        // Answer for a login that has since changed: not this account's list.
        if (userTokenRef.current !== requestedFor) return
        if (data.httpStatusCode !== 200) return setError(translateMessage(translations, data.message))
        // Offset pages shift when a version is saved meanwhile: skip repeats.
        setVersions((current) => {
            const items = data.items || []
            if (page === 1) return items
            const seen = new Set(current.map((v) => String(v.passwordsVersionsID)))
            return [...current, ...items.filter((v) => !seen.has(String(v.passwordsVersionsID)))]
        })
        setPagination(data.pagination || null)
    }, [translations])

    // Signed in with an unlocked, empty vault: bring in the newest saved
    // version once per (login, key).
    // A vault that already had entries under this (login, key) is never
    // auto-filled: emptying it (delete / clear) is the user's choice.
    // An empty vault that differs from the last synced state was emptied on
    // purpose (delete / clear, possibly in an earlier session): don't refill it.
    useEffect(() => {
        if (!user || !encryption) return
        if (autoLoadedFor.current?.token === user.tokensHash && autoLoadedFor.current?.encryption === encryption) return
        autoLoadedFor.current = { token: user.tokensHash, encryption }
        if (entries.length > 0 || dirty) return
        const requestedFor = user.tokensHash
        getLatestPasswordsVersion().then((data) => {
            // Signed out / into another account meanwhile: not this vault's data.
            if (userTokenRef.current !== requestedFor) return
            if (data.httpStatusCode === 200 && data.items?.[0] && currentEntries.current.length === 0) applyVersion(data.items[0], { silent: true, isLatest: true })
            // Network / server error (not "no saved version", not a 4xx refusal
            // that a retry won't change): retry when the tab regains focus or
            // the network comes back (autoLoadRetry).
            else if (data.httpStatusCode === 0 || data.httpStatusCode >= 500) {
                autoLoadedFor.current = null
                setAutoLoadFailed(true)
            }
        }).catch(() => {
            // Storage read failed: retry like a network error.
            autoLoadedFor.current = null
            setAutoLoadFailed(true)
        })
    }, [user, encryption, entries.length, dirty, applyVersion, autoLoadRetry])

    useEffect(() => {
        if (!autoLoadFailed) return
        const retry = () => {
            setAutoLoadFailed(false)
            setAutoLoadRetry((n) => n + 1)
        }
        window.addEventListener('focus', retry)
        window.addEventListener('online', retry)
        return () => {
            window.removeEventListener('focus', retry)
            window.removeEventListener('online', retry)
        }
    }, [autoLoadFailed])

    useEffect(() => {
        if (user && versionsOpen) Promise.resolve().then(() => loadVersions(1))
    }, [user, versionsOpen, loadVersions, versionsStamp])

    async function handleSave() {
        // Firefox can leave / revoke the API host permission after sign-in:
        // ask from this click (before any other await) instead of failing as
        // "can't reach the server".
        if (!(await ensureApiPermission())) return setError(translations.LANG_API_PERMISSION_DENIED)
        // Entries stored before imports were validated may carry a null
        // description: save it as '' instead of failing every save.
        const toSave = normalizeEntries(entries)
        // Only save what loads back: entries decryptVault rejects would
        // otherwise become a "latest" version that reads as "wrong key".
        // (Checked on the entries, not by decrypting the whole ciphertext again.)
        if (!toSave.every(isEntry)) return setError(translations.LANG_ERROR_GENERIC)
        let encrypted
        try {
            encrypted = encryptVault(encryption, toSave)
        } catch {
            return setError(translations.LANG_ERROR_GENERIC)
        }
        if (encrypted.length > MAX_VAULT_BYTES) {
            setError(translations.LANG_VAULT_TOO_LARGE)
            return
        }
        // Mixed keys, from a loaded version or from "Open anyway" with a key
        // that doesn't open every stored entry (checked on the entries now, so
        // fixing them after a load stops the prompt).
        if (!keyOpensEntries(encryption, toSave) && !window.confirm(translations.LANG_SAVE_MIXED_CONFIRM)) return
        let baseID = baseVersionID
        if (keyMismatch) {
            if (!window.confirm(translations.LANG_SAVE_WITH_OTHER_KEY_CONFIRM)) return
            // Based on the version that didn't decrypt (not forced): a newer
            // save from another device since then still answers 409.
            baseID = keyMismatch
        }
        setSaving(true)
        setError('')
        const requestedFor = userEmailRef.current
        let data
        try {
            data = await savePasswordsVersion(encrypted, baseID)
            if (data.httpStatusCode === 409) {
                // Another device / tab saved after this vault was loaded.
                const newer = data.items?.[0]
                const when = newer
                    ? `${formatVersionDate(newer, language)} (${sourceLabel(translations, newer.passwordsVersionsSource)})`
                    : ''
                if (!window.confirm(translations.LANG_VERSION_CONFLICT_CONFIRM.replace('{when}', when))) return
                data = await savePasswordsVersion(encrypted, baseID, true)
            }
        } catch {
            data = { httpStatusCode: 0, message: 'LANG_ERROR_NETWORK' }
        } finally {
            // Always: a throw must not leave Save / Load disabled for good.
            setSaving(false)
        }
        if (data.httpStatusCode !== 200) {
            // A 422 names the problem on the field (too long, not an encrypted
            // vault); "check the highlighted fields" alone highlights nothing here.
            const field = data.fields?.passwordsVersionsJson ?? data.fields?.passwordsVersionsSource
            return setError(translateMessage(translations, (typeof field === 'string' ? field : field?.message) || data.message))
        }
        // Signed out / into another account meanwhile: this version isn't the
        // current account's, so don't mark the vault as synced with it.
        // Same account (email), not same token: signing in again to it while
        // the save ran keeps the save; another account / signed out doesn't.
        if (!userEmailRef.current || userEmailRef.current !== requestedFor) return
        if (onSaved(data.items?.[0]?.passwordsVersionsID ?? null) === false) return
        setKeyMismatch(false)
        onNotice?.(translations.LANG_SAVED_VERSION)
        setVersionsStamp((n) => n + 1)
    }

    async function handleLoad(id) {
        if (!(await ensureApiPermission())) return setError(translations.LANG_API_PERMISSION_DENIED)
        if (dirty && !window.confirm(translations.LANG_REPLACE_UNSAVED_CONFIRM)) return
        setLoadingID(id)
        const requestedFor = userTokenRef.current
        const entriesBefore = entries
        let data
        // The account's newest version now (list metadata only, no
        // ciphertext): the listed versions[0] may predate a save from another
        // device, or this tab's own save while the list was closed.
        let newestNow = null
        try {
            if (id === 'latest') {
                data = await getLatestPasswordsVersion()
            } else {
                const [version, newest] = await Promise.all([getPasswordsVersion(id), listPasswordsVersions(1, 1)])
                data = version
                newestNow = newest.httpStatusCode === 200 ? newest.items?.[0]?.passwordsVersionsID ?? null : null
            }
        } catch {
            data = { httpStatusCode: 0, message: 'LANG_ERROR_NETWORK' }
        } finally {
            // Always: a throw must not leave Save / Load disabled for good.
            setLoadingID(null)
        }
        // Signed out / into another account meanwhile: not this account's version.
        if (userTokenRef.current !== requestedFor) return
        // versions/latest answers 404 when the account has no saved version yet.
        if (id === 'latest' && data.httpStatusCode === 404) return setError(translations.LANG_NO_VERSIONS)
        if (data.httpStatusCode !== 200) return setError(translateMessage(translations, data.message))
        // 200 without an item: the account has no saved version yet.
        if (!data.items?.[0]) return setError(translations.LANG_NO_VERSIONS)
        // Entries edited while the version was downloading: ask before
        // replacing them (the check above only covered the state at click).
        if (currentEntries.current !== entriesBefore && !window.confirm(translations.LANG_REPLACE_UNSAVED_CONFIRM)) return
        // Restoring an older version from the list: the user has seen the
        // newest one, so base the next save on it (no "newer version" prompt).
        // Only the account's newest version counts as "saved": a restored older
        // one shows as unsaved until it is saved again.
        // Base = the newest version the user SAW in the list (not the live
        // newestNow): if another device saved since, the next save must still
        // get the 409 "newer version" prompt instead of burying that save.
        const newestListed = id === 'latest' ? null : versions[0]?.passwordsVersionsID ?? newestNow ?? null
        // Only the live answer proves "newest": the listed versions[0] may be
        // stale, so without it the loaded version shows as unsaved (safe).
        const isNewest = id === 'latest' || (newestNow !== null && String(id) === String(newestNow))
        // The newest version picked from the list is "the latest" too: a wrong
        // key on it must make the next save ask first, as for Load latest.
        applyVersion(data.items[0], { isLatest: isNewest, baseID: newestListed, synced: isNewest })
    }

    if (user === undefined) return null

    if (!user) {
        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">{translations.LANG_LOGIN_TO_SAVE_VAULT}</Typography>
                    {!authMode && (
                        <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" startIcon={<LoginIcon />} onClick={() => openAuth('login')}>
                                {translations.LANG_LOGIN}
                            </Button>
                            <Button size="small" startIcon={<PersonAddIcon />} onClick={() => openAuth('register')}>
                                {translations.LANG_CREATE_ACCOUNT}
                            </Button>
                        </Stack>
                    )}
                </Stack>
                <Collapse in={!!authMode} unmountOnExit>
                    {authMode === 'register' ? (
                        <CreateAccountForm
                            translations={translations}
                            onCreated={(email) => { setAuthMode('login'); setRegisteredEmail(email) }}
                            onLogin={() => openAuth('login')}
                        />
                    ) : authMode === 'recover' ? (
                        <RecoverPasswordForm translations={translations} onLogin={() => openAuth('login')} />
                    ) : (
                        <LoginForm
                            key={registeredEmail || 'login'}
                            translations={translations}
                            initialEmail={registeredEmail || ''}
                            notice={registeredEmail ? translations.LANG_ACCOUNT_CREATED : null}
                            onDone={() => setAuthMode(null)}
                            onCreateAccount={() => openAuth('register')}
                            onRecover={() => openAuth('recover')}
                        />
                    )}
                </Collapse>
            </Paper>
        )
    }

    const hasMore = pagination && pagination.current < pagination.last

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                        {translations.LANG_SIGNED_IN_AS} <strong>{user.usersEmail}</strong>
                    </Typography>
                    <Chip
                        size="small"
                        // Empty and never loaded from / saved to the account: not "Saved",
                        // the account may hold versions this vault never loaded.
                        color={dirty ? 'warning' : neverSynced ? 'default' : 'success'}
                        variant="outlined"
                        label={dirty ? translations.LANG_UNSAVED_CHANGES : neverSynced ? translations.LANG_NOT_SYNCED : translations.LANG_ALL_SAVED}
                    />
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Button
                        size="small"
                        variant="contained"
                        // Nothing to save: already saved (not dirty, synced) - each click
                        // would store another identical full copy - or an empty,
                        // never-synced vault, whose save would bury the account's
                        // real latest version under an empty one.
                        disabled={saving || loadingID !== null || !dirty}
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />}
                        onClick={handleSave}
                    >
                        {saving ? translations.LANG_SAVING : translations.LANG_SAVE_TO_ACCOUNT}
                    </Button>
                    <Button size="small" variant="outlined" disabled={saving || loadingID !== null} onClick={() => handleLoad('latest')}>
                        {translations.LANG_LOAD_LATEST}
                    </Button>
                    <Button size="small" color="secondary" startIcon={<HistoryIcon />} onClick={() => setVersionsOpen((open) => !open)}>
                        {translations.LANG_VERSIONS}
                    </Button>
                    <Button size="small" color="secondary" startIcon={<LogoutIcon />} onClick={() => logout().catch(() => setError(translations.LANG_ERROR_GENERIC))}>
                        {translations.LANG_LOGOUT}
                    </Button>
                </Stack>
                {error && <Typography variant="body2" color="error" role="alert">{error}</Typography>}

                <Collapse in={versionsOpen} unmountOnExit>
                    <Divider sx={{ mb: 1 }} />
                    {versions.length === 0 ? (
                        // A failed list fetch shows its error above, not "no versions".
                        !error && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{translations.LANG_NO_VERSIONS}</Typography>
                    ) : (
                        <Stack divider={<Divider flexItem />}>
                            {versions.map((version) => (
                                <Stack key={version.passwordsVersionsID} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', py: 0.75, gap: 1 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'var(--font-mono)' }}>
                                            {formatVersionDate(version, language)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {sourceLabel(translations, version.passwordsVersionsSource)} · {formatSize(version.passwordsVersionsBytes)}
                                        </Typography>
                                    </div>
                                    <Button
                                        size="small"
                                        disabled={saving || loadingID !== null}
                                        onClick={() => handleLoad(version.passwordsVersionsID)}
                                        startIcon={loadingID === version.passwordsVersionsID ? <CircularProgress size={14} color="inherit" /> : null}
                                    >
                                        {translations.LANG_LOAD}
                                    </Button>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                    {hasMore && (
                        <Button size="small" onClick={() => loadVersions(pagination.current + 1)} sx={{ mt: 1 }}>
                            {translations.LANG_LOAD_MORE}
                        </Button>
                    )}
                </Collapse>
            </Stack>
        </Paper>
    )
}
