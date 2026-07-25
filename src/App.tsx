import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Theme from '@/lib/themes/ThemeArtLexie'
import ExtensionHeader from '@/components/layout/ExtensionHeader'
import PasswordManager from '@/components/password-manager/PasswordManager'
import { getTranslations, resolveLanguage } from '@/lib/languages'

export default function App() {
    const language = resolveLanguage()
    const translations = getTranslations(language)

    return (
        <ThemeProvider theme={Theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
                <ExtensionHeader translations={translations} />
                <PasswordManager translations={translations} />
            </Box>
        </ThemeProvider>
    )
}
