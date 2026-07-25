import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import StringParser from '@/lib/lexie-encryption/StringParser'

export default function AddPasswordForm({ encryption, translations, onAdd, prefill }) {
    const [title, setTitle] = useState('')
    const [password, setPassword] = useState('')
    const [description, setDescription] = useState('')
    const [seenPrefillToken, setSeenPrefillToken] = useState(prefill?.token)

    if (prefill && prefill.token !== seenPrefillToken) {
        setSeenPrefillToken(prefill.token)
        setPassword(prefill.value)
    }

    function handleSubmit(event) {
        event.preventDefault()
        if (!title || !password) return
        const encryptedPassword = new StringParser(encryption, password).encryptString().join(' ')
        onAdd({ title, description, password: encryptedPassword })
        setTitle('')
        setPassword('')
        setDescription('')
    }

    return (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>{translations.LANG_ADD_PASSWORD}</Typography>
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={1.5}>
                    <TextField label={translations.LANG_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
                    <TextField label={translations.LANG_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} type="password" fullWidth required />
                    <TextField label={translations.LANG_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                        {translations.LANG_ADD}
                    </Button>
                </Stack>
            </Box>
        </Paper>
    )
}
