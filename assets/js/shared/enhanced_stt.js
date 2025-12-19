/**
 * SIGAP Enhanced Speech-to-Text Module v2.0
 * Features:
 * - Improved accuracy with continuous recognition
 * - Emotion detection from voice patterns
 * - Audio event detection (crying, laughing, screaming)
 * - Indonesian language optimized
 * - Real-time audio analysis
 */

const EnhancedSTT = (function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        language: 'id-ID',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        
        // Audio analysis settings
        analysisInterval: 100, // ms
        emotionDetectionEnabled: true,
        audioEventDetectionEnabled: true,
        
        // Thresholds for audio event detection
        thresholds: {
            // Volume thresholds
            silenceLevel: 0.01,
            normalSpeech: 0.1,
            loudSpeech: 0.4,
            screamLevel: 0.7,
            
            // Frequency thresholds (Hz)
            cryingLowFreq: 250,
            cryingHighFreq: 500,
            laughingPattern: 200,
            
            // Duration thresholds (ms)
            minimumAudioEvent: 500,
            emotionAnalysisWindow: 2000
        },
        
        // Emotion keywords for text analysis (Indonesian)
        emotionKeywords: {
            sedih: ['sedih', 'nangis', 'menangis', 'terpuruk', 'hancur', 'sakit hati', 'patah hati', 'menderita', 'nelangsa', 'pilu', 'duka', 'lara'],
            marah: ['marah', 'kesal', 'benci', 'geram', 'murka', 'jengkel', 'emosi', 'berang', 'dongkol'],
            takut: ['takut', 'trauma', 'cemas', 'khawatir', 'panik', 'ngeri', 'horor', 'mengerikan', 'gemetar', 'merinding'],
            putusAsa: ['bunuh diri', 'mati', 'akhiri hidup', 'menyerah', 'capek hidup', 'lelah hidup', 'tidak kuat', 'gak kuat'],
            malu: ['malu', 'minder', 'rendah diri', 'hina', 'dipermalukan', 'direndahkan'],
            bingung: ['bingung', 'tidak tahu', 'gak ngerti', 'nggak paham', 'galau'],
            lega: ['lega', 'tenang', 'lebih baik', 'terima kasih', 'makasih'],
            berharap: ['berharap', 'semoga', 'harap', 'ingin', 'mau']
        }
    };

    // ============================================
    // STATE
    // ============================================
    let recognition = null;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let audioStream = null;
    
    let isRecording = false;
    let isSupported = false;
    
    // Audio analysis data
    let audioBuffer = [];
    let emotionBuffer = [];
    let analysisInterval = null;
    
    // Callbacks
    let callbacks = {
        onResult: null,
        onInterim: null,
        onError: null,
        onStart: null,
        onEnd: null,
        onEmotionDetected: null,
        onAudioEvent: null
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init(options = {}) {
        // Merge options with defaults
        Object.assign(CONFIG, options);
        
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[EnhancedSTT] Speech Recognition not supported');
            isSupported = false;
            return false;
        }
        
        isSupported = true;
        
        // Initialize Speech Recognition
        recognition = new SpeechRecognition();
        recognition.lang = CONFIG.language;
        recognition.continuous = CONFIG.continuous;
        recognition.interimResults = CONFIG.interimResults;
        recognition.maxAlternatives = CONFIG.maxAlternatives;
        
        setupRecognitionEvents();
        
        console.log('[EnhancedSTT] Initialized with Indonesian language support');
        return true;
    }

    // ============================================
    // SPEECH RECOGNITION EVENTS
    // ============================================
    function setupRecognitionEvents() {
        recognition.onstart = function() {
            isRecording = true;
            console.log('[EnhancedSTT] Recording started');
            
            if (callbacks.onStart) {
                callbacks.onStart();
            }
            
            // Start audio analysis if enabled
            if (CONFIG.audioEventDetectionEnabled) {
                startAudioAnalysis();
            }
        };
        
        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            let confidence = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                
                if (result.isFinal) {
                    finalTranscript += transcript;
                    confidence = result[0].confidence;
                    
                    // Analyze emotion from text
                    if (CONFIG.emotionDetectionEnabled) {
                        const emotion = analyzeTextEmotion(transcript);
                        if (emotion && callbacks.onEmotionDetected) {
                            callbacks.onEmotionDetected(emotion);
                        }
                    }
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Apply post-processing for better accuracy
            if (finalTranscript) {
                finalTranscript = postProcessTranscript(finalTranscript);
                
                if (callbacks.onResult) {
                    callbacks.onResult({
                        text: finalTranscript,
                        confidence: confidence,
                        alternatives: getAlternatives(event)
                    });
                }
            }
            
            if (interimTranscript && callbacks.onInterim) {
                callbacks.onInterim(interimTranscript);
            }
        };
        
        recognition.onerror = function(event) {
            console.error('[EnhancedSTT] Error:', event.error);
            
            if (callbacks.onError) {
                callbacks.onError({
                    code: event.error,
                    message: getErrorMessage(event.error)
                });
            }
            
            // Auto-restart on recoverable errors
            if (isRecording && ['network', 'aborted'].includes(event.error)) {
                setTimeout(() => {
                    if (isRecording) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('[EnhancedSTT] Could not auto-restart');
                        }
                    }
                }, 500);
            }
        };
        
        recognition.onend = function() {
            // Auto-restart if still recording (continuous mode)
            if (isRecording && CONFIG.continuous) {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('[EnhancedSTT] Session ended');
                    stopRecording();
                }
            } else {
                stopRecording();
            }
        };
        
        recognition.onspeechstart = function() {
            console.log('[EnhancedSTT] Speech detected');
        };
        
        recognition.onsoundend = function() {
            console.log('[EnhancedSTT] Sound ended');
        };
    }

    // ============================================
    // AUDIO ANALYSIS FOR EMOTION DETECTION
    // ============================================
    async function startAudioAnalysis() {
        try {
            // Request microphone with optimized settings
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            
            // Create audio context for analysis
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            
            microphone = audioContext.createMediaStreamSource(audioStream);
            microphone.connect(analyser);
            
            // Start analysis loop
            analysisInterval = setInterval(analyzeAudio, CONFIG.analysisInterval);
            
            console.log('[EnhancedSTT] Audio analysis started');
            
        } catch (error) {
            console.error('[EnhancedSTT] Failed to start audio analysis:', error);
        }
    }
    
    function stopAudioAnalysis() {
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
            audioContext = null;
        }
        
        analyser = null;
        microphone = null;
        audioBuffer = [];
        emotionBuffer = [];
        
        console.log('[EnhancedSTT] Audio analysis stopped');
    }
    
    function analyzeAudio() {
        if (!analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const frequencyData = new Float32Array(bufferLength);
        
        // Get time domain data (waveform)
        analyser.getByteTimeDomainData(dataArray);
        
        // Get frequency data
        analyser.getFloatFrequencyData(frequencyData);
        
        // Calculate volume (RMS)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
            const amplitude = (dataArray[i] - 128) / 128;
            sumSquares += amplitude * amplitude;
        }
        const volume = Math.sqrt(sumSquares / bufferLength);
        
        // Store in buffer for pattern analysis
        const timestamp = Date.now();
        audioBuffer.push({
            timestamp,
            volume,
            frequencies: frequencyData.slice(0, 256) // Keep first 256 bins
        });
        
        // Keep only last N seconds of data
        const windowSize = CONFIG.thresholds.emotionAnalysisWindow;
        audioBuffer = audioBuffer.filter(d => timestamp - d.timestamp < windowSize);
        
        // Analyze patterns for audio events
        const audioEvent = detectAudioEvent(audioBuffer, volume, frequencyData);
        
        if (audioEvent && callbacks.onAudioEvent) {
            callbacks.onAudioEvent(audioEvent);
        }
    }
    
    // ============================================
    // AUDIO EVENT DETECTION
    // ============================================
    function detectAudioEvent(buffer, currentVolume, frequencies) {
        if (buffer.length < 5) return null;
        
        const now = Date.now();
        const recentData = buffer.slice(-20); // Last ~2 seconds
        
        // Calculate average and variance
        const volumes = recentData.map(d => d.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const variance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
        
        // ===================
        // SCREAMING DETECTION
        // ===================
        if (currentVolume > CONFIG.thresholds.screamLevel) {
            // High volume sustained for minimum duration
            const highVolumeCount = recentData.filter(d => d.volume > CONFIG.thresholds.loudSpeech).length;
            if (highVolumeCount >= 5) {
                return {
                    type: 'scream',
                    confidence: Math.min(currentVolume / CONFIG.thresholds.screamLevel, 1),
                    message: '🔊 Terdeteksi suara keras/teriakan',
                    timestamp: now
                };
            }
        }
        
        // ===================
        // CRYING DETECTION
        // ===================
        // Crying pattern: irregular volume with specific frequency pattern
        // Look for: low frequency dominance, irregular patterns, pauses
        if (variance > 0.01 && avgVolume > CONFIG.thresholds.silenceLevel) {
            // Check frequency pattern for crying (typically 250-500 Hz)
            const lowFreqEnergy = calculateFrequencyBandEnergy(frequencies, 250, 500);
            const midFreqEnergy = calculateFrequencyBandEnergy(frequencies, 500, 2000);
            
            if (lowFreqEnergy > midFreqEnergy * 1.5) {
                // Check for intermittent pattern (characteristic of sobbing)
                const volumeChanges = countVolumeChanges(volumes);
                if (volumeChanges > 3) {
                    return {
                        type: 'crying',
                        confidence: Math.min((lowFreqEnergy / midFreqEnergy) * 0.5, 0.9),
                        message: '😢 Terdeteksi pola suara menangis',
                        timestamp: now
                    };
                }
            }
        }
        
        // ===================
        // LAUGHING DETECTION
        // ===================
        // Laughing pattern: rhythmic bursts, specific frequency pattern
        if (variance > 0.02) {
            const rhythmicPattern = detectRhythmicPattern(volumes);
            if (rhythmicPattern && avgVolume > CONFIG.thresholds.normalSpeech) {
                return {
                    type: 'laughing',
                    confidence: rhythmicPattern.confidence,
                    message: '😊 Terdeteksi pola suara tertawa',
                    timestamp: now
                };
            }
        }
        
        // ===================
        // DISTRESS DETECTION
        // ===================
        // Combined high volume + irregular pattern + text emotion
        if (emotionBuffer.length > 0) {
            const recentEmotions = emotionBuffer.slice(-3);
            const hasDistressEmotion = recentEmotions.some(e => 
                ['sedih', 'takut', 'putusAsa', 'marah'].includes(e.emotion)
            );
            
            if (hasDistressEmotion && avgVolume > CONFIG.thresholds.normalSpeech && variance > 0.02) {
                return {
                    type: 'distress',
                    confidence: 0.8,
                    message: '⚠️ Terdeteksi kondisi distress',
                    timestamp: now
                };
            }
        }
        
        return null;
    }
    
    function calculateFrequencyBandEnergy(frequencies, lowHz, highHz) {
        if (!frequencies || frequencies.length === 0) return 0;
        
        const sampleRate = audioContext?.sampleRate || 16000;
        const binSize = sampleRate / (frequencies.length * 2);
        
        const lowBin = Math.floor(lowHz / binSize);
        const highBin = Math.min(Math.floor(highHz / binSize), frequencies.length - 1);
        
        let energy = 0;
        for (let i = lowBin; i <= highBin; i++) {
            // Convert dB to linear scale
            energy += Math.pow(10, frequencies[i] / 20);
        }
        
        return energy / (highBin - lowBin + 1);
    }
    
    function countVolumeChanges(volumes) {
        if (volumes.length < 3) return 0;
        
        let changes = 0;
        let increasing = volumes[1] > volumes[0];
        
        for (let i = 2; i < volumes.length; i++) {
            const nowIncreasing = volumes[i] > volumes[i - 1];
            if (nowIncreasing !== increasing) {
                changes++;
                increasing = nowIncreasing;
            }
        }
        
        return changes;
    }
    
    function detectRhythmicPattern(volumes) {
        if (volumes.length < 8) return null;
        
        // Look for repeated peaks
        const peaks = [];
        for (let i = 1; i < volumes.length - 1; i++) {
            if (volumes[i] > volumes[i - 1] && volumes[i] > volumes[i + 1]) {
                peaks.push(i);
            }
        }
        
        if (peaks.length < 3) return null;
        
        // Check if peaks are roughly evenly spaced
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length;
        
        // Low variance means rhythmic pattern
        if (intervalVariance < avgInterval * 0.5) {
            return {
                confidence: 1 - (intervalVariance / avgInterval),
                interval: avgInterval * CONFIG.analysisInterval
            };
        }
        
        return null;
    }

    // ============================================
    // TEXT EMOTION ANALYSIS
    // ============================================
    function analyzeTextEmotion(text) {
        const lowerText = text.toLowerCase();
        const detectedEmotions = [];
        
        for (const [emotion, keywords] of Object.entries(CONFIG.emotionKeywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    detectedEmotions.push({
                        emotion: emotion,
                        keyword: keyword,
                        confidence: calculateKeywordConfidence(keyword, lowerText)
                    });
                }
            }
        }
        
        if (detectedEmotions.length === 0) return null;
        
        // Sort by confidence and return highest
        detectedEmotions.sort((a, b) => b.confidence - a.confidence);
        const primary = detectedEmotions[0];
        
        // Store in emotion buffer for cross-referencing with audio
        emotionBuffer.push({
            ...primary,
            text: text,
            timestamp: Date.now()
        });
        
        // Keep only recent emotions
        const windowSize = CONFIG.thresholds.emotionAnalysisWindow * 3;
        emotionBuffer = emotionBuffer.filter(e => Date.now() - e.timestamp < windowSize);
        
        return {
            primary: primary.emotion,
            confidence: primary.confidence,
            keyword: primary.keyword,
            all: detectedEmotions.map(d => d.emotion)
        };
    }
    
    function calculateKeywordConfidence(keyword, text) {
        // Base confidence
        let confidence = 0.7;
        
        // Boost for exact word match
        const wordBoundary = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordBoundary.test(text)) {
            confidence += 0.15;
        }
        
        // Boost for emphasis (exclamation marks, repetition)
        if (text.includes('!')) {
            confidence += 0.05;
        }
        
        // Boost for longer context
        if (text.length > 50) {
            confidence += 0.05;
        }
        
        return Math.min(confidence, 0.95);
    }

    // ============================================
    // TRANSCRIPT POST-PROCESSING
    // ============================================
    function postProcessTranscript(text) {
        let processed = text;
        
        // Capitalize first letter
        processed = processed.charAt(0).toUpperCase() + processed.slice(1);
        
        // Fix common Indonesian speech recognition errors
        const corrections = {
            'sya': 'saya',
            'sy': 'saya',
            'yg': 'yang',
            'dgn': 'dengan',
            'dg': 'dengan',
            'krn': 'karena',
            'tp': 'tapi',
            'utk': 'untuk',
            'tdk': 'tidak',
            'sdh': 'sudah',
            'blm': 'belum',
            'bgt': 'banget',
            'bkn': 'bukan',
            'gak': 'tidak',
            'ga ': 'tidak ',
            'gk': 'tidak',
            'gue': 'saya',
            'gw': 'saya',
            'lo ': 'kamu ',
            'lu ': 'kamu ',
            'klo': 'kalau',
            'kl ': 'kalau ',
            'sm ': 'sama ',
            'skrg': 'sekarang',
            'krj': 'kerja',
            'msh': 'masih',
            'dr ': 'dari ',
            'pd ': 'pada ',
            'jd ': 'jadi ',
            'bs ': 'bisa ',
            'org': 'orang',
            'lg ': 'lagi ',
            'aj ': 'aja ',
            'aja': 'saja',
            'doank': 'saja',
            'doang': 'saja'
        };
        
        for (const [wrong, correct] of Object.entries(corrections)) {
            const regex = new RegExp(wrong, 'gi');
            processed = processed.replace(regex, correct);
        }
        
        // Add punctuation at end if missing
        if (!/[.!?]$/.test(processed.trim())) {
            processed = processed.trim() + '.';
        }
        
        return processed;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function getAlternatives(event) {
        const alternatives = [];
        
        for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                for (let j = 1; j < result.length; j++) {
                    alternatives.push({
                        text: result[j].transcript,
                        confidence: result[j].confidence
                    });
                }
            }
        }
        
        return alternatives;
    }
    
    function getErrorMessage(errorCode) {
        const messages = {
            'no-speech': 'Tidak ada suara terdeteksi. Coba bicara lebih keras.',
            'aborted': 'Perekaman dibatalkan.',
            'audio-capture': 'Mikrofon tidak ditemukan atau tidak bisa diakses.',
            'network': 'Koneksi internet bermasalah. Coba lagi.',
            'not-allowed': 'Izin mikrofon ditolak. Aktifkan di pengaturan browser.',
            'service-not-allowed': 'Layanan pengenalan suara tidak diizinkan.',
            'bad-grammar': 'Terjadi kesalahan dalam grammar recognition.',
            'language-not-supported': 'Bahasa tidak didukung.'
        };
        
        return messages[errorCode] || `Terjadi kesalahan: ${errorCode}`;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    function startRecording() {
        if (!isSupported) {
            console.error('[EnhancedSTT] Not supported');
            return false;
        }
        
        if (isRecording) {
            console.log('[EnhancedSTT] Already recording');
            return true;
        }
        
        try {
            recognition.start();
            return true;
        } catch (error) {
            console.error('[EnhancedSTT] Failed to start:', error);
            return false;
        }
    }
    
    function stopRecording() {
        isRecording = false;
        
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                // Already stopped
            }
        }
        
        stopAudioAnalysis();
        
        if (callbacks.onEnd) {
            callbacks.onEnd();
        }
        
        console.log('[EnhancedSTT] Recording stopped');
    }
    
    function setCallbacks(newCallbacks) {
        Object.assign(callbacks, newCallbacks);
    }
    
    function getState() {
        return {
            isRecording,
            isSupported,
            emotionBuffer: emotionBuffer.slice(-5),
            config: CONFIG
        };
    }

    // ============================================
    // EXPOSE MODULE
    // ============================================
    return {
        init,
        start: startRecording,
        stop: stopRecording,
        setCallbacks,
        getState,
        isSupported: () => isSupported,
        isRecording: () => isRecording
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSTT;
}

// Expose globally
window.EnhancedSTT = EnhancedSTT;

console.log('✅ EnhancedSTT Module Loaded');
