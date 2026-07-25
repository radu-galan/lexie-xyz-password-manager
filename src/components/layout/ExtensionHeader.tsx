import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { Translations } from '@/lib/languages'

export default function ExtensionHeader({ translations }: { translations: Translations }) {
    return (
        <AppBar position="static" elevation={0} color="transparent" sx={{ borderBottom: '1px solid', borderColor: 'rule.hairline' }}>
            <Toolbar variant="dense">
                <Typography variant="h6" component="h1" sx={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {translations.LANG_PASSWORD_MANAGER}
                </Typography>
            </Toolbar>
        </AppBar>
    )
}
