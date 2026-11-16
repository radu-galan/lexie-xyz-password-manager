import { useMemo, useState } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { decryptText, encryptText, keyOpensText } from '@/lib/vault/keyCheck'

export default function PasswordEntryRow({ id, entry, encryption, translations, onDelete, onUpdate }) {
    const [revealed, setRevealed] = useState(false)
    const [copied, setCopied] = useState(false)
    const [editingPassword, setEditingPassword] = useState(false)
    const [passwordDraft, setPasswordDraft] = useState('')
    const [editingVerification, setEditingVerification] = useState(false)
    const [verificationDraft, setVerificationDraft] = useState('')
    // The verification text being edited doesn't open with this key ("Open
    // anyway" vault): an empty draft then keeps it instead of deleting it.
    const [verificationUnreadable, setVerificationUnreadable] = useState(false)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 'auto',
        position: 'relative',
    }

    function decrypt() {
        return decryptText(encryption, entry.password)
    }

    // Memoized: every row re-renders on each filter keystroke.
    const verificationText = useMemo(() => decryptText(encryption, entry.verificationText), [encryption, entry.verificationText])
    const revealedPassword = useMemo(() => (revealed ? decryptText(encryption, entry.password) : ''), [revealed, encryption, entry.password])

    async function handleCopy() {
        await navigator.clipboard.writeText(decrypt())
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    // Only a ciphertext this key opens is decrypted into a draft: in an "Open
    // anyway" vault its garbage must not become the draft that Save
    // re-encrypts over the only copy of the real password.
    function startEditingPassword() {
        setPasswordDraft(keyOpensText(encryption, entry.password) ? decrypt() : '')
        setRevealed(true)
        setEditingPassword(true)
    }

    function savePassword() {
        // Empty draft: leave the stored password as it is (an unreadable one
        // opens an empty editor, which must still be closable).
        if (!passwordDraft) {
            setEditingPassword(false)
            return
        }
        onUpdate({ ...entry, password: encryptText(encryption, passwordDraft) })
        setEditingPassword(false)
    }

    function startEditingVerification() {
        const readable = !entry.verificationText || keyOpensText(encryption, entry.verificationText)
        setVerificationDraft(entry.verificationText && readable ? verificationText : '')
        setVerificationUnreadable(!readable)
        setEditingVerification(true)
    }

    function saveVerification() {
        if (!verificationDraft && verificationUnreadable) {
            setEditingVerification(false)
            return
        }
        const next = { ...entry }
        if (verificationDraft) {
            next.verificationText = encryptText(encryption, verificationDraft)
        } else {
            delete next.verificationText
        }
        onUpdate(next)
        setEditingVerification(false)
    }

    return (
        <Paper ref={setNodeRef} style={style} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={translations.LANG_DRAG_TO_REORDER}>
                <IconButton
                    {...attributes}
                    {...listeners}
                    size="small"
                    sx={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="subtitle1" noWrap>{entry.title}</Typography>
                {entry.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>{entry.description}</Typography>
                )}
                {editingPassword ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                        <TextField
                            label={translations.LANG_PASSWORD}
                            value={passwordDraft}
                            onChange={(e) => setPasswordDraft(e.target.value)}
                            size="small"
                            fullWidth
                            autoFocus
                        />
                        <IconButton onClick={savePassword} size="small">
                            <CheckIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ) : (
                    <Typography
                        variant="body2"
                        sx={{ fontFamily: 'var(--font-mono)', mt: 0.5, letterSpacing: revealed ? 'normal' : '0.15em', wordBreak: 'break-all' }}
                    >
                        {revealed ? revealedPassword : '••••••••'}
                    </Typography>
                )}

                {editingVerification ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1 }}>
                        <TextField
                            label={translations.LANG_VERIFICATION_TEXT}
                            value={verificationDraft}
                            onChange={(e) => setVerificationDraft(e.target.value)}
                            size="small"
                            fullWidth
                            autoFocus
                        />
                        <IconButton onClick={saveVerification} size="small">
                            <CheckIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ) : (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {entry.verificationText
                                ? `${translations.LANG_VERIFICATION_TEXT}: ${verificationText}`
                                : translations.LANG_ADD_VERIFICATION_TEXT}
                        </Typography>
                        <IconButton onClick={startEditingVerification} size="small">
                            <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Stack>
                )}
            </Box>
            <Tooltip title={revealed ? translations.LANG_HIDE : translations.LANG_REVEAL}>
                <IconButton onClick={() => setRevealed((value) => !value)} size="small">
                    {revealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Tooltip title={translations.LANG_EDIT}>
                <IconButton onClick={startEditingPassword} size="small">
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title={copied ? translations.LANG_COPIED : translations.LANG_COPY}>
                <IconButton onClick={handleCopy} size="small">
                    <ContentCopyIcon fontSize="small" sx={{ color: copied ? 'success.main' : undefined }} />
                </IconButton>
            </Tooltip>
            <Tooltip title={translations.LANG_DELETE}>
                <IconButton onClick={onDelete} size="small">
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Paper>
    )
}
