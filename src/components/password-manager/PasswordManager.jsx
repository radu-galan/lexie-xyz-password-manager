import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import SearchIcon from '@mui/icons-material/Search'
import LockIcon from '@mui/icons-material/Lock'
import LockResetIcon from '@mui/icons-material/LockReset'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import EncryptionKeyDialog from '@/components/encryption-dialog/EncryptionKeyDialog'
import AddPasswordForm from '@/components/password-manager/AddPasswordForm'
import PasswordGenerator from '@/components/password-manager/PasswordGenerator'
import JsonToolbar from '@/components/password-manager/JsonToolbar'
import PasswordEntryRow from '@/components/password-manager/PasswordEntryRow'
import AccountVaultPanel from '@/components/account/AccountVaultPanel'
import LexieEncryption from '@/lib/lexie-encryption/LexieEncryption'
import * as storage from '@/lib/storage'
import { decryptText, encryptText, keyOpensEntries, createKeyVerifier, keyMatchesVerifier, isHashedVerifier, isLegacyVerifier } from '@/lib/vault/keyCheck'
import { isEntry, normalizeEntries } from '@/lib/vault/vaultCrypto'
import { useAccountUser } from '@/lib/account'

const NOT_SYNCED = { snapshot: null, versionID: null, account: null }

export default function PasswordManager({ translations, language }) {
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [encryption, setEncryption] = useState(null)
    const [entries, setEntries] = useState([])
    const [filter, setFilter] = useState('')
    const [passwordPrefill, setPasswordPrefill] = useState(null)
    const [converting, setConverting] = useState(false)
    const [justConverted, setJustConverted] = useState(false)
    // JSON of the entries as last saved to / loaded from the www.lexie.xyz
    // account (null: nothing synced yet), persisted like the entries.
    // { snapshot, versionID, account } - see storage.SyncedState.
    const [synced, setSynced] = useState(NOT_SYNCED)
    const { snapshot: syncedSnapshot, versionID: syncedVersionID, account: syncedAccount } = synced
    const [notice, setNotice] = useState('')
    // The refused unlock (key + what it would open), kept for "Open anyway".
    const [wrongKey, setWrongKey] = useState(null)
    // An older vault opened by the look-of-the-text check: its key, until the
    // user confirms the passwords look right (then a verifier is stored).
    const [confirmKey, setConfirmKey] = useState(null)

    const entriesJson = useMemo(() => storage.entriesSnapshot(entries), [entries])
    const dirty = syncedSnapshot === null ? entries.length > 0 : syncedSnapshot !== entriesJson

    // The account the synced state belongs to (its email), stored with it.
    const accountUser = useAccountUser()
    // Changes that only exist here although an account is in play (signed in,
    // or synced before): Reset / New / Load file ask before discarding them.
    // A signed-out, never-synced vault has no account to lose them from.
    // accountUser undefined = the stored login is still loading: count it as
    // possibly signed in, so an early Reset / New still asks.
    const unsavedToAccount = dirty && (accountUser !== null || syncedSnapshot !== null)
    // Signed out and never synced: these entries exist only in this browser,
    // so New / Load file / Reset ask before replacing them (owner's decision).
    const localOnlyEntries = !unsavedToAccount && accountUser === null && syncedSnapshot === null && entries.length > 0
    const accountEmail = accountUser?.usersEmail ?? null
    const accountEmailRef = useRef(accountEmail)
    useEffect(() => { accountEmailRef.current = accountEmail }, [accountEmail])

    // snapshot '' never equals a JSON array: a restored older version reads as unsaved.
    // Bumped on every stored write of the synced state: the account-change
    // clear below must not remove a state written after it read the old one.
    const syncedWrites = useRef(0)
    const markSynced = useCallback((snapshot, versionID) => {
        syncedWrites.current += 1
        setSynced((current) => ({ snapshot, versionID: versionID ?? null, account: accountEmailRef.current || current.account }))
        storage.setSyncedState(snapshot, versionID ?? null, accountEmailRef.current)
    }, [])

    const forgetSynced = useCallback(() => {
        setSynced(NOT_SYNCED)
        storage.clearSyncedState()
    }, [])

    const handleLoadedFromAccount = useCallback((loadedEntries, versionID, isSynced = true) => {
        setEntries(loadedEntries)
        storage.setEntries(loadedEntries)
        markSynced(isSynced ? storage.entriesSnapshot(loadedEntries) : '', versionID)
    }, [markSynced])

    // Bumped by Reset: a save that was still running when the vault was wiped
    // must not mark the (now empty) vault as synced with that version.
    const [vaultGeneration, setVaultGeneration] = useState(0)
    const vaultGenerationRef = useRef(0)

    // The synced state belongs to one account: forget it when a different
    // account signs in. Keyed by email, not token, so signing in again to the
    // same account (expired / revoked token, logout + login) keeps the base
    // version and doesn't raise a "newer version" prompt about its own save.
    // Reset during render, not in an effect: the account panel's auto-load
    // runs in the same commit and must already see the cleared state (a stale
    // "dirty" would skip it, a stale base ID would go out with a save).
    if (accountEmail && syncedAccount && accountEmail !== syncedAccount) setSynced(NOT_SYNCED)
    // ...and the stored copy.
    useEffect(() => {
        if (!accountEmail) return
        const writesBefore = syncedWrites.current
        storage.getSyncedState().then(({ account: syncedFor }) => {
            if (syncedFor && syncedFor !== accountEmail && syncedWrites.current === writesBefore) storage.clearSyncedState()
        }).catch(() => {})
    }, [accountEmail])

    // One-time hydration from chrome.storage.local on mount — this is exactly what an
    // effect is for (subscribing to/reading an external system), not derived state.
    useEffect(() => {
        Promise.all([storage.getEncryptionKey(), storage.getEntries(), storage.getSyncedState(), storage.getKeyVerifier()]).then(async ([key, storedEntries, storedSynced, verifier]) => {
            if (key) {
                const unlock = await checkedUnlock(key, storedEntries, storedSynced, verifier)
                // A stored key that fails the check (saved by "Open anyway"):
                // warn again on every load instead of opening silently.
                // The key came from storage: no need to write it back.
                if (unlock.keyOk) openVault(unlock, { storeKey: false })
                else setWrongKey(unlock)
            } else {
                setEntries(storedEntries)
                setSynced(storedSynced)
            }
            setLoading(false)
        }).catch(() => {
            // Storage unreadable (e.g. the extension was just updated): don't
            // open an empty vault whose next write could replace the real one.
            setLoadFailed(true)
            setLoading(false)
        })
        // Mount only: reads storage once; openVault / checkedUnlock are stable in effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filteredEntries = useMemo(() => {
        const needle = filter.trim().toLowerCase()
        if (!needle) return entries
        return entries.filter((entry) =>
            entry.title.toLowerCase().includes(needle) || (entry.description || '').toLowerCase().includes(needle)
        )
    }, [entries, filter])

    // Lock only clears the key, so unlocking again must bring the stored vault
    // back before the vault opens: otherwise it looks empty, the next add
    // overwrites the stored entries, and the account panel would auto-load
    // the account's latest version over them.
    async function handleSetEncryption({ ones, zeros, sum }) {
        let storedEntries, storedSynced, verifier
        try {
            [storedEntries, storedSynced, verifier] = await Promise.all([storage.getEntries(), storage.getSyncedState(), storage.getKeyVerifier()])
        } catch {
            // A failed storage read must not leave the Unlock click silent.
            window.alert(translations.LANG_ERROR_GENERIC)
            return
        }
        const unlock = await checkedUnlock({ zeros, ones, sum }, storedEntries, storedSynced, verifier)
        // A wrong key would show the stored passwords as garbage and mix two
        // keys in the vault from the next add / save on: refuse it, but let
        // the user open anyway (a vault that already mixes keys, made before
        // imports were checked, refuses even the right key).
        if (!unlock.keyOk) {
            setWrongKey(unlock)
            return
        }
        openVault(unlock)
    }

    // Is this key the vault's? Exactly, through the stored key verifier; a
    // vault from before verifiers by the look of its decrypted entries - and
    // it gets a verifier on this successful unlock (createVerifier).
    // Is this key the vault's?
    //   - with a verifier: exactly (salted hash; the first format still once)
    //   - a new, empty vault: yes - the key being set is right by definition
    //   - an older vault without one: by the look of its decrypted passwords,
    //     which a mistyped sum can pass - so the user confirms once
    //     (needsConfirm) before a verifier is stored for this key.
    async function checkedUnlock(key, storedEntries, storedSynced, verifier) {
        const encryption = new LexieEncryption(key.zeros, key.ones, key.sum)
        let keyOk = false
        let verified = false
        try {
            if (isHashedVerifier(verifier) || isLegacyVerifier(verifier)) {
                keyOk = verified = await keyMatchesVerifier(encryption, verifier)
            } else if (!storedEntries || storedEntries.length === 0) {
                keyOk = verified = true
            } else {
                keyOk = keyOpensEntries(encryption, storedEntries)
            }
        } catch {
            // A malformed stored key / vault: refuse it (the wrong-key alert
            // offers Reset vault) instead of a dead-end load error.
            keyOk = verified = false
        }
        return {
            key,
            encryption,
            storedEntries,
            synced: storedSynced,
            keyOk,
            // Store a (hashed) verifier: none yet or the first format, key verified.
            createVerifier: verified && !isHashedVerifier(verifier),
            needsConfirm: keyOk && !verified,
        }
    }

    function storeVerifierFor(nextEncryption) {
        createKeyVerifier(nextEncryption).then((verifier) => storage.setKeyVerifier(verifier)).catch(() => {})
    }

    // Also used by "Open anyway": that unlock has createVerifier false, so a
    // wrong key never replaces the vault's real verifier.
    function openVault({ key, encryption: nextEncryption, storedEntries, synced: storedSynced, createVerifier, needsConfirm }, { storeKey = true } = {}) {
        setWrongKey(null)
        // Normalized like a save (null description -> ''): otherwise the saved
        // snapshot never equals these entries and the vault stays "unsaved".
        setEntries(normalizeEntries(storedEntries))
        setSynced(storedSynced)
        setEncryption(nextEncryption)
        if (storeKey) storage.setEncryptionKey(key)
        if (createVerifier) storeVerifierFor(nextEncryption)
        setConfirmKey(needsConfirm ? nextEncryption : null)
    }

    // "Do your passwords look right?" for an older vault (owner's decision):
    // only Yes stores the verifier for this key; No locks again.
    function handleConfirmKey(correct) {
        const confirmed = confirmKey
        setConfirmKey(null)
        if (correct && confirmed) storeVerifierFor(confirmed)
        else handleLock()
    }

    // Full wipe — clears the stored key AND the stored entries. Distinct from Lock (below),
    // which only clears the key so the encrypted vault survives.
    // Toolbar Reset: ask first only when there are changes not saved to the
    // account (they'd be lost); otherwise reset right away, as before. A
    // local-only vault (signed out, never synced) has no account to speak of.
    function handleResetClick() {
        if (unsavedToAccount && !window.confirm(translations.LANG_RESET_UNSAVED_CONFIRM)) return
        if (localOnlyEntries && !window.confirm(translations.LANG_LOCAL_RESET_CONFIRM)) return
        handleResetEncryption()
    }

    function handleResetEncryption() {
        setConfirmKey(null)
        vaultGenerationRef.current += 1
        setVaultGeneration(vaultGenerationRef.current)
        setWrongKey(null)
        setEncryption(null)
        setEntries([])
        storage.clearEncryptionKey()
        storage.clearEntries()
        storage.clearKeyVerifier()
        forgetSynced()
    }

    function handleLock() {
        setConfirmKey(null)
        setEncryption(null)
        setEntries([])
        storage.clearEncryptionKey()
    }

    function handleAdd(entry) {
        const next = [...entries, entry]
        setEntries(next)
        storage.setEntries(next)
    }

    function handleReplaceEntries(loaded) {
        // A null description (older exports) is kept as '', as on save.
        const next = normalizeEntries(loaded)
        // Entries without a string title / password would break Convert and
        // make every saved account version fail to load (decryptVault).
        if (!next.every(isEntry)) {
            window.alert(translations.LANG_IMPORT_INVALID_FILE)
            return
        }
        // An imported file encrypted with another key would mix two keys in
        // the vault, and the next unlock would then refuse the right key.
        if (!keyOpensEntries(encryption, next)) {
            window.alert(translations.LANG_IMPORT_WRONG_KEY)
            return
        }
        // New / Load file throw away unsaved changes just like Reset: ask first.
        if (unsavedToAccount && !window.confirm(translations.LANG_REPLACE_ENTRIES_UNSAVED_CONFIRM)) return
        if (localOnlyEntries && !window.confirm(translations.LANG_LOCAL_REPLACE_CONFIRM)) return
        setEntries(next)
        storage.setEntries(next)
    }

    function handleUseGeneratedPassword(value) {
        setPasswordPrefill({ value, token: Date.now() })
    }

    function handleDelete(index) {
        const next = entries.filter((_, i) => i !== index)
        setEntries(next)
        storage.setEntries(next)
    }

    // React key per entry object: an index key would hand a row's state (an
    // open password edit with its decrypted draft, "revealed") to whichever
    // entry takes that index after a delete / Load / import, and saving the
    // draft would then overwrite that other entry's password.
    const rowKeys = useRef(new WeakMap())
    const nextRowKey = useRef(0)
    function rowKey(entry) {
        if (!rowKeys.current.has(entry)) rowKeys.current.set(entry, nextRowKey.current++)
        return rowKeys.current.get(entry)
    }

    function handleUpdate(index, nextEntry) {
        // Same row after an in-place edit: keep its key (and state).
        rowKeys.current.set(nextEntry, rowKey(entries[index]))
        const next = entries.map((entry, i) => (i === index ? nextEntry : entry))
        setEntries(next)
        storage.setEntries(next)
    }

    function handleDragEnd(event) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const next = arrayMove(entries, active.id, over.id)
        setEntries(next)
        storage.setEntries(next)
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    async function handleConvert({ ones, zeros, sum }) {
        // A vault opened anyway with a key that doesn't open every entry:
        // converting would decrypt those entries to garbage and overwrite
        // their only ciphertext for good.
        if (!keyOpensEntries(encryption, entries)) {
            window.alert(translations.LANG_CONVERT_WRONG_KEY)
            return
        }
        const newEncryption = new LexieEncryption(zeros, ones, sum)
        const reEncrypted = entries.map((entry) => {
            // An empty password (imported) stays '': decrypting '' gives a NUL
            // byte, which the unlock key check then refuses as a wrong key.
            // A legacy NUL (an empty password converted before this) becomes '' too.
            const next = { ...entry, password: encryptText(newEncryption, decryptText(encryption, entry.password)) }
            if (entry.verificationText) {
                // An empty / legacy-NUL verification text is dropped, not kept as ''.
                const verification = encryptText(newEncryption, decryptText(encryption, entry.verificationText))
                if (verification) next.verificationText = verification
                else delete next.verificationText
            }
            return next
        })
        // The new key's verifier goes with it, in the same write (the new key
        // is right by definition, so no confirmation is needed).
        let verifier = null
        try {
            verifier = await createKeyVerifier(newEncryption)
        } catch {
            // No verifier: the next unlock falls back to the look-of-the-text check.
        }
        setEntries(reEncrypted)
        setEncryption(newEncryption)
        setConfirmKey(null)
        storage.setEncryptionKeyAndEntries({ zeros, ones, sum }, reEncrypted, verifier)
        setConverting(false)
        setJustConverted(true)
    }

    if (loading) return null
    if (loadFailed) {
        return (
            <Container maxWidth="sm" sx={{ pt: { xs: 4, sm: 6 } }}>
                <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => window.location.reload()}>{translations.LANG_RELOAD}</Button>}>
                    {translations.LANG_ERROR_GENERIC}
                </Alert>
            </Container>
        )
    }

    return (
        <Box>
            <Container maxWidth="sm" sx={{ pt: { xs: 4, sm: 6 }, pb: 8 }}>
                {!encryption ? (
                    <Stack spacing={2}>
                        {wrongKey && (
                            <Alert
                                severity="error"
                            >
                                {translations.LANG_WRONG_KEY_FOR_VAULT}
                                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        variant="outlined"
                                        onClick={() => { if (window.confirm(translations.LANG_OPEN_ANYWAY_CONFIRM)) openVault(wrongKey) }}
                                    >
                                        {translations.LANG_OPEN_ANYWAY}
                                    </Button>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => { if (window.confirm(translations.LANG_RESET_VAULT_CONFIRM)) handleResetEncryption() }}
                                    >
                                        {translations.LANG_RESET_VAULT}
                                    </Button>
                                </Stack>
                            </Alert>
                        )}
                        <EncryptionKeyDialog translations={translations} onSetEncryption={handleSetEncryption} />
                    </Stack>
                ) : (
                    <Stack spacing={2.5}>
                        {confirmKey && (
                            <Alert severity="info">
                                {translations.LANG_CONFIRM_KEY_PROMPT}
                                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                                    <Button color="inherit" size="small" variant="outlined" onClick={() => handleConfirmKey(true)}>
                                        {translations.LANG_CONFIRM_KEY_YES}
                                    </Button>
                                    <Button color="inherit" size="small" onClick={() => handleConfirmKey(false)}>
                                        {translations.LANG_CONFIRM_KEY_NO}
                                    </Button>
                                </Stack>
                            </Alert>
                        )}
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <JsonToolbar entries={entries} translations={translations} onReplace={handleReplaceEntries} />
                            <Stack direction="row" spacing={1}>
                                <Button size="small" color="secondary" startIcon={<SyncAltIcon />} onClick={() => setConverting(true)}>
                                    {translations.LANG_CONVERT_ENCRYPTION}
                                </Button>
                                <Button size="small" color="secondary" startIcon={<LockIcon />} onClick={handleLock}>
                                    {translations.LANG_LOCK}
                                </Button>
                                <Button size="small" color="error" startIcon={<LockResetIcon />} onClick={handleResetClick}>
                                    {translations.LANG_RESET_ENCRYPTION}
                                </Button>
                            </Stack>
                        </Stack>

                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                {translations.LANG_PERSISTENCE_NOTE}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {translations.LANG_PORTABILITY_NOTE}
                            </Typography>
                        </Stack>

                        <AccountVaultPanel
                            user={accountUser}
                            encryption={encryption}
                            entries={entries}
                            dirty={dirty}
                            neverSynced={syncedSnapshot === null}
                            baseVersionID={syncedVersionID}
                            translations={translations}
                            language={language}
                            onLoaded={handleLoadedFromAccount}
                            onSaved={(versionID) => {
                                // Reset during the save: not this vault's version (false: the
                                // panel then shows no "saved" notice either).
                                if (vaultGenerationRef.current !== vaultGeneration) return false
                                markSynced(entriesJson, versionID)
                            }}
                            onNotice={setNotice}
                        />

                        <PasswordGenerator translations={translations} onUsePassword={handleUseGeneratedPassword} />

                        <AddPasswordForm
                            encryption={encryption}
                            translations={translations}
                            onAdd={handleAdd}
                            prefill={passwordPrefill}
                        />

                        <TextField
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={translations.LANG_FILTER_PASSWORDS}
                            fullWidth
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                        />

                        <Stack spacing={1.5}>
                            {filteredEntries.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                    {translations.LANG_NO_PASSWORDS}
                                </Typography>
                            )}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext
                                    items={filteredEntries.map((entry) => entries.indexOf(entry))}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredEntries.map((entry) => {
                                        const entryIndex = entries.indexOf(entry)
                                        return (
                                            <PasswordEntryRow
                                                key={rowKey(entry)}
                                                id={entryIndex}
                                                entry={entry}
                                                encryption={encryption}
                                                translations={translations}
                                                onDelete={() => handleDelete(entryIndex)}
                                                onUpdate={(nextEntry) => handleUpdate(entryIndex, nextEntry)}
                                            />
                                        )
                                    })}
                                </SortableContext>
                            </DndContext>
                        </Stack>
                    </Stack>
                )}
            </Container>

            <Dialog open={converting} onClose={() => setConverting(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{translations.LANG_CONVERT_ENCRYPTION}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {translations.LANG_CONVERT_ENCRYPTION_HELP}
                    </Typography>
                    <EncryptionKeyDialog
                        translations={translations}
                        onSetEncryption={handleConvert}
                        submitLabel={translations.LANG_CONVERT_SUBMIT}
                        embedded
                    />
                </DialogContent>
            </Dialog>

            <Snackbar open={!!notice} autoHideDuration={3000} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setNotice('')} severity="success" variant="filled">
                    {notice}
                </Alert>
            </Snackbar>

            <Snackbar open={justConverted} autoHideDuration={4000} onClose={() => setJustConverted(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setJustConverted(false)} severity="success" variant="filled">
                    {translations.LANG_CONVERTED}
                </Alert>
            </Snackbar>
        </Box>
    )
}
