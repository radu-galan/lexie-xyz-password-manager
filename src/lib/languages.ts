export type Translations = Record<string, string>

const languages: Record<string, Translations> = {
    ro: {
        LANG_PASSWORD_MANAGER: 'Manager de parole',

        LANG_SET_ENCRYPTION: 'Folosește criptarea',
        LANG_ENCRYPTION_BYTE: 'Cifrele tale cheie',
        LANG_ENCRYPTION_SUM: 'Sumă pentru criptare',
        LANG_ENCRYPTION_BYTE_ERROR: 'Alege între 1 și 8 cifre unice (1-9)',
        LANG_ENCRYPTION_BYTE_HINT: 'Doar cifre 1-9 (0 nu este folosit)',
        LANG_ENCRYPTION_SUM_ERROR: 'Introdu o sumă mai mare decât zero',
        LANG_ENCRYPTION_ONES: '1',
        LANG_ENCRYPTION_ZEROS: '0',
        LANG_RESET_ENCRYPTION: 'Resetează criptarea',
        LANG_LOCK: 'Blochează',
        LANG_CONVERT_ENCRYPTION: 'Convertește la o criptare nouă',
        LANG_CONVERT_ENCRYPTION_HELP:
            'Introdu o cheie nouă. Parolele existente vor fi decriptate cu cheia curentă și recriptate cu cheia nouă.',
        LANG_CONVERT_SUBMIT: 'Convertește',
        LANG_CONVERTED: 'Convertit la criptarea nouă',

        LANG_TITLE: 'Titlu',
        LANG_DESCRIPTION: 'Descriere',
        LANG_VERIFICATION_TEXT: 'Text de verificare',
        LANG_VERIFICATION_TEXT_HINT:
            'Opțional — scrie orice; va fi decriptat mai jos ca să confirmi că cheia ta funcționează',
        LANG_ADD_VERIFICATION_TEXT: 'Adaugă text de verificare',
        LANG_NEW: 'Nou',
        LANG_COPY: 'Copiază',
        LANG_COPIED: 'Copiat!',
        LANG_DOWNLOAD: 'Descarcă',
        LANG_LOAD_FILE: 'Încarcă fișier',
        LANG_FILTER_PASSWORDS: 'Filtrează parole',
        LANG_ADD: 'Adaugă',
        LANG_ADD_PASSWORD: 'Adaugă parolă',
        LANG_PASSWORD: 'Parolă',
        LANG_DELETE: 'Șterge',
        LANG_REVEAL: 'Arată',
        LANG_HIDE: 'Ascunde',
        LANG_NO_PASSWORDS: 'Nicio parolă salvată încă',
        LANG_DRAG_TO_REORDER: 'Trage pentru a reordona',

        LANG_SUGGESTED_PASSWORD: 'Parolă sugerată',
        LANG_PASSWORD_LENGTH: 'Lungime parolă',
        LANG_GENERATE_PASSWORD: 'Generează',
        LANG_USE_PASSWORD: 'Folosește',

        LANG_PERSISTENCE_NOTE:
            'Cheia ta rămâne salvată local în acest browser până apeși Blochează — spre deosebire de lexie.xyz, unde nimic nu este salvat.',
        LANG_PORTABILITY_NOTE:
            'Acest seif este separat de cel de pe lexie.xyz — nimic nu se sincronizează automat. Folosește Copiază/Descarcă/Încarcă pentru a muta parolele între ele.',
    },
    en: {
        LANG_PASSWORD_MANAGER: 'Password manager',

        LANG_SET_ENCRYPTION: 'Set encryption',
        LANG_ENCRYPTION_BYTE: 'Your key digits',
        LANG_ENCRYPTION_SUM: 'Encryption sum',
        LANG_ENCRYPTION_BYTE_ERROR: 'Pick 1 to 8 unique digits (1-9)',
        LANG_ENCRYPTION_BYTE_HINT: 'Digits 1-9 only (0 is not used)',
        LANG_ENCRYPTION_SUM_ERROR: 'Enter a sum greater than zero',
        LANG_ENCRYPTION_ONES: '1',
        LANG_ENCRYPTION_ZEROS: '0',
        LANG_RESET_ENCRYPTION: 'Reset encryption',
        LANG_LOCK: 'Lock',
        LANG_CONVERT_ENCRYPTION: 'Convert to new encryption',
        LANG_CONVERT_ENCRYPTION_HELP:
            'Enter a new key. Existing passwords will be decrypted with the current key and re-encrypted with the new one.',
        LANG_CONVERT_SUBMIT: 'Convert',
        LANG_CONVERTED: 'Converted to the new encryption',

        LANG_TITLE: 'Title',
        LANG_DESCRIPTION: 'Description',
        LANG_VERIFICATION_TEXT: 'Verification text',
        LANG_VERIFICATION_TEXT_HINT:
            "Optional — type anything; it'll be decrypted below so you can confirm your key works",
        LANG_ADD_VERIFICATION_TEXT: 'Add verification text',
        LANG_NEW: 'New',
        LANG_COPY: 'Copy',
        LANG_COPIED: 'Copied!',
        LANG_DOWNLOAD: 'Download',
        LANG_LOAD_FILE: 'Load file',
        LANG_FILTER_PASSWORDS: 'Filter passwords',
        LANG_ADD: 'Add',
        LANG_ADD_PASSWORD: 'Add password',
        LANG_PASSWORD: 'Password',
        LANG_DELETE: 'Delete',
        LANG_REVEAL: 'Reveal',
        LANG_HIDE: 'Hide',
        LANG_NO_PASSWORDS: 'No passwords saved yet',
        LANG_DRAG_TO_REORDER: 'Drag to reorder',

        LANG_SUGGESTED_PASSWORD: 'Suggested password',
        LANG_PASSWORD_LENGTH: 'Password length',
        LANG_GENERATE_PASSWORD: 'Generate',
        LANG_USE_PASSWORD: 'Use',

        LANG_PERSISTENCE_NOTE:
            "Your key stays saved locally in this browser until you click Lock — unlike lexie.xyz, where nothing is ever saved.",
        LANG_PORTABILITY_NOTE:
            "This vault is separate from the one on lexie.xyz — nothing syncs automatically. Use Copy/Download/Load file to move passwords between them.",
    },
}

export function getTranslations(language: string): Translations {
    return languages[language] || languages['en']
}

export function resolveLanguage(): string {
    return navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en'
}

export default languages
