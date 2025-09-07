// BSD 3-Clause License

// Copyright (c) 2025, SCTG Développement

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.

// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.

// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived from
//    this software without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * WebM Worker-compatible wrapper
 * This version is designed to work in Cloudflare Workers and other Web Worker environments
 * where Node.js APIs are not available
 */

/**
 * WebM Error Codes
 */
const WebMErrorCode = {
    SUCCESS: 0,
    INVALID_FILE: 1,
    CORRUPTED_DATA: 2,
    UNSUPPORTED_FORMAT: 3,
    IO_ERROR: 4,
    OUT_OF_MEMORY: 5,
    INVALID_ARGUMENT: 6
};

/**
 * WebM Track Types
 */
const WebMTrackType = {
    UNKNOWN: 0,
    VIDEO: 1,
    AUDIO: 2
};

/**
 * WebM Utilities
 */
const WebMUtils = {
    /**
     * Check if a video codec is supported
     */
    isVideoCodecSupported(codecId) {
        const supportedCodecs = ['V_VP8', 'V_VP9', 'V_AV01'];
        return supportedCodecs.includes(codecId);
    },

    /**
     * Check if an audio codec is supported
     */
    isAudioCodecSupported(codecId) {
        const supportedCodecs = ['A_OPUS', 'A_VORBIS'];
        return supportedCodecs.includes(codecId);
    },

    /**
     * Convert nanoseconds to milliseconds
     */
    nsToMs(ns) {
        return ns / 1000000;
    },

    /**
     * Convert milliseconds to nanoseconds
     */
    msToNs(ms) {
        return Math.round(ms * 1000000);
    },

    /**
     * Get list of supported video codecs
     */
    getSupportedVideoCodecs() {
        return ['V_VP8', 'V_VP9', 'V_AV01'];
    },

    /**
     * Get list of supported audio codecs
     */
    getSupportedAudioCodecs() {
        return ['A_OPUS', 'A_VORBIS'];
    }
};

/**
 * Minimal validation function for WebM format
 * This provides basic validation when full libwebm parsing is not available
 */
function validateWebMBasic(buffer) {
    if (!buffer || buffer.length < 32) {
        return { valid: false, error: 'Buffer too small' };
    }

    // Check for EBML header (0x1A, 0x45, 0xDF, 0xA3)
    const ebmlHeader = [0x1A, 0x45, 0xDF, 0xA3];
    for (let i = 0; i < 4; i++) {
        if (buffer[i] !== ebmlHeader[i]) {
            return { valid: false, error: 'Invalid EBML header' };
        }
    }

    // Look for WebM DocType
    const webmSignature = new TextEncoder().encode('webm');
    let found = false;
    for (let i = 0; i < Math.min(buffer.length - 4, 100); i++) {
        if (buffer[i] === webmSignature[0] &&
            buffer[i + 1] === webmSignature[1] &&
            buffer[i + 2] === webmSignature[2] &&
            buffer[i + 3] === webmSignature[3]) {
            found = true;
            break;
        }
    }

    if (!found) {
        return { valid: false, error: 'WebM DocType not found' };
    }

    return { valid: true };
}

/**
 * Fallback WebM File class for worker environments
 */
class WebMFile {
    constructor() {
        this.isWorkerFallback = true;
    }

    /**
     * Validate WebM buffer (basic validation only in worker mode)
     */
    static async fromBuffer(buffer, module) {
        const file = new WebMFile();

        // Convert buffer to Uint8Array if needed
        const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

        // Basic validation
        const validation = validateWebMBasic(uint8Buffer);
        if (!validation.valid) {
            throw new Error(`Failed to parse WebM file: ${validation.error}`);
        }

        file.buffer = uint8Buffer;
        return file;
    }

    /**
     * Create new WebM file for writing (not supported in worker fallback)
     */
    static forWriting(module) {
        throw new Error('WebM muxing is not supported in worker fallback mode. Use the full libwebm-js library in a Node.js environment.');
    }

    /**
     * Get duration (fallback - returns 0)
     */
    getDuration() {
        console.warn('getDuration() not available in worker fallback mode');
        return 0;
    }

    /**
     * Get track count (fallback - returns 0)
     */
    getTrackCount() {
        console.warn('getTrackCount() not available in worker fallback mode');
        return 0;
    }

    /**
     * Get track info (fallback - returns empty)
     */
    getTrackInfo(trackIndex) {
        console.warn('getTrackInfo() not available in worker fallback mode');
        return {
            trackNumber: 0,
            trackType: WebMTrackType.UNKNOWN,
            codecId: 'unknown',
            name: ''
        };
    }
}

/**
 * Main factory function for worker environments
 */
async function createLibWebM(options = {}) {
    // Detect environment
    const isCloudflareWorker = typeof globalThis !== "undefined" &&
        (globalThis.navigator?.userAgent?.includes?.('Cloudflare-Workers') ||
            typeof caches !== 'undefined');

    const isWebWorker = typeof WorkerGlobalScope !== "undefined" ||
        typeof importScripts === "function";

    if (isCloudflareWorker || isWebWorker) {
        console.warn('LibWebM running in fallback mode for worker environment. Full parsing features are limited.');

        return {
            WebMErrorCode,
            WebMTrackType,
            WebMUtils,
            WebMFile,

            // For compatibility
            WebMParser: {
                createFromBuffer: (buffer) => WebMFile.fromBuffer(buffer, null)
            },
            WebMMuxer: () => {
                throw new Error('WebM muxing not supported in worker environment');
            },

            // Indicate this is a fallback implementation
            _isFallback: true,
            _module: null
        };
    }

    // If not in worker environment, try to load the full implementation
    try {
        const { default: createFullLibWebM } = await import('./wrapper.js');
        return await createFullLibWebM(options);
    } catch (error) {
        console.warn('Failed to load full LibWebM implementation, using fallback:', error.message);

        return {
            WebMErrorCode,
            WebMTrackType,
            WebMUtils,
            WebMFile,

            WebMParser: {
                createFromBuffer: (buffer) => WebMFile.fromBuffer(buffer, null)
            },
            WebMMuxer: () => {
                throw new Error('WebM muxing not supported in fallback mode');
            },

            _isFallback: true,
            _module: null
        };
    }
}

export default createLibWebM;
