/* Hallmark · macrostructure: n/a (app shell, not a marketing page) · genre: modern-minimal
 * theme: Cobalt (catalog) · paper: cool light oklch(98.5% 0.004 250) · accent: electric cobalt oklch(58% 0.20 256)
 * display: Space Grotesk 600 · body: Inter 400 · mono outlier: JetBrains Mono (ciphertext, key entry, labels)
 * axes: paper-band=light · display-style=grotesk-sans · accent-hue=cool-electric-blue (~256°)
 */
import { createTheme, responsiveFontSizes } from '@mui/material/styles'

// Palette — OKLCH values from the Cobalt spec, translated to sRGB hex for MUI's
// color utilities (alpha/lighten/darken can't parse oklch() strings).
const paper = '#F7F8FB'        // oklch(98.5% 0.004 250)
const paperSurface = '#FCFDFF' // slightly lifted surface for MuiPaper, still not pure #fff
const paper2 = '#EEF0F5'       // recessed surface (hover fills, code-card chrome)
const rule = '#E1E4EC'         // hairline border
const ruleStrong = '#CBD1DD'   // hairline border, higher-contrast contexts
const ink = '#1C2333'          // oklch(24% 0.02 258)
const inkBody = '#333B4F'      // oklch(34% 0.018 257)
const inkMuted = '#5B6478'
const accent = '#3E63DD'       // oklch(58% 0.20 256) electric cobalt — the one signal
const accentInk = '#FFFFFF'
const graphite = '#1B2130'     // oklch(22% 0.016 260) — the one dark band (code/ciphertext cards)
const graphiteInk = '#E7EAF3'
const danger = '#C6414F'
const success = '#1F9D6B'
const warning = '#B9791A'

const theme = createTheme({
    themeName: 'Lexie Themes',
    palette: {
        mode: 'light',
        primary: { main: accent, light: '#6C86E6', dark: '#2C46A8', contrastText: accentInk },
        secondary: { main: inkBody, light: inkMuted, dark: ink, contrastText: '#FFFFFF' },
        background: { default: paper, paper: paperSurface },
        text: { primary: ink, secondary: inkMuted },
        divider: rule,
        error: { main: danger },
        warning: { main: warning },
        success: { main: success },
        info: { main: accent },
        // Non-standard tokens, consumed directly via theme.palette.* in feature components.
        graphite: { main: graphite, contrastText: graphiteInk },
        rule: { hairline: rule, strong: ruleStrong, surface: paper2 },
    },
    shape: { borderRadius: 8 },
    spacing: 8,
    typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        fontFamilyDisplay: '"Space Grotesk", "Inter", sans-serif',
        fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
        h1: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '3.052rem', lineHeight: 1.1, letterSpacing: '-0.03em' },
        h2: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '2.441rem', lineHeight: 1.15, letterSpacing: '-0.03em' },
        h3: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '1.953rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
        h4: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '1.563rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
        h5: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
        h6: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.35, letterSpacing: '-0.01em' },
        subtitle1: { fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
        subtitle2: { fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
        body1: { fontFamily: '"Inter", sans-serif', fontWeight: 400, fontSize: '1rem', lineHeight: 1.6 },
        body2: { fontFamily: '"Inter", sans-serif', fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.6 },
        button: { fontFamily: '"Inter", sans-serif', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
        caption: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.04em' },
        overline: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 500, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase' },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: { backgroundColor: paper, color: ink },
                '::selection': { backgroundColor: '#C7D3F7' },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: paperSurface,
                    color: ink,
                    borderBottom: `1px solid ${rule}`,
                    boxShadow: 'none',
                    backdropFilter: 'blur(8px)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 6, boxShadow: 'none', paddingInline: '1.1em' },
                contained: {
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                },
                outlined: { borderColor: ruleStrong, '&:hover': { borderColor: accent, backgroundColor: 'rgba(62,99,221,0.06)' } },
            },
            defaultProps: { disableElevation: true },
        },
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
                outlined: { borderColor: rule },
                elevation1: { boxShadow: '0 1px 2px rgba(28,35,51,0.05)' },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: { borderRadius: 10, border: `1px solid ${rule}`, boxShadow: '0 1px 2px rgba(28,35,51,0.05)' },
            },
        },
        MuiTextField: { defaultProps: { size: 'small' } },
        MuiOutlinedInput: {
            styleOverrides: {
                root: { borderRadius: 6, backgroundColor: paperSurface },
                notchedOutline: { borderColor: rule },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                switchBase: { '&.Mui-checked': { color: accent }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: accent, opacity: 0.5 } },
            },
        },
        MuiChip: {
            styleOverrides: { root: { borderRadius: 6, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: '0.75rem' } },
        },
        MuiIconButton: {
            styleOverrides: { root: { borderRadius: 8 } },
        },
    },
})

export default responsiveFontSizes(theme)
