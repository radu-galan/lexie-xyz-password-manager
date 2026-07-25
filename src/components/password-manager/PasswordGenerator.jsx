import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
    generatePassword,
    DEFAULT_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
} from '@/lib/utils/passwordGenerator'

export default function PasswordGenerator({ translations, onUsePassword }) {
    const [length, setLength] = useState(DEFAULT_PASSWORD_LENGTH)
    const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_LENGTH))
    const [copied, setCopied] = useState(false)

    function handleLengthChange(event) {
        const value = parseInt(event.target.value, 10)
        if (Number.isNaN(value)) return
        const clamped = Math.min(Math.max(value, MIN_PASSWORD_LENGTH), MAX_PASSWORD_LENGTH)
        setLength(clamped)
        setPassword(generatePassword(clamped))
    }

    function regenerate() {
        setPassword(generatePassword(length))
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(password)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                {translations.LANG_SUGGESTED_PASSWORD}
            </Typography>
            <Stack spacing={1.5}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'rule.hairline',
                        backgroundColor: 'rule.surface',
                    }}
                >
                    <Typography sx={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        {password}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Tooltip title={translations.LANG_GENERATE_PASSWORD}>
                            <IconButton onClick={regenerate} size="small">
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={copied ? translations.LANG_COPIED : translations.LANG_COPY}>
                            <IconButton onClick={handleCopy} size="small">
                                <ContentCopyIcon fontSize="small" sx={{ color: copied ? 'success.main' : undefined }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <TextField
                        label={translations.LANG_PASSWORD_LENGTH}
                        type="number"
                        value={length}
                        onChange={handleLengthChange}
                        slotProps={{ htmlInput: { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH } }}
                        size="small"
                        sx={{ width: 140 }}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => onUsePassword(password)}
                        sx={{ flexShrink: 0 }}
                    >
                        {translations.LANG_USE_PASSWORD}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    )
}
