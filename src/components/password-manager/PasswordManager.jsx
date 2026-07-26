import { useState, useMemo, useEffect } from 'react'
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
import LexieEncryption from '@/lib/lexie-encryption/LexieEncryption'
import StringParser from '@/lib/lexie-encryption/StringParser'
import * as storage from '@/lib/storage'

export default function PasswordManager({ translations }) {
    const [loading, setLoading] = useState(true)
    const [encryption, setEncryption] = useState(null)
    const [entries, setEntries] = useState([])
    const [filter, setFilter] = useState('')
    const [passwordPrefill, setPasswordPrefill] = useState(null)
    const [converting, setConverting] = useState(false)
    const [justConverted, setJustConverted] = useState(false)

    // One-time hydration from chrome.storage.local on mount — this is exactly what an
    // effect is for (subscribing to/reading an external system), not derived state.
    useEffect(() => {
        Promise.all([storage.getEncryptionKey(), storage.getEntries()]).then(([key, storedEntries]) => {
            if (key) setEncryption(new LexieEncryption(key.zeros, key.ones, key.sum))
            setEntries(storedEntries)
            setLoading(false)
        })
    }, [])

    const filteredEntries = useMemo(() => {
        const needle = filter.trim().toLowerCase()
        if (!needle) return entries
        return entries.filter((entry) =>
            entry.title.toLowerCase().includes(needle) || (entry.description || '').toLowerCase().includes(needle)
        )
    }, [entries, filter])

    function handleSetEncryption({ ones, zeros, sum }) {
        setEncryption(new LexieEncryption(zeros, ones, sum))
        storage.setEncryptionKey({ zeros, ones, sum })
    }

    // Full wipe — clears the stored key AND the stored entries. Distinct from Lock (below),
    // which only clears the key so the encrypted vault survives.
    function handleResetEncryption() {
        setEncryption(null)
        setEntries([])
        storage.clearEncryptionKey()
        storage.clearEntries()
    }

    function handleLock() {
        setEncryption(null)
        setEntries([])
        storage.clearEncryptionKey()
    }

    function handleAdd(entry) {
        const next = [...entries, entry]
        setEntries(next)
        storage.setEntries(next)
    }

    function handleReplaceEntries(next) {
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

    function handleUpdate(index, nextEntry) {
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

    function handleConvert({ ones, zeros, sum }) {
        const newEncryption = new LexieEncryption(zeros, ones, sum)
        const reEncrypted = entries.map((entry) => {
            const plainPassword = new StringParser(encryption, '').decryptByteArray(entry.password.split(' '))
            const newPassword = new StringParser(newEncryption, plainPassword).encryptString().join(' ')
            const next = { ...entry, password: newPassword }
            if (entry.verificationText) {
                const plainVerification = new StringParser(encryption, '').decryptByteArray(entry.verificationText.split(' '))
                next.verificationText = new StringParser(newEncryption, plainVerification).encryptString().join(' ')
            }
            return next
        })
        setEntries(reEncrypted)
        setEncryption(newEncryption)
        storage.setEncryptionKey({ zeros, ones, sum })
        storage.setEntries(reEncrypted)
        setConverting(false)
        setJustConverted(true)
    }

    if (loading) return null

    return (
        <Box>
            <Container maxWidth="sm" sx={{ pt: { xs: 4, sm: 6 }, pb: 8 }}>
                {!encryption ? (
                    <EncryptionKeyDialog translations={translations} onSetEncryption={handleSetEncryption} />
                ) : (
                    <Stack spacing={2.5}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <JsonToolbar entries={entries} translations={translations} onReplace={handleReplaceEntries} />
                            <Stack direction="row" spacing={1}>
                                <Button size="small" color="secondary" startIcon={<SyncAltIcon />} onClick={() => setConverting(true)}>
                                    {translations.LANG_CONVERT_ENCRYPTION}
                                </Button>
                                <Button size="small" color="secondary" startIcon={<LockIcon />} onClick={handleLock}>
                                    {translations.LANG_LOCK}
                                </Button>
                                <Button size="small" color="error" startIcon={<LockResetIcon />} onClick={handleResetEncryption}>
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
                                                key={entryIndex}
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

            <Snackbar open={justConverted} autoHideDuration={4000} onClose={() => setJustConverted(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setJustConverted(false)} severity="success" variant="filled">
                    {translations.LANG_CONVERTED}
                </Alert>
            </Snackbar>
        </Box>
    )
}
