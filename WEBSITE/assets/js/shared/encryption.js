/**
 * ============================================================
 * SHARED ENCRYPTION MODULE - Web Crypto API Based
 * ============================================================
 * Reusable encryption class using native Web Crypto API
 * Used by: Chatbot Autofill, Admin Panel, Secure Reports
 * 
 * @version 1.0
 * @date 2025-12-14
 */

class SecureEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.saltLength = 16;
        this.iterations = 100000;
    }

    /**
     * Derive encryption key from password using PBKDF2
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            passwordKey,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt plaintext string
     */
    async encrypt(plaintext, password) {
        try {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const key = await this.deriveKey(password, salt);

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encoder.encode(plaintext)
            );

            const encryptedArray = new Uint8Array(encrypted);
            const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(encryptedArray, salt.length + iv.length);

            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Gagal mengenkripsi data');
        }
    }

    /**
     * Decrypt encrypted base64 string
     */
    async decrypt(encryptedBase64, password) {
        try {
            const combined = this.base64ToArrayBuffer(encryptedBase64);
            const salt = combined.slice(0, this.saltLength);
            const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
            const encrypted = combined.slice(this.saltLength + this.ivLength);

            const key = await this.deriveKey(password, salt);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Gagal mendekripsi data. Password mungkin salah.');
        }
    }

    /**
     * Convert ArrayBuffer to Base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Encrypt JavaScript object to Base64 string
     */
    async encryptObject(obj, password) {
        const json = JSON.stringify(obj);
        return await this.encrypt(json, password);
    }

    /**
     * Decrypt Base64 string to JavaScript object
     */
    async decryptObject(encryptedBase64, password) {
        const json = await this.decrypt(encryptedBase64, password);
        return JSON.parse(json);
    }

    /**
     * Generate a random ephemeral session key
     */
    generateSessionKey() {
        const array = crypto.getRandomValues(new Uint8Array(32));
        return this.arrayBufferToBase64(array);
    }
}

// Create singleton instance for global use
const sharedEncryption = new SecureEncryption();

// Export for module systems (ES6) or attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecureEncryption, sharedEncryption };
} else {
    window.SecureEncryption = SecureEncryption;
    window.sharedEncryption = sharedEncryption;
}
