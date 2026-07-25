export default class LexieEncryption {
    zeros: number[]
    ones: number[]
    sum: number

    constructor(zeros: number[], ones: number[], sum: number | string) {
        this.zeros = zeros
        this.ones = ones
        this.sum = parseInt(String(sum))
    }

    isValidEncryption(): boolean {
        if (this.sum === undefined || Number.isNaN(this.sum)) {
            return false
        }
        if (this.zeros === undefined || this.ones === undefined) {
            return false
        }
        if (this.sum < 1) {
            return false
        }
        return this.zeros.length + this.ones.length === 9
    }

    encrypt(output: string): string {
        let sendOutput = ''
        for (const char of output) {
            if (char === ' ') {
                sendOutput += ' '
            } else if (char === '1') {
                sendOutput += this.ones[Math.floor(Math.random() * this.ones.length)]
            } else if (char === '0') {
                sendOutput += this.zeros[Math.floor(Math.random() * this.zeros.length)]
            }
        }
        const encryptedArray = sendOutput.split(' ').map((digit) => parseInt(digit) + this.sum)
        return encryptedArray.join(' ')
    }

    decrypt(output: string): string {
        let sendOutput = ''
        const value = parseInt(output) - this.sum
        const digits = String(value)
        for (let y = 0; y < digits.length; y++) {
            const digit = parseInt(digits[y])
            if (this.ones.indexOf(digit) > -1) {
                sendOutput += '1'
            } else if (this.zeros.indexOf(digit) > -1) {
                sendOutput += '0'
            }
        }
        return sendOutput
    }

    encryptObject(object: string[]): string[] {
        return object.map((item) => this.encrypt(item))
    }

    decryptObject(object: string[]): string[] {
        return object.map((item) => this.decrypt(item))
    }
}
