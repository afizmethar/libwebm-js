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
 * Minimal WebM parser for worker environments
 * Implements basic EBML parsing to extract essential metadata
 */
class MinimalWebMParser {
    constructor(buffer) {
        this.buffer = buffer;
        this.pos = 0;
        this.metadata = {
            duration: 0,
            tracks: [],
            timecodeScale: 1000000 // Default WebM timecode scale (1ms)
        };
    }

    /**
     * Read EBML variable-length integer
     */
    readVint() {
        if (this.pos >= this.buffer.length) return null;

        const firstByte = this.buffer[this.pos];
        let length = 0;
        let mask = 0x80;

        // Find the length based on the first bit set
        for (let i = 0; i < 8; i++) {
            if (firstByte & mask) {
                length = i + 1;
                break;
            }
            mask >>= 1;
        }

        if (length === 0 || this.pos + length > this.buffer.length) return null;

        // Read the value
        let value = firstByte & (mask - 1);
        for (let i = 1; i < length; i++) {
            value = (value << 8) | this.buffer[this.pos + i];
        }

        this.pos += length;
        return { value, length };
    }

    /**
     * Read EBML Element ID (keeps the length marker bit)
     */
    readElementId() {
        if (this.pos >= this.buffer.length) return null;

        const firstByte = this.buffer[this.pos];
        let length = 0;
        let mask = 0x80;

        // Find the length based on the first bit set
        for (let i = 0; i < 8; i++) {
            if (firstByte & mask) {
                length = i + 1;
                break;
            }
            mask >>= 1;
        }

        if (length === 0 || this.pos + length > this.buffer.length) return null;

        // For Element IDs, keep the length marker bit as part of the ID
        let value = 0;
        for (let i = 0; i < length; i++) {
            value = (value << 8) | this.buffer[this.pos + i];
        }

        this.pos += length;
        return { value, length };
    }

    /**
     * Read EBML element (ID + size + data)
     */
    readElement() {
        const id = this.readElementId();  // Use readElementId for Element IDs
        if (!id) return null;

        const size = this.readVint();     // Use readVint for sizes (removes length marker)
        if (!size) return null;

        const dataStart = this.pos;
        const dataEnd = Math.min(this.pos + size.value, this.buffer.length);
        const data = this.buffer.slice(dataStart, dataEnd);

        this.pos = dataEnd;

        return {
            id: id.value,
            size: size.value,
            data: data
        };
    }

    /**
     * Parse basic WebM structure
     */
    parse() {
        // Validate EBML header
        if (!this.validateEBMLHeader()) {
            throw new Error('Invalid EBML header');
        }

        // Parse document structure
        // console.log(`🔍 Starting to parse WebM structure (${this.buffer.length} bytes)`);
        while (this.pos < this.buffer.length) {
            const element = this.readElement();
            if (!element) break;

            // console.log(`🔍 Root element: 0x${element.id.toString(16).padStart(8, '0')} (${element.size} bytes)`);

            // Segment element (0x18538067 or 0x08538067 - different EBML parsers may read this differently)
            if (element.id === 0x18538067 || element.id === 0x08538067) {
                // console.log('🔍 Found Segment, parsing...');
                this.parseSegment(element.data);
                break;
            }
        }

        return this.metadata;
    }

    /**
     * Validate EBML header
     */
    validateEBMLHeader() {
        // Check magic bytes
        const ebmlHeader = [0x1A, 0x45, 0xDF, 0xA3];
        for (let i = 0; i < 4; i++) {
            if (this.buffer[i] !== ebmlHeader[i]) {
                return false;
            }
        }

        // Look for WebM DocType
        const webmBytes = [0x77, 0x65, 0x62, 0x6D]; // "webm"
        for (let i = 0; i < Math.min(this.buffer.length - 4, 100); i++) {
            if (this.buffer[i] === webmBytes[0] &&
                this.buffer[i + 1] === webmBytes[1] &&
                this.buffer[i + 2] === webmBytes[2] &&
                this.buffer[i + 3] === webmBytes[3]) {
                return true;
            }
        }

        return false;
    }

    /**
     * Parse segment content
     */
    parseSegment(segmentData) {
        const parser = new MinimalWebMParser(segmentData);

        while (parser.pos < segmentData.length) {
            const element = parser.readElement();
            if (!element) break;

            // console.log(`🔍 Segment element: 0x${element.id.toString(16).padStart(8, '0')} (${element.size} bytes)`);

            switch (element.id) {
                case 0x1549A966: // SegmentInfo
                case 0x0549A966: // SegmentInfo (alternative parsing)
                    // console.log('🔍 Found SegmentInfo');
                    this.parseSegmentInfo(element.data);
                    break;
                case 0x1654AE6B: // Tracks
                case 0x0654AE6B: // Tracks (alternative parsing)
                    // console.log('🔍 Found Tracks');
                    this.parseTracks(element.data);
                    break;
            }
        }
    }    /**
     * Parse segment info for duration
     */
    parseSegmentInfo(infoData) {
        const parser = new MinimalWebMParser(infoData);

        while (parser.pos < infoData.length) {
            const element = parser.readElement();
            if (!element) break;

            switch (element.id) {
                case 0x2AD7B1: // TimecodeScale
                    this.metadata.timecodeScale = this.readUint(element.data);
                    break;
                case 0x4489: // Duration (float)
                    this.metadata.duration = this.readFloat(element.data);
                    break;
            }
        }
    }

    /**
     * Parse tracks for count and basic info
     */
    parseTracks(tracksData) {
        const parser = new MinimalWebMParser(tracksData);

        // console.log(`🔍 Parsing tracks data (${tracksData.length} bytes)`);

        while (parser.pos < tracksData.length) {
            const element = parser.readElement();
            if (!element) break;

            // console.log(`🔍 Tracks element: 0x${element.id.toString(16).padStart(8, '0')} (${element.size} bytes)`);

            if (element.id === 0xAE) { // TrackEntry
                // console.log('🔍 Found TrackEntry');
                const track = this.parseTrackEntry(element.data);
                if (track) {
                    // console.log(`🔍 Track parsed successfully: ${JSON.stringify(track)}`);
                    this.metadata.tracks.push(track);
                } else {
                    // console.log('🔍 Track parsing failed');
                }
            }
        }

        // console.log(`🔍 Total tracks found: ${this.metadata.tracks.length}`);
    }    /**
     * Parse individual track entry
     */
    parseTrackEntry(trackData) {
        const parser = new MinimalWebMParser(trackData);
        const track = {
            trackNumber: 0,
            trackType: WebMTrackType.UNKNOWN,
            codecId: 'unknown',
            name: ''
        };

        // console.log(`🔍 Parsing TrackEntry (${trackData.length} bytes)`);

        while (parser.pos < trackData.length) {
            const element = parser.readElement();
            if (!element) break;

            // console.log(`🔍 TrackEntry element: 0x${element.id.toString(16).padStart(8, '0')} (${element.size} bytes)`);

            switch (element.id) {
                case 0xD7: // TrackNumber
                    track.trackNumber = this.readUint(element.data);
                    // console.log(`🔍 Track number: ${track.trackNumber}`);
                    break;
                case 0x83: // TrackType
                    track.trackType = this.readUint(element.data);
                    // console.log(`🔍 Track type: ${track.trackType}`);
                    break;
                case 0x86: // CodecID
                    track.codecId = this.readString(element.data);
                    // console.log(`🔍 Codec ID: ${track.codecId}`);
                    break;
                case 0x536E: // Name
                    track.name = this.readString(element.data);
                    // console.log(`🔍 Track name: ${track.name}`);
                    break;
            }
        }

        // console.log(`🔍 Track parsed: ${JSON.stringify(track)}`);

        return track.trackNumber > 0 ? track : null;
    }

    /**
     * Read unsigned integer from data
     */
    readUint(data) {
        let value = 0;
        for (let i = 0; i < data.length; i++) {
            value = (value << 8) | data[i];
        }
        return value;
    }

    /**
     * Read float from data (IEEE 754)
     */
    readFloat(data) {
        if (data.length === 4) {
            // 32-bit float
            const view = new DataView(data.buffer, data.byteOffset, 4);
            return view.getFloat32(0, false); // Big endian
        } else if (data.length === 8) {
            // 64-bit double
            const view = new DataView(data.buffer, data.byteOffset, 8);
            return view.getFloat64(0, false); // Big endian
        }
        return 0;
    }

    /**
     * Read string from data
     */
    readString(data) {
        return new TextDecoder('utf-8').decode(data);
    }
}

/**
 * Enhanced validation function for WebM format
 */
function validateWebMBasic(buffer) {
    try {
        const parser = new MinimalWebMParser(buffer);
        const metadata = parser.parse();
        return {
            valid: true,
            metadata: metadata,
            duration: metadata.duration,
            trackCount: metadata.tracks.length,
            tracks: metadata.tracks
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Fallback WebM File class for worker environments
 */
class WebMFile {
    constructor() {
        this.isWorkerFallback = true;
        this.metadata = null;
    }

    /**
     * Parse WebM buffer with minimal parser
     */
    static async fromBuffer(buffer, module) {
        const file = new WebMFile();

        // Convert buffer to Uint8Array if needed
        const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

        // Parse with minimal parser
        const validation = validateWebMBasic(uint8Buffer);
        if (!validation.valid) {
            throw new Error(`Failed to parse WebM file: ${validation.error}`);
        }

        file.buffer = uint8Buffer;
        file.metadata = validation.metadata;
        return file;
    }

    /**
     * Create new WebM file for writing (not supported in worker fallback)
     */
    static forWriting(module) {
        throw new Error('WebM muxing is not supported in worker fallback mode. Use the full libwebm-js library in a Node.js environment.');
    }

    /**
     * Get duration in seconds (from parsed metadata)
     */
    getDuration() {
        if (!this.metadata) {
            console.warn('No metadata available - file not parsed');
            return 0;
        }

        // Convert from timecode units to seconds
        const durationInTimecodes = this.metadata.duration;
        const timecodeScale = this.metadata.timecodeScale || 1000000; // Default 1ms

        // Duration is in timecode scale units, convert to seconds
        return (durationInTimecodes * timecodeScale) / 1000000000; // Convert to seconds
    }

    /**
     * Get track count (from parsed metadata)
     */
    getTrackCount() {
        if (!this.metadata) {
            console.warn('No metadata available - file not parsed');
            return 0;
        }

        return this.metadata.tracks.length;
    }

    /**
     * Get track info (from parsed metadata)
     */
    getTrackInfo(trackIndex) {
        if (!this.metadata || !this.metadata.tracks || trackIndex >= this.metadata.tracks.length) {
            console.warn('Track info not available or invalid track index');
            return {
                trackNumber: 0,
                trackType: WebMTrackType.UNKNOWN,
                codecId: 'unknown',
                name: ''
            };
        }

        return this.metadata.tracks[trackIndex];
    }

    /**
     * Check if this file contains Opus audio
     */
    hasOpusAudio() {
        if (!this.metadata || !this.metadata.tracks) return false;

        return this.metadata.tracks.some(track =>
            track.trackType === WebMTrackType.AUDIO &&
            track.codecId === 'A_OPUS'
        );
    }

    /**
     * Get summary for validation purposes
     */
    getSummary() {
        if (!this.metadata) return null;

        const hasVideo = this.metadata.tracks.some(t => t.trackType === WebMTrackType.VIDEO);
        const hasAudio = this.metadata.tracks.some(t => t.trackType === WebMTrackType.AUDIO);

        return {
            duration: this.getDuration(),
            trackCount: this.getTrackCount(),
            hasVideo,
            hasAudio,
            tracks: this.metadata.tracks.map(track => ({
                type: track.trackType === WebMTrackType.VIDEO ? 'video' :
                    track.trackType === WebMTrackType.AUDIO ? 'audio' : 'unknown',
                codec: track.codecId
            }))
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
        console.log('LibWebM running in worker mode with minimal parser. Muxing features are not available.');

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

            // Indicate this is a worker implementation
            _isWorker: true,
            _isFallback: false, // We have real parsing now
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
