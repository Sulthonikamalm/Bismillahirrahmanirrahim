/**
 * File Upload Handler Module
 * Uses Web Worker for non-blocking file processing
 * Implements queue system and progress tracking
 */

import { InputSanitizer } from './sanitizer.js';

export class FileUploadHandler {
    constructor(config = {}) {
        this.config = {
            maxFiles: 5,
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.mp4', '.mov'],
            enableCompression: true,
            compressionQuality: 0.85,
            ...config
        };
        
        this.uploadedFiles = [];
        this.processingQueue = [];
        this.worker = null;
        this.workerReady = false;
        this.pendingTasks = new Map();
        
        this.initWorker();
    }

    /**
     * Initialize Web Worker
     */
    initWorker() {
        try {
            this.worker = new Worker('../workers/fileProcessor.worker.js');
            
            this.worker.onmessage = (e) => this.handleWorkerMessage(e);
            this.worker.onerror = (e) => this.handleWorkerError(e);
            
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            this.workerReady = false;
        }
    }

    /**
     * Handle message from worker
     */
    handleWorkerMessage(e) {
        const { id, type, result, error } = e.data;
        
        if (type === 'ready') {
            this.workerReady = true;
            console.log('File processor worker ready');
            return;
        }
        
        const task = this.pendingTasks.get(id);
        
        if (!task) return;
        
        if (type === 'success') {
            task.resolve(result);
        } else if (type === 'error') {
            task.reject(new Error(error.message));
        }
        
        this.pendingTasks.delete(id);
    }

    /**
     * Handle worker error
     */
    handleWorkerError(error) {
        console.error('Worker error:', error);
        
        // Reject all pending tasks
        this.pendingTasks.forEach((task) => {
            task.reject(new Error('Worker error: ' + error.message));
        });
        
        this.pendingTasks.clear();
    }

    /**
     * Send task to worker
     */
    sendToWorker(action, file, config = {}) {
        return new Promise((resolve, reject) => {
            if (!this.workerReady) {
                reject(new Error('Worker not ready'));
                return;
            }
            
            const id = this.generateTaskId();
            
            this.pendingTasks.set(id, { resolve, reject });
            
            this.worker.postMessage({
                id,
                action,
                file,
                config
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingTasks.has(id)) {
                    this.pendingTasks.delete(id);
                    reject(new Error('Task timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Add files to upload queue
     * @param {FileList|File[]} files - Files to upload
     * @returns {Promise<Object>} - Upload results
     */
    async addFiles(files) {
        const fileArray = Array.from(files);
        const results = {
            success: [],
            failed: [],
            totalSize: 0
        };
        
        // Check total limit
        if (this.uploadedFiles.length + fileArray.length > this.config.maxFiles) {
            throw new Error(`Maksimal ${this.config.maxFiles} file`);
        }
        
        // Process files in parallel (with limit)
        const chunkSize = 3; // Process 3 files at a time
        for (let i = 0; i < fileArray.length; i += chunkSize) {
            const chunk = fileArray.slice(i, i + chunkSize);
            
            const promises = chunk.map(file => this.processFile(file));
            const chunkResults = await Promise.allSettled(promises);
            
            chunkResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.success.push(result.value);
                    results.totalSize += result.value.size;
                } else {
                    results.failed.push({
                        file: chunk[index].name,
                        error: result.reason.message
                    });
                }
            });
        }
        
        return results;
    }

    /**
     * Process single file
     */
    async processFile(file) {
        // Sanitize file
        const sanitizeResult = InputSanitizer.sanitizeFile(file, this.config);
        
        if (!sanitizeResult.valid) {
            throw new Error(sanitizeResult.error);
        }
        
        const sanitizedFile = sanitizeResult.sanitized;
        
        // Determine file type
        const isImage = sanitizedFile.type.startsWith('image/');
        const isVideo = sanitizedFile.type.startsWith('video/');
        
        let processedData;
        
        if (isImage) {
            // Compress image if enabled
            if (this.config.enableCompression) {
                processedData = await this.sendToWorker('compressImage', sanitizedFile, {
                    quality: this.config.compressionQuality,
                    maxWidth: 1920,
                    maxHeight: 1080
                });
            } else {
                processedData = await this.sendToWorker('processImage', sanitizedFile);
            }
        } else if (isVideo) {
            processedData = await this.sendToWorker('processVideo', sanitizedFile);
        } else {
            throw new Error('Unsupported file type');
        }
        
        // Add to uploaded files
        const fileData = {
            id: this.generateFileId(),
            file: sanitizedFile,
            name: sanitizedFile.name,
            size: sanitizedFile.size,
            type: sanitizedFile.type,
            ...processedData,
            uploadedAt: Date.now()
        };
        
        this.uploadedFiles.push(fileData);
        
        return fileData;
    }

    /**
     * Remove file by ID
     */
    removeFile(fileId) {
        const index = this.uploadedFiles.findIndex(f => f.id === fileId);
        
        if (index > -1) {
            const removed = this.uploadedFiles.splice(index, 1)[0];
            return removed;
        }
        
        return null;
    }

    /**
     * Get all uploaded files
     */
    getFiles() {
        return this.uploadedFiles;
    }

    /**
     * Clear all files
     */
    clearAll() {
        this.uploadedFiles = [];
    }

    /**
     * Get total file size
     */
    getTotalSize() {
        return this.uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Generate unique file ID
     */
    generateFileId() {
        return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Cleanup worker
     */
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.pendingTasks.clear();
        this.uploadedFiles = [];
    }
}
