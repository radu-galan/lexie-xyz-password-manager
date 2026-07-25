import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
// type="text" + WebKit's text-security (not type="password") — password-manager browser
// extensions (1Password, Bitwarden, Chrome's built-in one) attach to type="password" fields
// and can intercept or clear keystrokes on fields that aren't a real login form.
function maskedInputProps(revealed) {
    return {
        inputMode: 'numeric',
        autoComplete: 'off',
        style: { fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', WebkitTextSecurity: revealed ? 'none' : 'disc' },
    }
}

export default function EncryptionKeyDialog({ translations, onSetEncryption, embedded = false, submitLabel }) {
    const [digits, setDigits] = useState('')
    const [appendToOnes, setAppendToOnes] = useState(true)
    const [sum, setSum] = useState('')
    const [digitsError, setDigitsError] = useState(false)
    const [sumError, setSumError] = useState(false)
    const [digitsRevealed, setDigitsRevealed] = useState(false)
    const [sumRevealed, setSumRevealed] = useState(false)

    function handleDigitsChange(event) {
        const unique = Array.from(new Set(event.target.value.split(''))).filter((c) => /[1-9]/.test(c))
        setDigits(unique.join('').slice(0, 8))
        setDigitsError(false)
    }

    function handleSumChange(event) {
        setSum(event.target.value.replace(/[^0-9]/g, '').slice(0, 8))
        setSumError(false)
    }

    const typed = digits.split('').map(Number)
    const complement = ALL_DIGITS.filter((d) => !typed.includes(d))
    const ones = appendToOnes ? typed : complement
    const zeros = appendToOnes ? complement : typed

    function handleSubmit(event) {
        event.preventDefault()
        const validDigits = typed.length >= 1 && typed.length <= 8
        const validSum = sum.length > 0 && parseInt(sum, 10) > 0

        if (!validDigits) setDigitsError(true)
        if (!validSum) setSumError(true)
        if (!validDigits || !validSum) return

        onSetEncryption({ ones, zeros, sum: parseInt(sum, 10) })
    }

    const content = (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
                <TextField
                    label={translations.LANG_ENCRYPTION_BYTE}
                    value={digits}
                    onChange={handleDigitsChange}
                    type="text"
                    name="lexie-encryption-key-digits"
                    error={digitsError}
                    helperText={digitsError ? translations.LANG_ENCRYPTION_BYTE_ERROR : translations.LANG_ENCRYPTION_BYTE_HINT}
                    slotProps={{
                        htmlInput: maskedInputProps(digitsRevealed),
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setDigitsRevealed((value) => !value)}
                                        edge="end"
                                        size="small"
                                        aria-label={digitsRevealed ? translations.LANG_HIDE : translations.LANG_REVEAL}
                                    >
                                        {digitsRevealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    fullWidth
                />

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Typography
                        sx={{ fontFamily: 'var(--font-mono)', fontWeight: appendToOnes ? 400 : 700, color: appendToOnes ? 'text.secondary' : 'primary.main' }}
                    >
                        {translations.LANG_ENCRYPTION_ZEROS}
                    </Typography>
                    <Switch checked={appendToOnes} onChange={(event) => setAppendToOnes(event.target.checked)} />
                    <Typography
                        sx={{ fontFamily: 'var(--font-mono)', fontWeight: appendToOnes ? 700 : 400, color: appendToOnes ? 'primary.main' : 'text.secondary' }}
                    >
                        {translations.LANG_ENCRYPTION_ONES}
                    </Typography>
                </Stack>

                <TextField
                    label={translations.LANG_ENCRYPTION_SUM}
                    value={sum}
                    onChange={handleSumChange}
                    type="text"
                    name="lexie-encryption-key-sum"
                    error={sumError}
                    helperText={sumError ? translations.LANG_ENCRYPTION_SUM_ERROR : ' '}
                    slotProps={{
                        htmlInput: maskedInputProps(sumRevealed),
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setSumRevealed((value) => !value)}
                                        edge="end"
                                        size="small"
                                        aria-label={sumRevealed ? translations.LANG_HIDE : translations.LANG_REVEAL}
                                    >
                                        {sumRevealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    fullWidth
                />

                <Button type="submit" variant="contained" size="large" fullWidth>
                    {submitLabel || translations.LANG_SET_ENCRYPTION}
                </Button>
            </Stack>
        </Box>
    )

    if (embedded) return content

    return (
        <Paper variant="outlined" sx={{ maxWidth: 420, width: '100%', mx: 'auto', mt: { xs: 3, sm: 6 }, p: { xs: 2.5, sm: 4 } }}>
            <Typography variant="h6" gutterBottom>{translations.LANG_SET_ENCRYPTION}</Typography>
            {content}
        </Paper>
    )
}
