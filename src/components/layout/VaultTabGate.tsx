import { useEffect, useState, type ReactNode } from 'react'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { claimVaultTab, switchToOpenVaultTab, type VaultTabState } from '@/lib/vaultTab'
import type { Translations } from '@/lib/languages'

// Shows the vault only in the one tab that holds it (lib/vaultTab.ts); other
// vault tabs wait with a "switch to it" button and open by themselves when
// that tab closes.
export default function VaultTabGate({ translations, children }: { translations: Translations; children: ReactNode }) {
    const [state, setState] = useState<VaultTabState>('pending')
    useEffect(() => claimVaultTab(setState), [])

    if (state === 'owner') return <>{children}</>
    if (state === 'pending') return null
    return (
        <Paper variant="outlined" sx={{ maxWidth: 420, mx: 'auto', mt: { xs: 3, sm: 6 }, p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={2}>
                <Typography variant="h6">{translations.LANG_VAULT_OPEN_ELSEWHERE}</Typography>
                <Typography variant="body2" color="text.secondary">{translations.LANG_VAULT_OPEN_ELSEWHERE_HELP}</Typography>
                <Button variant="contained" onClick={switchToOpenVaultTab}>{translations.LANG_SWITCH_TO_VAULT_TAB}</Button>
            </Stack>
        </Paper>
    )
}
