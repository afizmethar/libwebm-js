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

import Module from '../dist/libwebm.js';

/**
 * Detect the runtime environment
 */
const ENVIRONMENT_IS_WEB = typeof window === "object";
const ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope !== "undefined" || typeof importScripts === "function";
const ENVIRONMENT_IS_CLOUDFLARE_WORKER = typeof globalThis !== "undefined" &&
    globalThis.navigator?.userAgent?.includes?.('Cloudflare-Workers');
const ENVIRONMENT_IS_NODE = typeof process === "object" && process.versions?.node && process.type !== "renderer";

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
 * Utility functions for common operations
 */
const WebMUtils = {
    /**
     * Check if a codec is supported for video tracks
     */
    isVideoCodecSupported(codecId) {
        const supported = ['V_VP8', 'V_VP9', 'V_AV01'];
        return supported.includes(codecId);
    },

    /**
     * Check if a codec is supported for audio tracks
     */
    isAudioCodecSupported(codecId) {
        const supported = ['A_OPUS', 'A_VORBIS'];
        return supported.includes(codecId);
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
        return ms * 1000000;
    },

    /**
     * Get supported video codecs
     */
    getSupportedVideoCodecs() {
        return ['V_VP8', 'V_VP9', 'V_AV01'];
    },

    /**
     * Get supported audio codecs
     */
    getSupportedAudioCodecs() {
        return ['A_OPUS', 'A_VORBIS'];
    }
};

/**
 * WebM Parser wrapper
 */
class WebMParser {
    constructor(module, nativeParser) {
        this.module = module;
        this.nativeParser = nativeParser;
    }

    /**
     * Create parser from buffer
     */
    static createFromBuffer(module, buffer) {
        if (!buffer || buffer.length === 0) {
            throw new Error('Failed to parse: No buffer provided or buffer is empty');
        }

        // Convert buffer to Uint8Array if it's not already
        const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

        // Pass buffer directly to C++ (emscripten::val handles the conversion)
        const nativeParser = module.WebMParser.createFromBuffer(uint8Buffer);
        return new WebMParser(module, nativeParser);
    }

    /**
     * Parse the WebM file headers
     */
    parseHeaders() {
        try {
            this.nativeParser.parseHeaders();
        } catch (error) {
            throw new Error(`Failed to parse headers: ${error.message}`);
        }
    }

    /**
     * Get the duration of the WebM file
     */
    getDuration() {
        try {
            return this.nativeParser.getDuration();
        } catch (error) {
            throw new Error(`Failed to get duration: ${error.message}`);
        }
    }

    /**
     * Get the number of tracks in the WebM file
     */
    getTrackCount() {
        try {
            return this.nativeParser.getTrackCount();
        } catch (error) {
            throw new Error(`Failed to get track count: ${error.message}`);
        }
    }

    /**
     * Get information about a specific track
     */
    getTrackInfo(trackIndex) {
        const info = this.nativeParser.getTrackInfo(trackIndex);
        if (!info) {
            throw new Error(`Track ${trackIndex} not found`);
        }
        return {
            trackNumber: info.trackNumber,
            trackType: info.trackType,
            codecId: info.codecId,
            name: info.name
        };
    }

    /**
     * Get video information for a specific track
     */
    getVideoInfo(trackNumber) {
        const info = this.nativeParser.getVideoInfo(trackNumber);
        if (!info) {
            throw new Error(`Video track ${trackNumber} not found`);
        }
        return {
            width: info.width,
            height: info.height,
            frameRate: info.frameRate
        };
    }

    /**
     * Get audio information for a specific track
     */
    getAudioInfo(trackNumber) {
        const info = this.nativeParser.getAudioInfo(trackNumber);
        if (!info) {
            throw new Error(`Audio track ${trackNumber} not found`);
        }
        return {
            samplingFrequency: info.samplingFrequency,
            channels: info.channels,
            bitDepth: info.bitDepth
        };
    }

    /**
     * Read the next video frame from the WebM file
     */
    readNextVideoFrame(trackId) {
        const frame = this.nativeParser.readNextVideoFrame(trackId);
        if (!frame) {
            return null;
        }
        return {
            data: frame.getData(),
            timestampNs: frame.getTimestampNs(),
            isKeyframe: frame.getIsKeyframe()
        };
    }

    /**
     * Read the next audio frame from the WebM file
     */
    readNextAudioFrame(trackId) {
        const frame = this.nativeParser.readNextAudioFrame(trackId);
        if (!frame) {
            return null;
        }
        return {
            data: frame.getData(),
            timestampNs: frame.getTimestampNs(),
            isKeyframe: false
        };
    }
}

/**
 * WebM Muxer wrapper
 */
class WebMMuxer {
    constructor(module) {
        this.module = module;
        this.nativeMuxer = new module.WebMMuxer();
    }

    /**
     * Add a video track to the WebM file
     */
    addVideoTrack(width, height, codecId) {
        const trackId = this.nativeMuxer.addVideoTrack(width, height, codecId);
        if (trackId < 0) {
            throw new Error(`Failed to add video track: ${trackId}`);
        }
        return trackId;
    }

    /**
     * Add an audio track to the WebM file
     */
    addAudioTrack(samplingFrequency, channels, codecId) {
        const trackId = this.nativeMuxer.addAudioTrack(samplingFrequency, channels, codecId);
        if (trackId < 0) {
            throw new Error(`Failed to add audio track: ${trackId}`);
        }
        return trackId;
    }

    /**
     * Write a video frame to the WebM file
     */
    writeVideoFrame(trackId, frameData, timestampNs, isKeyframe) {
        try {
            // Pass Uint8Array directly to the native method
            this.nativeMuxer.writeVideoFrame(trackId, frameData, timestampNs, isKeyframe);
        } catch (error) {
            throw new Error(`Failed to write video frame: ${error.message || error}`);
        }
    }

    /**
     * Write an audio frame to the WebM file
     */
    writeAudioFrame(trackId, frameData, timestampNs) {
        try {
            // Pass Uint8Array directly to the native method
            this.nativeMuxer.writeAudioFrame(trackId, frameData, timestampNs);
        } catch (error) {
            throw new Error(`Failed to write audio frame: ${error.message || error}`);
        }
    }

    /**
     * Finalize the WebM file and get the data
     */
    finalize() {
        const data = this.nativeMuxer.finalize();
        if (!data) {
            throw new Error('Failed to finalize WebM data');
        }
        return new Uint8Array(data);
    }

    /**
     * Get the current WebM data (before finalization)
     */
    getData() {
        const data = this.nativeMuxer.getData();
        return new Uint8Array(data);
    }
}

/**
 * High-level WebM operations
 */
class WebMFile {
    constructor() {
        this.parser = null;
        this.muxer = null;
    }

    /**
     * Load WebM file from buffer
     */
    static async fromBuffer(buffer, module) {
        const file = new WebMFile();
        file.parser = WebMParser.createFromBuffer(module, buffer);
        file.parser.parseHeaders();
        return file;
    }

    /**
     * Create new WebM file for writing
     */
    static forWriting(module) {
        const file = new WebMFile();
        file.muxer = new WebMMuxer(module);
        return file;
    }

    /**
     * Get file duration
     */
    getDuration() {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getDuration();
    }

    /**
     * Get track count
     */
    getTrackCount() {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getTrackCount();
    }

    /**
     * Get track information
     */
    getTrackInfo(trackIndex) {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getTrackInfo(trackIndex);
    }

    /**
     * Add video track
     */
    addVideoTrack(width, height, codecId) {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.addVideoTrack(width, height, codecId);
    }

    /**
     * Add audio track
     */
    addAudioTrack(samplingFrequency, channels, codecId) {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.addAudioTrack(samplingFrequency, channels, codecId);
    }

    /**
     * Write video frame
     */
    writeVideoFrame(trackId, frameData, timestampNs, isKeyframe) {
        if (!this.muxer) throw new Error('No muxer available');
        this.muxer.writeVideoFrame(trackId, frameData, timestampNs, isKeyframe);
    }

    /**
     * Write audio frame
     */
    writeAudioFrame(trackId, frameData, timestampNs) {
        if (!this.muxer) throw new Error('No muxer available');
        this.muxer.writeAudioFrame(trackId, frameData, timestampNs);
    }

    /**
     * Finalize and get WebM data
     */
    finalize() {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.finalize();
    }
}

/**
 * Main factory function
 */
async function createLibWebM(options = {}) {
    try {
        // Configure module options based on environment
        const moduleOptions = { ...options };

        // For Cloudflare Workers, we need to prevent Node.js-specific operations
        if (ENVIRONMENT_IS_CLOUDFLARE_WORKER || ENVIRONMENT_IS_WORKER) {
            // Disable file system operations
            moduleOptions.noFSInit = true;
            moduleOptions.locateFile = (path) => {
                // Return the path as-is for WASM files in worker environments
                if (path.endsWith('.wasm')) {
                    return new URL(path, import.meta.url).href;
                }
                return path;
            };
        }

        const module = await Module(moduleOptions);

        return {
            WebMErrorCode,
            WebMTrackType,
            WebMUtils,
            WebMParser: {
                createFromBuffer: (buffer) => WebMParser.createFromBuffer(module, buffer)
            },
            WebMMuxer: (options) => new WebMMuxer(module),
            WebMFile,

            // Direct access to the native module if needed
            _module: module
        };
    } catch (error) {
        // Provide more detailed error information for debugging
        const errorDetails = {
            message: error.message,
            environment: {
                isWeb: ENVIRONMENT_IS_WEB,
                isWorker: ENVIRONMENT_IS_WORKER,
                isCloudflareWorker: ENVIRONMENT_IS_CLOUDFLARE_WORKER,
                isNode: ENVIRONMENT_IS_NODE
            },
            originalError: error
        };

        console.error('Failed to initialize LibWebM:', errorDetails);
        throw new Error(`LibWebM initialization failed: ${error.message}`);
    }
}

export default createLibWebM;
