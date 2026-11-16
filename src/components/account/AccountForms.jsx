import { useEffect, useState } from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { ensureApiPermission, getRegisterYears, login, register, requestPasswordRecovery } from '@/lib/account'
import { translateMessage } from '@/lib/languages'

// www.lexie.xyz account forms inside the extension, as on www.lexie.xyz /
// art.lexie.xyz: Sign in, Create account, Recover password. Same backend
// (users/login, users/register, users/recover).

function TextButton({ onClick, children, color = 'primary' }) {
    return (
        <Link component="button" type="button" variant="body2" color={color} onClick={onClick} sx={{ textAlign: 'left' }}>
            {children}
        </Link>
    )
}

function serverFieldErrors(translations, data) {
    const fields = {}
    for (const [field, value] of Object.entries(data.fields || {})) {
        fields[field] = translateMessage(translations, typeof value === 'string' ? value : value?.message)
    }
    return fields
}

export function LoginForm({ translations, onDone, onCreateAccount, onRecover, notice, initialEmail = '' }) {
    const [email, setEmail] = useState(initialEmail)
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        if (!email.trim() || !password) return setError(translations.LANG_VALIDATION_REQUIRED_FIELD)
        if (!(await ensureApiPermission())) return setError(translations.LANG_API_PERMISSION_DENIED)
        setLoading(true)
        setError('')
        let data
        try {
            data = await login(email.trim(), password)
        } catch {
            // Storage read / write failed: don't leave the button spinning.
            data = { httpStatusCode: 0, message: 'LANG_ERROR_GENERIC' }
        } finally {
            setLoading(false)
        }
        if (data.httpStatusCode === 200) {
            setPassword('')
            onDone()
        } else {
            setError(translateMessage(translations, data.message))
        }
    }

    return (
        <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit} sx={{ pt: 2 }}>
            {notice && <Alert severity="success">{notice}</Alert>}
            <TextField label={translations.LANG_EMAIL} type="email" autoComplete="username" size="small" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField label={translations.LANG_ACCOUNT_PASSWORD} type="password" autoComplete="current-password" size="small" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
            {error && <Typography variant="body2" color="error" role="alert">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <LoginIcon />}>
                {translations.LANG_LOGIN}
            </Button>
            <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <TextButton onClick={onRecover} color="text.secondary">{translations.LANG_RECOVER_PASSWORD}</TextButton>
                <TextButton onClick={onCreateAccount}>{translations.LANG_NO_ACCOUNT}</TextButton>
            </Stack>
        </Stack>
    )
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// Same years as GET users/register/years, used until (or if) it answers.
function localRegisterYears() {
    const start = new Date().getFullYear() - 18
    return Array.from({ length: 101 }, (_, i) => start - i)
}

export function CreateAccountForm({ translations, onCreated, onLogin }) {
    const [years, setYears] = useState(localRegisterYears)
    const [form, setForm] = useState({
        usersFirstName: '', usersLastName: '', usersEmail: '', usersPassword: '', passwordConfirm: '',
        day: '', month: '', year: '', usersUsersSexID: '',
    })
    const [fieldErrors, setFieldErrors] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let active = true
        getRegisterYears().then((data) => {
            const list = (data.items || []).map((item) => Number(item.year)).filter(Number.isFinite)
            if (active && data.httpStatusCode === 200 && list.length) setYears(list)
        })
        return () => { active = false }
    }, [])

    const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        const nextErrors = {}
        for (const field of ['usersFirstName', 'usersLastName', 'usersEmail', 'usersPassword', 'usersUsersSexID']) {
            if (!String(form[field]).trim()) nextErrors[field] = translations.LANG_VALIDATION_REQUIRED_FIELD
        }
        if (!form.day || !form.month || !form.year) nextErrors.usersDateOfBirth = translations.LANG_VALIDATION_REQUIRED_FIELD
        if (form.usersPassword && form.usersPassword !== form.passwordConfirm) nextErrors.passwordConfirm = translations.LANG_PASSWORDS_DONT_MATCH
        setFieldErrors(nextErrors)
        if (Object.keys(nextErrors).length) return
        if (!(await ensureApiPermission())) return setError(translations.LANG_API_PERMISSION_DENIED)

        setLoading(true)
        const email = form.usersEmail.trim()
        const data = await register({
            usersFirstName: form.usersFirstName,
            usersLastName: form.usersLastName,
            usersEmail: email,
            usersPassword: form.usersPassword,
            usersDateOfBirth: `${form.year}-${String(form.month).padStart(2, '0')}-${String(form.day).padStart(2, '0')}`,
            usersUsersSexID: String(form.usersUsersSexID),
        })
        setLoading(false)
        if (data.httpStatusCode === 200) return onCreated(email)
        setFieldErrors(serverFieldErrors(translations, data))
        setError(translateMessage(translations, data.message))
    }

    const fieldProps = (field) => ({
        value: form[field],
        onChange: set(field),
        error: !!fieldErrors[field],
        helperText: fieldErrors[field],
        size: 'small',
        fullWidth: true,
    })

    const dateSelect = (field, label, options) => (
        <FormControl size="small" fullWidth error={!!fieldErrors.usersDateOfBirth}>
            <InputLabel>{label}</InputLabel>
            <Select value={form[field]} onChange={set(field)} label={label}>
                {options.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </Select>
        </FormControl>
    )

    return (
        <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit} sx={{ pt: 2 }}>
            <Stack direction="row" spacing={1}>
                <TextField label={translations.LANG_FIRST_NAME} autoComplete="given-name" {...fieldProps('usersFirstName')} />
                <TextField label={translations.LANG_LAST_NAME} autoComplete="family-name" {...fieldProps('usersLastName')} />
            </Stack>
            <TextField label={translations.LANG_EMAIL} type="email" autoComplete="email" {...fieldProps('usersEmail')} />
            <TextField
                label={translations.LANG_ACCOUNT_PASSWORD}
                type="password"
                autoComplete="new-password"
                {...fieldProps('usersPassword')}
                helperText={fieldErrors.usersPassword || translations.LANG_ACCOUNT_PASSWORD_HINT}
            />
            <TextField label={translations.LANG_CONFIRM_PASSWORD} type="password" autoComplete="new-password" {...fieldProps('passwordConfirm')} />
            <div>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{translations.LANG_DATE_OF_BIRTH}</Typography>
                <Stack direction="row" spacing={1}>
                    {dateSelect('day', translations.LANG_DATE_OF_BIRTH_DAY, DAYS)}
                    {dateSelect('month', translations.LANG_DATE_OF_BIRTH_MONTH, MONTHS)}
                    {dateSelect('year', translations.LANG_DATE_OF_BIRTH_YEAR, years)}
                </Stack>
                {fieldErrors.usersDateOfBirth && <FormHelperText error>{fieldErrors.usersDateOfBirth}</FormHelperText>}
            </div>
            <FormControl size="small" fullWidth error={!!fieldErrors.usersUsersSexID}>
                <InputLabel>{translations.LANG_SEX}</InputLabel>
                <Select value={form.usersUsersSexID} onChange={set('usersUsersSexID')} label={translations.LANG_SEX}>
                    <MenuItem value="1">{translations.LANG_MALE}</MenuItem>
                    <MenuItem value="2">{translations.LANG_FEMALE}</MenuItem>
                    <MenuItem value="3">{translations.LANG_OTHER}</MenuItem>
                </Select>
                {fieldErrors.usersUsersSexID && <FormHelperText>{fieldErrors.usersUsersSexID}</FormHelperText>}
            </FormControl>
            <Typography variant="body2" color="text.secondary">{translations.LANG_KEY_NOT_RECOVERABLE}</Typography>
            {error && <Typography variant="body2" color="error" role="alert">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}>
                {translations.LANG_CREATE_ACCOUNT}
            </Button>
            <TextButton onClick={onLogin}>{translations.LANG_HAVE_ACCOUNT}</TextButton>
        </Stack>
    )
}

export function RecoverPasswordForm({ translations, onLogin }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        if (!email.trim()) return setError(translations.LANG_VALIDATION_REQUIRED_FIELD)
        if (!(await ensureApiPermission())) return setError(translations.LANG_API_PERMISSION_DENIED)
        setError('')
        setLoading(true)
        const data = await requestPasswordRecovery(email.trim())
        setLoading(false)
        // The backend answers 200 for unknown emails too (site config
        // hideUnknownEmails), so which emails have accounts isn't
        // revealed; 404 is still read as sent, for a backend without it.
        if (data.httpStatusCode === 200 || data.httpStatusCode === 404) setSent(true)
        else setError(translateMessage(translations, data.message))
    }

    return (
        <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit} sx={{ pt: 2 }}>
            {sent ? (
                <Alert severity="success">{translations.LANG_RECOVER_EMAIL_SENT}</Alert>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary">{translations.LANG_RECOVER_PASSWORD_HELP}</Typography>
                    <TextField
                        label={translations.LANG_EMAIL}
                        type="email"
                        autoComplete="email"
                        size="small"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!error}
                        helperText={error}
                        fullWidth
                    />
                    <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}>
                        {translations.LANG_SEND_RECOVER_EMAIL}
                    </Button>
                </>
            )}
            <TextButton onClick={onLogin}>{translations.LANG_HAVE_ACCOUNT}</TextButton>
        </Stack>
    )
}
