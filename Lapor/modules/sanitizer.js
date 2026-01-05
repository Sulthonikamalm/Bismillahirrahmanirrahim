/**
 * Input Sanitization Module
 * Protects against XSS, injection attacks, and malformed data
 * WCAG 2.1 compliant
 */

export class InputSanitizer {
    /**
     * Sanitize plain text input
     * @param {string} input - Raw text input
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} - Sanitized text
     */
    static sanitizeText(input, maxLength = 5000) {
        if (!input || typeof input !== 'string') return '';
        
        // Remove HTML tags
        let clean = input.replace(/<[^>]*>/g, '');
        
        // Remove potentially dangerous characters
        clean = clean.replace(/[<>"'`]/g, '');
        
        // Normalize whitespace
        clean = clean.replace(/\s+/g, ' ');
        
        // Limit length
        clean = clean.substring(0, maxLength);
        
        return clean.trim();
    }

    /**
     * Sanitize email address (RFC 5322 compliant)
     * @param {string} email - Email address
     * @returns {string} - Valid email or empty string
     */
    static sanitizeEmail(email) {
        if (!email || typeof email !== 'string') return '';
        
        // RFC 5322 simplified regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        const trimmed = email.trim().toLowerCase();
        
        if (!emailRegex.test(trimmed) || trimmed.length > 254) {
            return '';
        }
        
        return trimmed;
    }

    /**
     * Sanitize select/dropdown value
     * Only allows values that exist in the select options
     * @param {HTMLSelectElement} selectElement - The select element
     * @param {string} value - Value to validate
     * @returns {string} - Valid option value or empty string
     */
    static sanitizeSelectValue(selectElement, value) {
        if (!selectElement || !value) return '';
        
        const options = Array.from(selectElement.options).map(opt => opt.value);
        
        return options.includes(value) ? value : '';
    }

    /**
     * Sanitize phone number (Indonesian format)
     * @param {string} phone - Phone number
     * @returns {string} - Sanitized phone number
     */
    static sanitizePhone(phone) {
        if (!phone || typeof phone !== 'string') return '';
        
        // Remove all non-digits
        let clean = phone.replace(/\D/g, '');
        
        // Convert 62 prefix to 0
        if (clean.startsWith('62')) {
            clean = '0' + clean.substring(2);
        }
        
        // Must start with 0 and be 10-13 digits
        if (!clean.startsWith('0') || clean.length < 10 || clean.length > 13) {
            return '';
        }
        
        return clean;
    }

    /**
     * Sanitize date input (YYYY-MM-DD format)
     * @param {string} dateString - Date string
     * @returns {string} - Valid date or empty string
     */
    static sanitizeDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return '';
        
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!dateRegex.test(dateString)) {
            return '';
        }
        
        const date = new Date(dateString);
        
        // Check if valid date
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Check if not in future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date > today) {
            return '';
        }
        
        return dateString;
    }

    /**
     * Sanitize HTML to prevent XSS
     * Uses whitelist approach
     * @param {string} html - HTML string
     * @returns {string} - Safe HTML
     */
    static sanitizeHTML(html) {
        if (!html || typeof html !== 'string') return '';
        
        // Create temporary element
        const temp = document.createElement('div');
        temp.textContent = html;
        
        return temp.innerHTML;
    }

    /**
     * Escape special characters for safe display
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    static escapeHTML(str) {
        if (!str || typeof str !== 'string') return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return str.replace(/[&<>"'/]/g, char => map[char]);
    }

    /**
     * Validate and sanitize file
     * @param {File} file - File object
     * @param {Object} config - Validation config
     * @returns {Object} - { valid: boolean, error: string, sanitized: File }
     */
    static sanitizeFile(file, config = {}) {
        const defaults = {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.mp4', '.mov']
        };
        
        const cfg = { ...defaults, ...config };
        
        // Check if file exists
        if (!file || !(file instanceof File)) {
            return { valid: false, error: 'Invalid file object' };
        }
        
        // Check file size
        if (file.size > cfg.maxSize) {
            return { 
                valid: false, 
                error: `File terlalu besar. Maksimal ${cfg.maxSize / 1024 / 1024}MB` 
            };
        }
        
        // Check MIME type
        if (!cfg.allowedTypes.includes(file.type)) {
            return { 
                valid: false, 
                error: `Tipe file tidak didukung: ${file.type}` 
            };
        }
        
        // Check file extension
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!cfg.allowedExtensions.includes(ext)) {
            return { 
                valid: false, 
                error: `Ekstensi file tidak didukung: ${ext}` 
            };
        }
        
        // Sanitize filename (remove special characters)
        const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 255);
        
        // Create new File object with sanitized name
        const sanitizedFile = new File([file], sanitizedName, { type: file.type });
        
        return { 
            valid: true, 
            error: null, 
            sanitized: sanitizedFile 
        };
    }

    /**
     * Deep sanitize object (for autofill data)
     * @param {Object} obj - Object to sanitize
     * @returns {Object} - Sanitized object
     */
    static sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return {};
        
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Sanitize key
            const safeKey = this.sanitizeText(key, 100);
            
            if (!safeKey) continue;
            
            // Sanitize value based on type
            if (typeof value === 'string') {
                sanitized[safeKey] = this.sanitizeText(value);
            } else if (typeof value === 'number') {
                sanitized[safeKey] = value;
            } else if (typeof value === 'boolean') {
                sanitized[safeKey] = value;
            } else if (Array.isArray(value)) {
                sanitized[safeKey] = value.map(item => 
                    typeof item === 'string' ? this.sanitizeText(item) : item
                );
            } else if (typeof value === 'object') {
                sanitized[safeKey] = this.sanitizeObject(value);
            }
        }
        
        return sanitized;
    }
}
