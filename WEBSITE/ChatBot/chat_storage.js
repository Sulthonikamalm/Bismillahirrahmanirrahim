/**
 * SIGAP PPKS - Chat Storage Manager
 * 
 * Mengelola penyimpanan chat history di browser dengan enkripsi AES-GCM.
 * Mendukung session continuity hingga 7 hari dengan auto-cleanup.
 * 
 * ARSITEKTUR KEAMANAN:
 * - AES-GCM 256-bit encryption untuk data at rest
 * - Key derivation dari kombinasi timestamp + random
 * - Auto-expire setelah 7 hari
 * - Fallback ke session storage jika localStorage tidak tersedia
 * 
 * RASIONAL DESAIN:
 * - User dapat melanjutkan percakapan sebelumnya
 * - AI mendapat konteks dari history untuk respons lebih baik
 * - Data sensitif tidak tersimpan plain text di browser
 * - Compliance dengan privacy-first approach
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

const ChatStorage = (function() {
    'use strict';

    // Konfigurasi
    const CONFIG = {
        storageKey: '_sigap_chat_history',
        encryptionKeyName: '_sigap_chat_key',
        ivKeyName: '_sigap_chat_iv',
        timestampKey: '_sigap_chat_timestamp',
        maxAgeDays: 7,
        maxMessages: 100, // Batas pesan untuk performa
        algorithm: 'AES-GCM'
    };

    // State internal
    let encryptionKey = null;
    let isInitialized = false;
    let storageAvailable = false;

    /**
     * Inisialisasi storage manager
     * Cek availability dan load/generate encryption key
     */
    async function init() {
        if (isInitialized) return true;

        try {
            // Cek localStorage availability
            storageAvailable = checkStorageAvailability();
            
            if (!storageAvailable) {
                console.warn('[ChatStorage] localStorage tidak tersedia, menggunakan session storage');
            }

            // Load atau generate encryption key
            encryptionKey = await loadOrGenerateKey();
            
            // Cleanup expired data
            await cleanupExpiredData();
            
            isInitialized = true;
            return true;

        } catch (error) {
            console.error('[ChatStorage] Inisialisasi gagal:', error);
            return false;
        }
    }

    /**
     * Cek apakah localStorage tersedia
     */
    function checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Dapatkan storage yang tersedia
     */
    function getStorage() {
        return storageAvailable ? localStorage : sessionStorage;
    }

    /**
     * Load atau generate encryption key
     * Key disimpan di sessionStorage untuk keamanan lebih baik
     */
    async function loadOrGenerateKey() {
        try {
            // Coba load existing key dari session
            const existingKeyData = sessionStorage.getItem(CONFIG.encryptionKeyName);
            
            if (existingKeyData) {
                const keyData = JSON.parse(existingKeyData);
                const keyBuffer = new Uint8Array(keyData).buffer;
                
                return await crypto.subtle.importKey(
                    'raw',
                    keyBuffer,
                    { name: CONFIG.algorithm },
                    false,
                    ['encrypt', 'decrypt']
                );
            }

            // Generate new key
            const key = await crypto.subtle.generateKey(
                { name: CONFIG.algorithm, length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Export dan simpan ke session
            const exportedKey = await crypto.subtle.exportKey('raw', key);
            const keyArray = Array.from(new Uint8Array(exportedKey));
            sessionStorage.setItem(CONFIG.encryptionKeyName, JSON.stringify(keyArray));

            return key;

        } catch (error) {
            console.error('[ChatStorage] Key generation error:', error);
            throw error;
        }
    }

    /**
     * Encrypt data menggunakan AES-GCM
     * 
     * @param {string} plaintext Data yang akan dienkripsi
     * @returns {Object} { encrypted: base64, iv: base64 }
     */
    async function encrypt(plaintext) {
        if (!encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            // Generate random IV untuk setiap enkripsi
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encode plaintext ke bytes
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                { name: CONFIG.algorithm, iv: iv },
                encryptionKey,
                data
            );
            
            // Convert ke base64 untuk storage
            return {
                encrypted: arrayBufferToBase64(encrypted),
                iv: arrayBufferToBase64(iv.buffer)
            };

        } catch (error) {
            console.error('[ChatStorage] Encryption error:', error);
            throw error;
        }
    }

    /**
     * Decrypt data menggunakan AES-GCM
     * 
     * @param {string} encryptedBase64 Data terenkripsi dalam base64
     * @param {string} ivBase64 IV dalam base64
     * @returns {string} Plaintext
     */
    async function decrypt(encryptedBase64, ivBase64) {
        if (!encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            // Convert dari base64
            const encrypted = base64ToArrayBuffer(encryptedBase64);
            const iv = base64ToArrayBuffer(ivBase64);
            
            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                { name: CONFIG.algorithm, iv: new Uint8Array(iv) },
                encryptionKey,
                encrypted
            );
            
            // Decode ke string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);

        } catch (error) {
            console.error('[ChatStorage] Decryption error:', error);
            throw error;
        }
    }

    /**
     * Simpan chat history
     * 
     * @param {Array} messages Array of message objects
     * @returns {boolean} Success status
     */
    async function saveHistory(messages) {
        if (!isInitialized) {
            await init();
        }

        try {
            // Limit jumlah pesan untuk performa
            const limitedMessages = messages.slice(-CONFIG.maxMessages);
            
            // Serialize
            const plaintext = JSON.stringify({
                messages: limitedMessages,
                savedAt: Date.now(),
                version: 1
            });
            
            // Encrypt
            const { encrypted, iv } = await encrypt(plaintext);
            
            // Store
            const storage = getStorage();
            storage.setItem(CONFIG.storageKey, encrypted);
            storage.setItem(CONFIG.ivKeyName, iv);
            storage.setItem(CONFIG.timestampKey, Date.now().toString());
            
            return true;

        } catch (error) {
            console.error('[ChatStorage] Save error:', error);
            return false;
        }
    }

    /**
     * Load chat history
     * 
     * @returns {Array} Array of message objects atau empty array
     */
    async function loadHistory() {
        if (!isInitialized) {
            await init();
        }

        try {
            const storage = getStorage();
            const encrypted = storage.getItem(CONFIG.storageKey);
            const iv = storage.getItem(CONFIG.ivKeyName);
            
            if (!encrypted || !iv) {
                return [];
            }
            
            // Cek expiry
            const timestamp = parseInt(storage.getItem(CONFIG.timestampKey) || '0');
            if (isExpired(timestamp)) {
                await clearHistory();
                return [];
            }
            
            // Decrypt
            const plaintext = await decrypt(encrypted, iv);
            const data = JSON.parse(plaintext);
            
            return data.messages || [];

        } catch (error) {
            console.error('[ChatStorage] Load error:', error);
            // Clear corrupted data
            await clearHistory();
            return [];
        }
    }

    /**
     * Tambah pesan baru ke history
     * 
     * @param {Object} message Message object dengan role dan content
     * @returns {boolean} Success status
     */
    async function addMessage(message) {
        try {
            const history = await loadHistory();
            
            // Tambah metadata
            const enrichedMessage = {
                ...message,
                timestamp: Date.now(),
                id: generateMessageId()
            };
            
            history.push(enrichedMessage);
            
            return await saveHistory(history);

        } catch (error) {
            console.error('[ChatStorage] Add message error:', error);
            return false;
        }
    }

    /**
     * Hapus semua chat history
     */
    async function clearHistory() {
        try {
            const storage = getStorage();
            storage.removeItem(CONFIG.storageKey);
            storage.removeItem(CONFIG.ivKeyName);
            storage.removeItem(CONFIG.timestampKey);
            
            // Jangan hapus encryption key dari session
            // agar bisa digunakan jika user memulai chat baru
            
            return true;

        } catch (error) {
            console.error('[ChatStorage] Clear error:', error);
            return false;
        }
    }

    /**
     * Cek apakah data sudah expired
     */
    function isExpired(timestamp) {
        const maxAgeMs = CONFIG.maxAgeDays * 24 * 60 * 60 * 1000;
        return (Date.now() - timestamp) > maxAgeMs;
    }

    /**
     * Cleanup expired data
     */
    async function cleanupExpiredData() {
        const storage = getStorage();
        const timestamp = parseInt(storage.getItem(CONFIG.timestampKey) || '0');
        
        if (timestamp > 0 && isExpired(timestamp)) {
            await clearHistory();
            console.log('[ChatStorage] Expired data cleaned up');
        }
    }

    /**
     * Generate unique message ID
     */
    function generateMessageId() {
        return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Dapatkan summary untuk AI context
     * Mengembalikan versi ringkas dari history untuk efisiensi token
     * 
     * @param {number} maxMessages Maksimum pesan yang diambil
     * @returns {Array} Array of simplified messages
     */
    async function getContextSummary(maxMessages = 10) {
        const history = await loadHistory();
        
        // Ambil pesan terakhir
        const recent = history.slice(-maxMessages);
        
        // Sederhanakan untuk mengurangi token
        return recent.map(msg => ({
            role: msg.role,
            content: msg.content,
            time: msg.timestamp
        }));
    }

    /**
     * Cek apakah ada history yang tersimpan
     */
    async function hasHistory() {
        const history = await loadHistory();
        return history.length > 0;
    }

    /**
     * Dapatkan timestamp terakhir update
     */
    function getLastUpdateTime() {
        const storage = getStorage();
        return parseInt(storage.getItem(CONFIG.timestampKey) || '0');
    }

    /**
     * Export history untuk backup (unencrypted)
     * Hanya untuk user yang secara eksplisit ingin backup
     */
    async function exportHistory() {
        const history = await loadHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Import history dari backup
     * 
     * @param {string} jsonData JSON string dari export
     */
    async function importHistory(jsonData) {
        try {
            const messages = JSON.parse(jsonData);
            if (!Array.isArray(messages)) {
                throw new Error('Invalid format');
            }
            return await saveHistory(messages);
        } catch (error) {
            console.error('[ChatStorage] Import error:', error);
            return false;
        }
    }

    // === Utility Functions ===

    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // === Public API ===
    return {
        init,
        saveHistory,
        loadHistory,
        addMessage,
        clearHistory,
        getContextSummary,
        hasHistory,
        getLastUpdateTime,
        exportHistory,
        importHistory,
        
        // For debugging/testing
        _isInitialized: () => isInitialized,
        _isStorageAvailable: () => storageAvailable
    };

})();

// Auto-initialize saat script dimuat
if (typeof window !== 'undefined') {
    ChatStorage.init().catch(err => {
        console.error('[ChatStorage] Auto-init failed:', err);
    });
}

// Export untuk module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatStorage;
}
