import '@mui/material/styles'

declare module '@mui/material/styles' {
    interface Palette {
        graphite: Palette['primary']
        rule: { hairline: string; strong: string; surface: string }
    }
    interface PaletteOptions {
        graphite?: PaletteOptions['primary']
        rule?: { hairline: string; strong: string; surface: string }
    }
    interface TypographyVariants {
        fontFamilyDisplay: string
        fontFamilyMono: string
    }
    interface TypographyVariantsOptions {
        fontFamilyDisplay?: string
        fontFamilyMono?: string
    }
    interface ThemeOptions {
        themeName?: string
    }
    interface Theme {
        themeName?: string
    }
}
