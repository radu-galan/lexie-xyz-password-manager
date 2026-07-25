const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}?'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

// Rejection sampling avoids modulo bias — a plain `random() % max` skews toward
// low values whenever 256 isn't a multiple of the charset size.
function randomIndex(max: number): number {
    const range = 256 - (256 % max)
    let byte: number
    do {
        byte = crypto.getRandomValues(new Uint8Array(1))[0]
    } while (byte >= range)
    return byte % max
}

function randomChar(charset: string): string {
    return charset[randomIndex(charset.length)]
}

function shuffle(chars: string[]): string[] {
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1)
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars
}

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 64
export const DEFAULT_PASSWORD_LENGTH = 16

// Guarantees at least one char from each category (when length allows), then fills
// the rest from the combined charset and shuffles — strong and unpredictable, not just long.
export function generatePassword(length: number): string {
    const len = Math.min(Math.max(Math.round(length) || DEFAULT_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH), MAX_PASSWORD_LENGTH)
    const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SYMBOLS)]
    const rest = Array.from({ length: len - required.length }, () => randomChar(ALL))
    return shuffle([...required, ...rest]).join('')
}
