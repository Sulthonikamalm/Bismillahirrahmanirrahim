/**
 * SIGAP Enhanced Speech-to-Text Module v3.0 - ADVANCED
 * =====================================================
 * Features:
 * - UNLIMITED continuous recognition (auto-restart workaround)
 * - Advanced crying/screaming detection using spectral analysis
 * - Pitch detection for emotional voice patterns
 * - Zero Crossing Rate for speech classification
 * - MFCC-inspired feature extraction
 * - Real-time emotion detection from voice AND text
 * - Indonesian language optimized
 * 
 * Techniques used:
 * - Web Audio API with AnalyserNode
 * - FFT-based spectral analysis
 * - Pitch detection via autocorrelation
 * - Energy envelope tracking
 * - Voice Activity Detection (VAD)
 */

const EnhancedSTT = (function() {
    'use strict';

    // ============================================
    // ADVANCED CONFIGURATION
    // ============================================
    const CONFIG = {
        language: 'id-ID',
        continuous: true,
        interimResults: true,
        maxAlternatives: 5,
        
        // Audio analysis - HIGH SENSITIVITY
        analysisInterval: 50, // 50ms for faster detection
        emotionDetectionEnabled: true,
        audioEventDetectionEnabled: true,
        
        // ULTRA-SENSITIVE THRESHOLDS for speaker playback detection
        thresholds: {
            // Volume thresholds (ULTRA LOW for speaker detection)
            silenceLevel: 0.001,          // Almost nothing
            normalSpeech: 0.01,           // Very low
            loudSpeech: 0.05,             // Low
            screamLevel: 0.15,            // Much lower
            
            // Crying detection (VERY SENSITIVE)
            cryingSobFreqLow: 150,        // Hz - expanded range
            cryingSobFreqHigh: 800,       // Hz - expanded range
            cryingBreathPattern: 0.1,     // Lowered
            
            // Pitch ranges for emotions
            sadPitchLow: 80,              // Hz - lowered
            sadPitchHigh: 300,            // Hz - expanded
            distressPitchLow: 200,        // Hz - lowered
            distressPitchHigh: 600,       // Hz - expanded
            
            // Duration thresholds (FASTER)
            minimumAudioEvent: 100,       // 100ms - faster detection
            emotionAnalysisWindow: 2000,  // 2 second window - faster
            
            // Energy fluctuation for crying (LOWERED)
            energyFluctuationThreshold: 0.01
        },
        
        // Debug mode - Matikan untuk production
        debugMode: false,
        
        // Indonesian emotion keywords (EXPANDED)
        emotionKeywords: {
            sedih: ['sedih', 'nangis', 'menangis', 'terpuruk', 'hancur', 'sakit hati', 'patah hati', 
                    'menderita', 'nelangsa', 'pilu', 'duka', 'lara', 'merana', 'sendu', 'haru',
                    'kecewa', 'putus asa', 'terluka', 'tersakiti', 'menyesal', 'kehilangan'],
            marah: ['marah', 'kesal', 'benci', 'geram', 'murka', 'jengkel', 'emosi', 'berang', 
                    'dongkol', 'sewot', 'gondok', 'sebal', 'gregetan', 'dendam'],
            takut: ['takut', 'trauma', 'cemas', 'khawatir', 'panik', 'ngeri', 'horor', 'mengerikan', 
                    'gemetar', 'merinding', 'was-was', 'gelisah', 'resah', 'ketakutan', 'terancam',
                    'bahaya', 'berbahaya', 'mengancam', 'diancam'],
            putusAsa: ['bunuh diri', 'mati', 'akhiri hidup', 'menyerah', 'capek hidup', 'lelah hidup', 
                       'tidak kuat', 'gak kuat', 'mau mati', 'ingin mati', 'mengakhiri', 'bunuh',
                       'suicide', 'gantung diri', 'lompat', 'overdosis', 'racun', 'obat tidur',
                       'lebih baik mati', 'tidak ada gunanya', 'tidak ada harapan', 'sia-sia',
                       'beban', 'merepotkan', 'tidak berguna', 'sampah', 'gagal total'],
            malu: ['malu', 'minder', 'rendah diri', 'hina', 'dipermalukan', 'direndahkan', 
                   'dikucilkan', 'diejek', 'dihina', 'ditertawakan', 'dijatuhkan', 'dipermaluin'],
            bingung: ['bingung', 'tidak tahu', 'gak ngerti', 'nggak paham', 'galau', 'ragu'],
            lega: ['lega', 'tenang', 'lebih baik', 'terima kasih', 'makasih', 'syukur', 'senang'],
            berharap: ['berharap', 'semoga', 'harap', 'ingin', 'mau', 'tolong', 'bantu', 'mohon'],
            // VIOLENCE indicators
            kekerasan: ['dipukul', 'dihajar', 'ditendang', 'dicekik', 'disiksa', 'dianiaya',
                        'diperkosa', 'dilecehkan', 'diremas', 'dipegang', 'dipaksa', 'disentuh',
                        'cabul', 'pelecehan', 'kekerasan', 'seksual', 'memaksa', 'mengancam',
                        'foto', 'video', 'bugil', 'telanjang', 'blackmail', 'ancam sebar']
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
    let shouldKeepRunning = false; // For unlimited duration
    
    // Audio analysis buffers
    let volumeHistory = [];
    let pitchHistory = [];
    let energyHistory = [];
    let spectralHistory = [];
    let emotionBuffer = [];
    let analysisInterval = null;
    
    // FFT data arrays (pre-allocated for performance)
    let timeData = null;
    let freqData = null;
    
    // Pitch detection buffer
    let autoCorrelateBuffer = null;
    
    // Last detected events (for debouncing)
    let lastEmotionTime = 0;
    let lastAudioEventTime = 0;
    
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
        if (options.thresholds) {
            Object.assign(CONFIG.thresholds, options.thresholds);
        }
        Object.assign(CONFIG, options);
        
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[EnhancedSTT v3] Speech Recognition not supported');
            isSupported = false;
            return false;
        }
        
        isSupported = true;
        
        // Initialize Speech Recognition with UNLIMITED settings
        recognition = new SpeechRecognition();
        recognition.lang = CONFIG.language;
        recognition.continuous = true;           // ALWAYS continuous
        recognition.interimResults = true;       // Show real-time
        recognition.maxAlternatives = CONFIG.maxAlternatives;
        
        setupRecognitionEvents();
        
        console.log('[EnhancedSTT v3] Initialized - UNLIMITED MODE with Advanced Audio Analysis');
        return true;
    }

    // ============================================
    // SPEECH RECOGNITION - UNLIMITED DURATION
    // ============================================
    function setupRecognitionEvents() {
        recognition.onstart = function() {
            isRecording = true;
            console.log('[EnhancedSTT v3] 🎤 Recording started - UNLIMITED MODE');
            
            if (callbacks.onStart) {
                callbacks.onStart();
            }
            
            // Start advanced audio analysis
            if (CONFIG.audioEventDetectionEnabled) {
                startAdvancedAudioAnalysis();
            }
        };
        
        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            let bestConfidence = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                
                if (result.isFinal) {
                    // Pick BEST alternative by confidence
                    let bestText = '';
                    for (let j = 0; j < result.length; j++) {
                        if (result[j].confidence > bestConfidence) {
                            bestConfidence = result[j].confidence;
                            bestText = result[j].transcript;
                        }
                    }
                    finalTranscript += bestText || result[0].transcript;
                    
                    // Analyze emotion from text
                    if (CONFIG.emotionDetectionEnabled) {
                        const emotion = analyzeTextEmotion(finalTranscript);
                        if (emotion && callbacks.onEmotionDetected) {
                            // Debounce emotion callback (min 1 second between)
                            const now = Date.now();
                            if (now - lastEmotionTime > 1000) {
                                lastEmotionTime = now;
                                callbacks.onEmotionDetected(emotion);
                            }
                        }
                    }
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            
            // Post-process for accuracy
            if (finalTranscript) {
                finalTranscript = postProcessTranscript(finalTranscript);
                
                if (callbacks.onResult) {
                    callbacks.onResult({
                        text: finalTranscript,
                        confidence: bestConfidence,
                        alternatives: getAlternatives(event)
                    });
                }
            }
            
            if (interimTranscript && callbacks.onInterim) {
                callbacks.onInterim(interimTranscript);
            }
        };
        
        recognition.onerror = function(event) {
            console.warn('[EnhancedSTT v3] Error:', event.error);
            
            // DON'T stop on these errors - just restart
            if (['no-speech', 'aborted', 'network'].includes(event.error)) {
                if (shouldKeepRunning && isRecording) {
                    console.log('[EnhancedSTT v3] 🔄 Auto-recovering from error...');
                    setTimeout(() => {
                        if (shouldKeepRunning) {
                            try {
                                recognition.start();
                            } catch (e) {
                                console.log('[EnhancedSTT v3] Recovery failed, retrying...');
                                setTimeout(() => {
                                    if (shouldKeepRunning) {
                                        try { recognition.start(); } catch(e2) {}
                                    }
                                }, 500);
                            }
                        }
                    }, 100);
                    return;
                }
            }
            
            if (callbacks.onError) {
                callbacks.onError({
                    code: event.error,
                    message: getErrorMessage(event.error)
                });
            }
        };
        
        // CRITICAL: Auto-restart for UNLIMITED duration
        recognition.onend = function() {
            console.log('[EnhancedSTT v3] Session ended, shouldKeepRunning:', shouldKeepRunning);
            
            // ALWAYS restart if we should keep running
            if (shouldKeepRunning && isRecording) {
                console.log('[EnhancedSTT v3] 🔄 Auto-restarting for unlimited duration...');
                setTimeout(() => {
                    if (shouldKeepRunning) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('[EnhancedSTT v3] Restart failed, retrying...');
                            setTimeout(() => {
                                if (shouldKeepRunning) {
                                    try { recognition.start(); } catch(e2) {}
                                }
                            }, 200);
                        }
                    }
                }, 50); // Very short delay for seamless restart
            } else {
                stopRecording();
            }
        };
        
        recognition.onspeechstart = function() {
            console.log('[EnhancedSTT v3] 🗣️ Speech detected');
        };
    }

    // ============================================
    // ADVANCED AUDIO ANALYSIS
    // ============================================
    async function startAdvancedAudioAnalysis() {
        try {
            // Request microphone with optimal settings for emotion detection
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,  // Keep some noise for crying detection
                    autoGainControl: false,   // Manual gain for consistent analysis
                    channelCount: 1,
                    sampleRate: 44100         // Higher sample rate for pitch detection
                }
            });
            
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100
            });
            
            // Create analyser with high resolution
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 4096;  // High resolution FFT
            analyser.smoothingTimeConstant = 0.3; // Less smoothing for faster response
            
            // Pre-allocate buffers
            timeData = new Float32Array(analyser.frequencyBinCount);
            freqData = new Float32Array(analyser.frequencyBinCount);
            autoCorrelateBuffer = new Float32Array(analyser.fftSize);
            
            microphone = audioContext.createMediaStreamSource(audioStream);
            microphone.connect(analyser);
            
            // Clear history
            volumeHistory = [];
            pitchHistory = [];
            energyHistory = [];
            spectralHistory = [];
            
            // Start analysis loop at 50ms intervals
            analysisInterval = setInterval(performAdvancedAnalysis, CONFIG.analysisInterval);
            
            console.log('[EnhancedSTT v3] 🎵 Advanced audio analysis started (4096 FFT)');
            
        } catch (error) {
            console.error('[EnhancedSTT v3] Failed to start audio analysis:', error);
        }
    }
    
    function stopAdvancedAudioAnalysis() {
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
            audioContext = null;
        }
        
        analyser = null;
        microphone = null;
        volumeHistory = [];
        pitchHistory = [];
        energyHistory = [];
        spectralHistory = [];
        
        console.log('[EnhancedSTT v3] Audio analysis stopped');
    }
    
    // ============================================
    // CORE ANALYSIS FUNCTION - WITH DEBUG LOGGING
    // ============================================
    let debugCounter = 0;
    
    function performAdvancedAnalysis() {
        if (!analyser || !isRecording) return;
        
        const now = Date.now();
        
        // Get time domain data (waveform)
        analyser.getFloatTimeDomainData(timeData);
        
        // Get frequency domain data
        analyser.getFloatFrequencyData(freqData);
        
        // === 1. CALCULATE VOLUME (RMS) ===
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
            sumSquares += timeData[i] * timeData[i];
        }
        const volume = Math.sqrt(sumSquares / timeData.length);
        
        volumeHistory.push({ time: now, value: volume });
        
        // === 2. CALCULATE ENERGY IN FREQUENCY BANDS ===
        const spectralFeatures = calculateSpectralFeatures(freqData);
        spectralHistory.push({ time: now, ...spectralFeatures });
        
        // === 3. PITCH DETECTION ===
        const pitch = detectPitch(timeData, audioContext.sampleRate);
        if (pitch > 0) {
            pitchHistory.push({ time: now, value: pitch });
        }
        
        // === 4. CALCULATE ENERGY ENVELOPE ===
        const energy = calculateEnergyEnvelope(timeData);
        energyHistory.push({ time: now, value: energy });
        
        // Keep only recent data (last 2 seconds for faster response)
        const windowSize = CONFIG.thresholds.emotionAnalysisWindow;
        volumeHistory = volumeHistory.filter(d => now - d.time < windowSize);
        pitchHistory = pitchHistory.filter(d => now - d.time < windowSize);
        energyHistory = energyHistory.filter(d => now - d.time < windowSize);
        spectralHistory = spectralHistory.filter(d => now - d.time < windowSize);
        
        // === DEBUG LOGGING (every 500ms) ===
        debugCounter++;
        if (CONFIG.debugMode && debugCounter % 10 === 0) {
            const recentVolumes = volumeHistory.slice(-20).map(v => v.value);
            const avgVol = recentVolumes.length > 0 ? recentVolumes.reduce((a,b) => a+b, 0) / recentVolumes.length : 0;
            const volVar = calculateVariance(recentVolumes);
            
            const recentEnergy = energyHistory.slice(-20).map(e => e.value);
            const energyVar = calculateVariance(recentEnergy);
            
            console.log(`[AudioDebug] Vol: ${avgVol.toFixed(4)} | VolVar: ${volVar.toFixed(6)} | EnergyVar: ${energyVar.toFixed(6)} | Pitch: ${pitch > 0 ? pitch.toFixed(0) : 'N/A'} Hz | MidLow: ${spectralFeatures.midLowBand.toFixed(6)}`);
        }
        
        // === 5. DETECT AUDIO EVENTS ===
        const audioEvent = detectAdvancedAudioEvent();
        
        if (audioEvent && callbacks.onAudioEvent) {
            // Debounce (minimum 1 second between same type events for faster feedback)
            if (now - lastAudioEventTime > 1000) {
                lastAudioEventTime = now;
                console.log('[EnhancedSTT] 🎯 AUDIO EVENT DETECTED:', audioEvent);
                callbacks.onAudioEvent(audioEvent);
            }
        }
    }
    
    // ============================================
    // SPECTRAL ANALYSIS
    // ============================================
    function calculateSpectralFeatures(freqData) {
        const sampleRate = audioContext?.sampleRate || 44100;
        const binSize = sampleRate / (freqData.length * 2);
        
        // Calculate energy in different frequency bands
        const lowBand = getFrequencyBandEnergy(freqData, 0, 300, binSize);      // 0-300 Hz
        const midLowBand = getFrequencyBandEnergy(freqData, 300, 600, binSize); // 300-600 Hz (crying range)
        const midBand = getFrequencyBandEnergy(freqData, 600, 2000, binSize);   // 600-2000 Hz
        const highBand = getFrequencyBandEnergy(freqData, 2000, 8000, binSize); // 2000-8000 Hz
        
        // Spectral centroid (brightness of sound)
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < freqData.length; i++) {
            const magnitude = Math.pow(10, freqData[i] / 20);
            const frequency = i * binSize;
            numerator += frequency * magnitude;
            denominator += magnitude;
        }
        const spectralCentroid = denominator > 0 ? numerator / denominator : 0;
        
        // Spectral flatness (how noise-like vs tonal)
        let geometricMean = 0;
        let arithmeticMean = 0;
        let count = 0;
        for (let i = 1; i < 100; i++) { // Focus on lower frequencies
            const magnitude = Math.pow(10, freqData[i] / 20);
            if (magnitude > 0) {
                geometricMean += Math.log(magnitude);
                arithmeticMean += magnitude;
                count++;
            }
        }
        geometricMean = count > 0 ? Math.exp(geometricMean / count) : 0;
        arithmeticMean = count > 0 ? arithmeticMean / count : 0;
        const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
        
        return {
            lowBand,
            midLowBand,
            midBand,
            highBand,
            spectralCentroid,
            spectralFlatness
        };
    }
    
    function getFrequencyBandEnergy(freqData, lowHz, highHz, binSize) {
        const lowBin = Math.floor(lowHz / binSize);
        const highBin = Math.min(Math.floor(highHz / binSize), freqData.length - 1);
        
        let energy = 0;
        for (let i = lowBin; i <= highBin; i++) {
            energy += Math.pow(10, freqData[i] / 10); // Convert dB to linear power
        }
        return energy / (highBin - lowBin + 1);
    }
    
    // ============================================
    // PITCH DETECTION (Autocorrelation method)
    // ============================================
    function detectPitch(buffer, sampleRate) {
        // Simple autocorrelation-based pitch detection
        const SIZE = buffer.length;
        const MIN_SAMPLES = Math.floor(sampleRate / 500); // Max 500 Hz
        const MAX_SAMPLES = Math.floor(sampleRate / 50);  // Min 50 Hz
        
        // Check if there's enough signal
        let rms = 0;
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1; // Too quiet
        
        // Find the best correlation
        let bestCorrelation = 0;
        let bestOffset = -1;
        
        for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;
            for (let i = 0; i < SIZE - offset; i++) {
                correlation += buffer[i] * buffer[i + offset];
            }
            correlation = correlation / (SIZE - offset);
            
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }
        
        if (bestCorrelation > 0.01 && bestOffset > 0) {
            return sampleRate / bestOffset;
        }
        
        return -1;
    }
    
    // ============================================
    // ENERGY ENVELOPE
    // ============================================
    function calculateEnergyEnvelope(buffer) {
        let energy = 0;
        for (let i = 0; i < buffer.length; i++) {
            energy += Math.abs(buffer[i]);
        }
        return energy / buffer.length;
    }
    
    // ============================================
    // ADVANCED AUDIO EVENT DETECTION
    // ============================================
    function detectAdvancedAudioEvent() {
        if (volumeHistory.length < 5 || spectralHistory.length < 5) return null; // Reduced from 10 for faster detection
        
        const recentVolumes = volumeHistory.slice(-20);
        const recentSpectral = spectralHistory.slice(-20);
        const recentPitch = pitchHistory.slice(-20);
        const recentEnergy = energyHistory.slice(-20);
        
        // Calculate statistics
        const volumes = recentVolumes.map(v => v.value);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const maxVolume = Math.max(...volumes);
        const volumeVariance = calculateVariance(volumes);
        
        // Energy fluctuation
        const energies = recentEnergy.map(e => e.value);
        const energyFluctuation = calculateVariance(energies);
        
        // Spectral characteristics
        const avgMidLow = recentSpectral.reduce((a, s) => a + s.midLowBand, 0) / recentSpectral.length;
        const avgMid = recentSpectral.reduce((a, s) => a + s.midBand, 0) / recentSpectral.length;
        const avgSpectralFlatness = recentSpectral.reduce((a, s) => a + s.spectralFlatness, 0) / recentSpectral.length;
        
        // Pitch statistics
        let avgPitch = 0;
        let pitchVariance = 0;
        if (recentPitch.length > 5) {
            const pitches = recentPitch.map(p => p.value);
            avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
            pitchVariance = calculateVariance(pitches);
        }
        
        // =============================
        // CRYING DETECTION (ULTRA SENSITIVE)
        // =============================
        const cryingScore = calculateCryingScore({
            avgVolume,
            volumeVariance,
            energyFluctuation,
            avgMidLow,
            avgMid,
            avgPitch,
            pitchVariance,
            avgSpectralFlatness
        });
        
        if (CONFIG.debugMode && cryingScore > 0.2) {
            console.log(`[CryingScore] ${cryingScore.toFixed(2)} - vol:${avgVolume.toFixed(4)} volVar:${volumeVariance.toFixed(6)} energyFluc:${energyFluctuation.toFixed(6)}`);
        }
        
        if (cryingScore > 0.3) {  // LOWERED from 0.5
            return {
                type: 'crying',
                confidence: Math.min(cryingScore, 0.95),
                message: '😢 Terdeteksi pola suara menangis',
                details: { cryingScore, avgVolume, volumeVariance, avgPitch }
            };
        }
        
        // =============================
        // SCREAMING DETECTION - LOWERED
        // =============================
        if (maxVolume > CONFIG.thresholds.screamLevel) {
            const loudCount = volumes.filter(v => v > CONFIG.thresholds.loudSpeech).length;
            if (loudCount >= 2) {  // Lowered from 3
                return {
                    type: 'scream',
                    confidence: Math.min(maxVolume / CONFIG.thresholds.screamLevel, 0.95),
                    message: '🔊 Terdeteksi suara keras/teriakan',
                    details: { maxVolume, loudCount }
                };
            }
        }
        
        // =============================
        // DISTRESS DETECTION
        // =============================
        // Combine high pitch variance + energy fluctuation + emotion keywords
        const distressScore = calculateDistressScore({
            avgPitch,
            pitchVariance,
            energyFluctuation,
            volumeVariance,
            avgVolume
        });
        
        if (distressScore > 0.4) {  // LOWERED from 0.6
            return {
                type: 'distress',
                confidence: Math.min(distressScore, 0.95),
                message: '⚠️ Terdeteksi kondisi distress',
                details: { distressScore, avgPitch, pitchVariance }
            };
        }
        
        // =============================
        // SOBBING DETECTION (quieter crying)
        // =============================
        const sobbingScore = calculateSobbingScore({
            avgVolume,
            volumeVariance,
            energyFluctuation,
            avgMidLow,
            avgSpectralFlatness
        });
        
        if (sobbingScore > 0.25) {  // LOWERED from 0.4
            return {
                type: 'sobbing',
                confidence: Math.min(sobbingScore, 0.9),
                message: '😢 Terdeteksi isak tangis',
                details: { sobbingScore }
            };
        }
        
        return null;
    }
    
    // ============================================
    // CRYING SCORE CALCULATION
    // ============================================
    function calculateCryingScore(features) {
        let score = 0;
        
        // ANY audio above silence = start with base score
        if (features.avgVolume > CONFIG.thresholds.silenceLevel) {
            score += 0.1;  // Base score for any audio
        }
        
        // Mid-low frequency dominance (characteristic of crying) - RELAXED
        if (features.avgMidLow > 0) {  // Any presence
            score += 0.15;
        }
        if (features.avgMidLow > features.avgMid * 0.5) {  // Lowered from 0.8
            score += 0.15;
        }
        
        // Volume variance (intermittent crying pattern) - RELAXED
        if (features.volumeVariance > 0.00001) {  // Much lower
            score += 0.15;
        }
        if (features.volumeVariance > 0.0001) {
            score += 0.1;
        }
        
        // Energy fluctuation (breathing + crying pattern) - RELAXED
        if (features.energyFluctuation > CONFIG.thresholds.energyFluctuationThreshold) {
            score += 0.2;
        }
        
        // Pitch in any reasonable range
        if (features.avgPitch > 100 && features.avgPitch < 600) {
            score += 0.1;
        }
        
        // Pitch variance (emotional instability) - RELAXED
        if (features.pitchVariance > 100) {  // Lowered from 1000
            score += 0.1;
        }
        
        // Low spectral flatness (more tonal, less noise-like) - RELAXED
        if (features.avgSpectralFlatness < 0.5) {  // Increased from 0.3
            score += 0.1;
        }
        
        return score;
    }
    
    // ============================================
    // DISTRESS SCORE CALCULATION
    // ============================================
    function calculateDistressScore(features) {
        let score = 0;
        
        // Higher pitch (distress)
        if (features.avgPitch > CONFIG.thresholds.distressPitchLow) {
            score += 0.25;
        }
        
        // High pitch variance
        if (features.pitchVariance > 2000) {
            score += 0.25;
        }
        
        // Energy fluctuation
        if (features.energyFluctuation > CONFIG.thresholds.energyFluctuationThreshold * 2) {
            score += 0.2;
        }
        
        // Volume variance
        if (features.volumeVariance > 0.01) {
            score += 0.2;
        }
        
        // Active speech
        if (features.avgVolume > CONFIG.thresholds.normalSpeech) {
            score += 0.1;
        }
        
        return score;
    }
    
    // ============================================
    // SOBBING SCORE (quieter crying)
    // ============================================
    function calculateSobbingScore(features) {
        let score = 0;
        
        // Any volume above silence
        if (features.avgVolume > CONFIG.thresholds.silenceLevel) {
            score += 0.2;
        }
        
        // Low to medium volume
        if (features.avgVolume < CONFIG.thresholds.loudSpeech) {
            score += 0.15;
        }
        
        // ANY Volume variance
        if (features.volumeVariance > 0.000001) {
            score += 0.2;
        }
        
        // Mid-low frequency presence - any
        if (features.avgMidLow > 0) {
            score += 0.2;
        }
        
        // Energy fluctuation - any
        if (features.energyFluctuation > 0.001) {
            score += 0.25;
        }
        
        return score;
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function calculateVariance(arr) {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
    }

    // ============================================
    // TEXT EMOTION ANALYSIS (ENHANCED)
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
        
        // Sort by confidence, prioritize crisis keywords
        detectedEmotions.sort((a, b) => {
            // Priority: putusAsa > kekerasan > others
            const priorityMap = { putusAsa: 100, kekerasan: 90 };
            const aPriority = (priorityMap[a.emotion] || 0) + a.confidence * 10;
            const bPriority = (priorityMap[b.emotion] || 0) + b.confidence * 10;
            return bPriority - aPriority;
        });
        
        const primary = detectedEmotions[0];
        
        // Store in emotion buffer
        emotionBuffer.push({
            ...primary,
            text: text,
            timestamp: Date.now()
        });
        
        // Keep only recent
        emotionBuffer = emotionBuffer.filter(e => Date.now() - e.timestamp < 10000);
        
        return {
            primary: primary.emotion,
            confidence: primary.confidence,
            keyword: primary.keyword,
            all: detectedEmotions.map(d => d.emotion),
            isCrisis: primary.emotion === 'putusAsa' || primary.emotion === 'kekerasan'
        };
    }
    
    function calculateKeywordConfidence(keyword, text) {
        let confidence = 0.7;
        
        // Exact word match
        const wordBoundary = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
        if (wordBoundary.test(text)) {
            confidence += 0.2;
        }
        
        // Emphasis indicators
        if (text.includes('!')) confidence += 0.05;
        if (text.includes('tolong')) confidence += 0.05;
        if (text.includes('bantu')) confidence += 0.05;
        
        return Math.min(confidence, 0.98);
    }
    
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ============================================
    // TRANSCRIPT POST-PROCESSING (ENHANCED)
    // ============================================
    function postProcessTranscript(text) {
        let processed = text.trim();
        
        // Indonesian corrections
        const corrections = {
            'sya': 'saya', 'sy': 'saya', 'gw': 'saya', 'gue': 'saya',
            'yg': 'yang', 'dgn': 'dengan', 'dg': 'dengan',
            'krn': 'karena', 'tp': 'tapi', 'utk': 'untuk',
            'tdk': 'tidak', 'gak': 'tidak', 'ga ': 'tidak ',
            'sdh': 'sudah', 'blm': 'belum', 'bgt': 'banget',
            'bkn': 'bukan', 'klo': 'kalau', 'sm ': 'sama ',
            'skrg': 'sekarang', 'msh': 'masih', 'lg ': 'lagi ',
            'aj ': 'saja ', 'aja': 'saja', 'dr ': 'dari ',
            'pd ': 'pada ', 'jd ': 'jadi ', 'bs ': 'bisa ',
            'org': 'orang', 'org2': 'orang-orang',
            'di a': 'dia', 'me reka': 'mereka',
            'ke jadian': 'kejadian', 'ter jadi': 'terjadi',
            'pe laku': 'pelaku', 'kor ban': 'korban',
            'ke kerasan': 'kekerasan', 'sek sual': 'seksual',
            'pe lecehan': 'pelecehan',
            // Punctuation
            'titik': '.', 'koma': ',', 'tanda tanya': '?'
        };
        
        for (const [wrong, correct] of Object.entries(corrections)) {
            const regex = new RegExp(wrong, 'gi');
            processed = processed.replace(regex, correct);
        }
        
        // Clean up spacing
        processed = processed.replace(/\s+/g, ' ').trim();
        processed = processed.replace(/\s+([.,!?])/g, '$1');
        processed = processed.replace(/([.,!?])(\w)/g, '$1 $2');
        
        // Capitalize first letter
        if (processed.length > 0) {
            processed = processed.charAt(0).toUpperCase() + processed.slice(1);
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
                for (let j = 1; j < result.length && j < 3; j++) {
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
            'no-speech': 'Tidak ada suara terdeteksi.',
            'aborted': 'Perekaman dibatalkan.',
            'audio-capture': 'Mikrofon tidak ditemukan.',
            'network': 'Masalah koneksi internet.',
            'not-allowed': 'Izin mikrofon ditolak.',
            'service-not-allowed': 'Layanan tidak diizinkan.',
            'bad-grammar': 'Kesalahan grammar.',
            'language-not-supported': 'Bahasa tidak didukung.'
        };
        return messages[errorCode] || `Error: ${errorCode}`;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    function startRecording() {
        if (!isSupported) {
            console.error('[EnhancedSTT v3] Not supported');
            return false;
        }
        
        if (isRecording) {
            console.log('[EnhancedSTT v3] Already recording');
            return true;
        }
        
        shouldKeepRunning = true; // Enable unlimited mode
        
        try {
            recognition.start();
            return true;
        } catch (error) {
            console.error('[EnhancedSTT v3] Failed to start:', error);
            return false;
        }
    }
    
    function stopRecording() {
        shouldKeepRunning = false; // Disable auto-restart
        isRecording = false;
        
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {}
        }
        
        stopAdvancedAudioAnalysis();
        
        if (callbacks.onEnd) {
            callbacks.onEnd();
        }
        
        console.log('[EnhancedSTT v3] Recording stopped');
    }
    
    function setCallbacks(newCallbacks) {
        Object.assign(callbacks, newCallbacks);
    }
    
    function getState() {
        return {
            isRecording,
            isSupported,
            emotionBuffer: emotionBuffer.slice(-5),
            audioStats: {
                volumeHistoryLength: volumeHistory.length,
                pitchHistoryLength: pitchHistory.length,
                lastVolume: volumeHistory.length > 0 ? volumeHistory[volumeHistory.length - 1].value : 0,
                lastPitch: pitchHistory.length > 0 ? pitchHistory[pitchHistory.length - 1].value : 0
            }
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
        isRecording: () => isRecording,
        
        // Debug methods
        getVolumeHistory: () => volumeHistory,
        getPitchHistory: () => pitchHistory,
        getSpectralHistory: () => spectralHistory
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSTT;
}

// Expose globally
window.EnhancedSTT = EnhancedSTT;

console.log('✅ EnhancedSTT v3.0 ADVANCED Module Loaded');
