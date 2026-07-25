import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StringParser from '@/lib/lexie-encryption/StringParser'

export default function PasswordEntryRow({ id, entry, encryption, translations, onDelete }) {
    const [revealed, setRevealed] = useState(false)
    const [copied, setCopied] = useState(false)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 'auto',
        position: 'relative',
    }

    function decrypt() {
        return new StringParser(encryption, '').decryptByteArray(entry.password.split(' '))
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(decrypt())
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
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
                <Typography
                    variant="body2"
                    sx={{ fontFamily: 'var(--font-mono)', mt: 0.5, letterSpacing: revealed ? 'normal' : '0.15em', wordBreak: 'break-all' }}
                >
                    {revealed ? decrypt() : '••••••••'}
                </Typography>
            </Box>
            <Tooltip title={revealed ? translations.LANG_HIDE : translations.LANG_REVEAL}>
                <IconButton onClick={() => setRevealed((value) => !value)} size="small">
                    {revealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
