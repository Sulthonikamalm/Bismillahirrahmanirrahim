/**
 * File Upload Worker
 * Processes file uploads in background thread to prevent UI blocking
 * Handles image compression, validation, and preview generation
 */

self.addEventListener('message', async (e) => {
    const { id, action, file, config } = e.data;
    
    try {
        let result;
        
        switch (action) {
            case 'processImage':
                result = await processImage(file);
                break;
                
            case 'processVideo':
                result = await processVideo(file);
                break;
                
            case 'validateFile':
                result = validateFile(file, config);
                break;
                
            case 'compressImage':
                result = await compressImage(file, config);
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        self.postMessage({
            id,
            type: 'success',
            result
        });
        
    } catch (error) {
        self.postMessage({
            id,
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});

/**
 * Process image file
 * Generates preview and extracts metadata
 */
async function processImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result,
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                    lastModified: file.lastModified
                });
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Process video file
 * Generates thumbnail and extracts metadata
 */
async function processVideo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // For video, we'll return basic info
            // Thumbnail generation would require video element which isn't available in worker
            resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: null, // No preview in worker
                lastModified: file.lastModified,
                isVideo: true
            });
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read video file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Validate file against config
 */
function validateFile(file, config = {}) {
    const defaults = {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.mp4', '.mov']
    };
    
    const cfg = { ...defaults, ...config };
    
    // Size check
    if (file.size > cfg.maxSize) {
        return {
            valid: false,
            error: `File terlalu besar. Maksimal ${cfg.maxSize / 1024 / 1024}MB`
        };
    }
    
    // MIME type check
    if (!cfg.allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Tipe file tidak didukung: ${file.type}`
        };
    }
    
    // Extension check
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!cfg.allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: `Ekstensi file tidak didukung: ${ext}`
        };
    }
    
    return { valid: true };
}

/**
 * Compress image file
 * Reduces file size while maintaining acceptable quality
 */
async function compressImage(file, config = {}) {
    const defaults = {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        outputType: 'image/jpeg'
    };
    
    const cfg = { ...defaults, ...config };
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > cfg.maxWidth) {
                    height = (height * cfg.maxWidth) / width;
                    width = cfg.maxWidth;
                }
                
                if (height > cfg.maxHeight) {
                    width = (width * cfg.maxHeight) / height;
                    height = cfg.maxHeight;
                }
                
                // Create canvas (OffscreenCanvas in worker)
                const canvas = new OffscreenCanvas(width, height);
                const ctx = canvas.getContext('2d');
                
                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.convertToBlob({
                    type: cfg.outputType,
                    quality: cfg.quality
                }).then(blob => {
                    // Read blob as data URL
                    const blobReader = new FileReader();
                    blobReader.onload = (e) => {
                        resolve({
                            name: file.name,
                            size: blob.size,
                            type: blob.type,
                            dataUrl: e.target.result,
                            originalSize: file.size,
                            compressionRatio: (blob.size / file.size * 100).toFixed(2) + '%',
                            width,
                            height
                        });
                    };
                    blobReader.readAsDataURL(blob);
                }).catch(reject);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image for compression'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file for compression'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Calculate file hash (SHA-256)
 * Useful for duplicate detection
 */
async function calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

// Report ready status
self.postMessage({ type: 'ready' });
