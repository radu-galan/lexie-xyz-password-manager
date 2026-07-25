import Parser from './Parser'
import LexieEncryption from './LexieEncryption'

export default class StringParser extends Parser {
    string: string

    constructor(lexieEncryption: LexieEncryption, string: string) {
        super(lexieEncryption)
        this.string = string
    }

    toByteArray(str: string): Uint8Array {
        return new TextEncoder().encode(str)
    }

    encryptString(): string[] {
        const bytes = this.toByteArray(this.string)
        const bin = [...bytes].map((n) => n.toString(2).padStart(8, '0'))
        return this.lexieEncryption.encryptObject(bin)
    }

    decryptByteArray(byteArray: string[]): string {
        const bytes = this.lexieEncryption.decryptObject(byteArray)
        return bytes.map((item) => String.fromCharCode(parseInt(item, 2))).join('')
    }

    matchesRegexp(byteArray: string[], regexp: RegExp = /[A-Z0-9a-z\s]/g): RegExpMatchArray | false {
        const decrypted = this.decryptByteArray(byteArray).match(regexp)
        return decrypted && decrypted.length ? decrypted : false
    }

    encryptToBase64(byteArray: string[]): string {
        const data = JSON.stringify(byteArray)
        return btoa(data)
    }

    decryptFromBase64(data: string): string[] {
        const text = atob(data)
        return JSON.parse(text)
    }
}
