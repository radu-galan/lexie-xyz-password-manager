import LexieEncryption from './LexieEncryption'

export default class Parser {
    lexieEncryption: LexieEncryption

    constructor(lexieEncryption: LexieEncryption) {
        this.lexieEncryption = lexieEncryption
        if (!this.lexieEncryption.isValidEncryption()) {
            throw new Error('Invalid encryption used')
        }
    }
}
