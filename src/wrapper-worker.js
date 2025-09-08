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
 * Enhanced WebM parser for worker environments with frame extraction support
 * Limited to 64MB files for memory constraints in worker environments
 */
class MinimalWebMParser {
    constructor(buffer) {
        // Check file size limit (64MB)
        const MAX_FILE_SIZE = 64 * 1024 * 1024; // 64MB
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error(`File size ${buffer.length} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (64MB) for worker environments`);
        }

        this.buffer = buffer;
        this.pos = 0;
        this.metadata = {
            duration: 0,
            tracks: [],
            timecodeScale: 1000000, // Default WebM timecode scale (1ms)
            clusters: [], // Store cluster information
            frames: [] // Store extracted frames
        };
        this.currentCluster = null;
        this.frameIndex = 0;
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
                case 0x1F43B675: // Cluster
                case 0x0F43B675: // Cluster (alternative parsing)
                    // console.log('🔍 Found Cluster');
                    this.parseCluster(element.data);
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
                    this.metadata.timecodeScale = parser.readUint(element.data);
                    break;
                case 0x4489: // Duration (float)
                    this.metadata.duration = parser.readFloat(element.data);
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
                const track = this.parseTrackEntry(element.data, parser);
                if (track) {
                    // console.log(`🔍 Track parsed successfully: ${JSON.stringify(track)}`);
                    this.metadata.tracks.push(track);
                } else {
                    // console.log('🔍 Track parsing failed');
                }
            }
        }

        // console.log(`🔍 Total tracks found: ${this.metadata.tracks.length}`);
    }

    /**
     * Parse individual track entry
     */
    parseTrackEntry(trackData, parser) {
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
                    track.trackNumber = parser.readUint(element.data);
                    break;
                case 0x83: // TrackNumber (alternative)
                    track.trackNumber = parser.readUint(element.data);
                    break;
                case 0x86: // CodecID
                    track.codecId = parser.readString(element.data);
                    break;
                case 0x536E: // Name
                    track.name = parser.readString(element.data);
                    break;
            }
        }

        // Determine track type based on codec
        if (track.codecId.startsWith('V_')) {
            track.trackType = WebMTrackType.VIDEO;
        } else if (track.codecId.startsWith('A_')) {
            track.trackType = WebMTrackType.AUDIO;
        }

        // console.log(`🔍 Track parsed: ${JSON.stringify(track)}`);

        return track.trackNumber > 0 ? track : null;
    }

    /**
     * Parse cluster content to extract frames
     */
    parseCluster(clusterData) {
        const parser = new MinimalWebMParser(clusterData);
        let clusterTimecode = 0;

        // console.log(`🔍 Parsing cluster data (${clusterData.length} bytes)`);

        while (parser.pos < clusterData.length) {
            const element = parser.readElement();
            if (!element) break;

            // console.log(`🔍 Cluster element: 0x${element.id.toString(16).padStart(8, '0')} (${element.size} bytes)`);

            switch (element.id) {
                case 0xE7: // Timecode
                    clusterTimecode = parser.readUint(element.data);
                    // console.log(`🔍 Cluster timecode: ${clusterTimecode}`);
                    break;
                case 0xA3: // SimpleBlock
                    this.parseSimpleBlock(element.data, clusterTimecode, parser);
                    break;
                case 0xA0: // BlockGroup
                    this.parseBlockGroup(element.data, clusterTimecode, parser);
                    break;
            }
        }
    }

    /**
     * Parse SimpleBlock element
     */
    parseSimpleBlock(blockData, clusterTimecode, parser) {
        if (blockData.length < 4) return;

        // Read track number (first byte, variable length)
        const trackNumber = blockData[0] & 0x7F; // Remove most significant bit
        let offset = 1;

        // Read timecode (signed 16-bit integer, relative to cluster timecode)
        const relativeTimecode = parser.readInt16(blockData, offset);
        offset += 2;

        // Read flags
        const flags = blockData[offset];
        offset += 1;

        const isKeyframe = (flags & 0x80) !== 0;
        const isInvisible = (flags & 0x08) !== 0;

        // Remaining data is the frame data
        const frameData = blockData.slice(offset);

        // Calculate absolute timecode in nanoseconds
        const absoluteTimecode = (clusterTimecode + relativeTimecode) * this.metadata.timecodeScale;

        // Store frame information
        const frame = {
            trackNumber: trackNumber,
            timestampNs: absoluteTimecode,
            data: frameData,
            isKeyframe: isKeyframe,
            isInvisible: isInvisible,
            frameType: 'video' // Assume video for now, could be determined from track info
        };

        this.metadata.frames.push(frame);
        // console.log(`🔍 Extracted frame: track ${trackNumber}, timecode ${absoluteTimecode}ns, size ${frameData.length} bytes`);
    }

    /**
     * Parse BlockGroup element (contains Block and optional BlockAdditions)
     */
    parseBlockGroup(blockGroupData, clusterTimecode, parser) {
        const blockParser = new MinimalWebMParser(blockGroupData);

        while (blockParser.pos < blockGroupData.length) {
            const element = blockParser.readElement();
            if (!element) break;

            if (element.id === 0xA1) { // Block
                this.parseBlock(element.data, clusterTimecode, parser);
            }
            // Other elements in BlockGroup (BlockAdditions, etc.) are ignored for now
        }
    }

    /**
     * Parse Block element (similar to SimpleBlock but without flags in first byte)
     */
    parseBlock(blockData, clusterTimecode, parser) {
        if (blockData.length < 3) return;

        // Read track number (variable length EBML integer)
        let offset = 0;
        const vint = parser.readVintFromBuffer(blockData, offset);
        if (!vint) return;
        const trackNumber = vint.value;
        offset += vint.length;

        // Read timecode (signed 16-bit integer, relative to cluster timecode)
        const relativeTimecode = parser.readInt16(blockData, offset);
        offset += 2;

        // Remaining data is the frame data
        const frameData = blockData.slice(offset);

        // Calculate absolute timecode in nanoseconds
        const absoluteTimecode = (clusterTimecode + relativeTimecode) * this.metadata.timecodeScale;

        // Store frame information (assume video and keyframe for Block elements)
        const frame = {
            trackNumber: trackNumber,
            timestampNs: absoluteTimecode,
            data: frameData,
            isKeyframe: true, // Block elements are typically keyframes
            isInvisible: false,
            frameType: 'video'
        };

        this.metadata.frames.push(frame);
        // console.log(`🔍 Extracted block frame: track ${trackNumber}, timecode ${absoluteTimecode}ns, size ${frameData.length} bytes`);
    }

    /**
     * Read EBML variable-length integer from buffer at specific offset
     */
    readVintFromBuffer(buffer, offset) {
        if (offset >= buffer.length) return null;

        const firstByte = buffer[offset];
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

        if (length === 0 || offset + length > buffer.length) return null;

        // Read the value
        let value = firstByte & (mask - 1);
        for (let i = 1; i < length; i++) {
            value = (value << 8) | buffer[offset + i];
        }

        return { value, length };
    }

    /**
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
     * Read signed integer from data (two's complement)
     */
    readInt(data) {
        const uintValue = this.readUint(data);
        const bitLength = data.length * 8;

        // Check if the most significant bit is set (negative number)
        if (uintValue & (1 << (bitLength - 1))) {
            // Convert from two's complement
            return uintValue - (1 << bitLength);
        }
        return uintValue;
    }

    /**
     * Read signed 16-bit integer from data
     */
    readInt16(data, offset = 0) {
        if (data.length < offset + 2) return 0;
        const view = new DataView(data.buffer, data.byteOffset + offset, 2);
        return view.getInt16(0, false); // Big endian
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

    /**
     * Get the number of frames in the file
     */
    getFrameCount() {
        return this.metadata.frames.length;
    }

    /**
     * Get frame at specific index
     */
    getFrame(index) {
        if (index < 0 || index >= this.metadata.frames.length) {
            return null;
        }
        return this.metadata.frames[index];
    }

    /**
     * Read next video frame for a specific track
     */
    readNextVideoFrame(trackIndex) {
        if (this.frameIndex >= this.metadata.frames.length) {
            return null;
        }

        // Find next frame for the specified track
        while (this.frameIndex < this.metadata.frames.length) {
            const frame = this.metadata.frames[this.frameIndex];
            this.frameIndex++;

            // Check if this frame belongs to the requested track
            if (frame.trackNumber === trackIndex + 1) { // trackIndex is 0-based
                return {
                    timestampNs: frame.timestampNs,
                    data: frame.data,
                    isKeyframe: frame.isKeyframe,
                    trackNumber: frame.trackNumber
                };
            }
        }

        return null; // No more frames for this track
    }

    /**
     * Reset frame reading position
     */
    resetFramePosition() {
        this.frameIndex = 0;
    }

    /**
     * Get frames for a specific track
     */
    getFramesForTrack(trackIndex) {
        return this.metadata.frames.filter(frame => frame.trackNumber === trackIndex + 1);
    }

    /**
     * Write EBML variable-length integer to buffer
     */
    writeVint(value) {
        if (value < 0x80) {
            this.buffer.push(value | 0x80);
        } else if (value < 0x4000) {
            this.buffer.push((value >> 8) | 0x40);
            this.buffer.push(value & 0xFF);
        } else if (value < 0x200000) {
            this.buffer.push((value >> 16) | 0x20);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        } else if (value < 0x10000000) {
            this.buffer.push((value >> 24) | 0x10);
            this.buffer.push((value >> 16) & 0xFF);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        } else {
            this.buffer.push(0x08);
            this.buffer.push((value >> 24) & 0xFF);
            this.buffer.push((value >> 16) & 0xFF);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        }
    }

    /**
     * Write EBML element ID to buffer
     */
    writeElementId(id) {
        if (id < 0x100) {
            this.buffer.push(id | 0x80);
        } else if (id < 0x10000) {
            this.buffer.push((id >> 8) | 0x40);
            this.buffer.push(id & 0xFF);
        } else if (id < 0x1000000) {
            this.buffer.push((id >> 16) | 0x20);
            this.buffer.push((id >> 8) & 0xFF);
            this.buffer.push(id & 0xFF);
        } else {
            this.buffer.push((id >> 24) | 0x10);
            this.buffer.push((id >> 16) & 0xFF);
            this.buffer.push((id >> 8) & 0xFF);
            this.buffer.push(id & 0xFF);
        }
    }

    /**
     * Write unsigned integer to buffer
     */
    writeUint(value, byteLength = 1) {
        for (let i = byteLength - 1; i >= 0; i--) {
            this.buffer.push((value >> (i * 8)) & 0xFF);
        }
    }

    /**
     * Write string to buffer
     */
    writeString(str) {
        for (let i = 0; i < str.length; i++) {
            this.buffer.push(str.charCodeAt(i));
        }
    }

    /**
     * Write float (32-bit) to buffer
     */
    writeFloat32(value) {
        const view = new DataView(new ArrayBuffer(4));
        view.setFloat32(0, value, false); // Big endian
        for (let i = 0; i < 4; i++) {
            this.buffer.push(view.getUint8(i));
        }
    }

    /**
     * Write float (64-bit) to buffer
     */
    writeFloat64(value) {
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, value, false); // Big endian
        for (let i = 0; i < 8; i++) {
            this.buffer.push(view.getUint8(i));
        }
    }

    /**
     * Write data array to buffer
     */
    writeData(data) {
        if (data instanceof Uint8Array) {
            this.buffer.push(...data);
        } else if (Array.isArray(data)) {
            this.buffer.push(...data);
        } else {
            throw new Error('Unsupported data type for writing');
        }
    }
}

/**
 * Minimal WebM Muxer for worker environments
 * Creates WebM files by writing EBML elements directly
 */
class MinimalWebMMuxer {
    constructor() {
        this.buffer = [];
        this.tracks = [];
        this.clusters = [];
        this.currentCluster = null;
        this.timecodeScale = 1000000; // Default 1ms
        this.nextTrackId = 1;
        this.writtenHeader = false;
    }

    /**
     * Write EBML variable-length integer to buffer
     */
    writeVint(value) {
        if (value < 0x80) {
            this.buffer.push(value | 0x80);
        } else if (value < 0x4000) {
            this.buffer.push((value >> 8) | 0x40);
            this.buffer.push(value & 0xFF);
        } else if (value < 0x200000) {
            this.buffer.push((value >> 16) | 0x20);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        } else if (value < 0x10000000) {
            this.buffer.push((value >> 24) | 0x10);
            this.buffer.push((value >> 16) & 0xFF);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        } else {
            this.buffer.push(0x08);
            this.buffer.push((value >> 24) & 0xFF);
            this.buffer.push((value >> 16) & 0xFF);
            this.buffer.push((value >> 8) & 0xFF);
            this.buffer.push(value & 0xFF);
        }
    }

    /**
     * Write EBML element ID to buffer
     */
    writeElementId(id) {
        if (id < 0x100) {
            this.buffer.push(id | 0x80);
        } else if (id < 0x10000) {
            this.buffer.push((id >> 8) | 0x40);
            this.buffer.push(id & 0xFF);
        } else if (id < 0x1000000) {
            this.buffer.push((id >> 16) | 0x20);
            this.buffer.push((id >> 8) & 0xFF);
            this.buffer.push(id & 0xFF);
        } else {
            this.buffer.push((id >> 24) | 0x10);
            this.buffer.push((id >> 16) & 0xFF);
            this.buffer.push((id >> 8) & 0xFF);
            this.buffer.push(id & 0xFF);
        }
    }

    /**
     * Write unsigned integer to buffer
     */
    writeUint(value, byteLength = 1) {
        for (let i = byteLength - 1; i >= 0; i--) {
            this.buffer.push((value >> (i * 8)) & 0xFF);
        }
    }

    /**
     * Write string to buffer
     */
    writeString(str) {
        for (let i = 0; i < str.length; i++) {
            this.buffer.push(str.charCodeAt(i));
        }
    }

    /**
     * Write float (32-bit) to buffer
     */
    writeFloat32(value) {
        const view = new DataView(new ArrayBuffer(4));
        view.setFloat32(0, value, false); // Big endian
        for (let i = 0; i < 4; i++) {
            this.buffer.push(view.getUint8(i));
        }
    }

    /**
     * Write float (64-bit) to buffer
     */
    writeFloat64(value) {
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, value, false); // Big endian
        for (let i = 0; i < 8; i++) {
            this.buffer.push(view.getUint8(i));
        }
    }

    /**
     * Write data array to buffer
     */
    writeData(data) {
        if (data instanceof Uint8Array) {
            this.buffer.push(...data);
        } else if (Array.isArray(data)) {
            this.buffer.push(...data);
        } else {
            throw new Error('Unsupported data type for writing');
        }
    }

    /**
     * Add a video track to the WebM file
     */
    addVideoTrack(width, height, codecId = 'V_VP8') {
        const trackId = this.nextTrackId++;
        const track = {
            id: trackId,
            type: WebMTrackType.VIDEO,
            codecId: codecId,
            width: width,
            height: height,
            name: `Video Track ${trackId}`
        };
        this.tracks.push(track);
        return trackId;
    }

    /**
     * Add an audio track to the WebM file
     */
    addAudioTrack(samplingFrequency, channels, codecId = 'A_OPUS') {
        const trackId = this.nextTrackId++;
        const track = {
            id: trackId,
            type: WebMTrackType.AUDIO,
            codecId: codecId,
            samplingFrequency: samplingFrequency,
            channels: channels,
            name: `Audio Track ${trackId}`
        };
        this.tracks.push(track);
        return trackId;
    }

    /**
     * Write EBML header
     */
    writeEBMLHeader() {
        // EBML element (0x1A45DFA3)
        this.writeElementId(0x1A45DFA3);
        this.writeVint(30); // Size

        // EBMLVersion (0x4286)
        this.writeElementId(0x4286);
        this.writeVint(1);
        this.writeUint(1);

        // EBMLReadVersion (0x42F7)
        this.writeElementId(0x42F7);
        this.writeVint(1);
        this.writeUint(1);

        // EBMLMaxIDLength (0x42F2)
        this.writeElementId(0x42F2);
        this.writeVint(1);
        this.writeUint(4);

        // EBMLMaxSizeLength (0x42F3)
        this.writeElementId(0x42F3);
        this.writeVint(1);
        this.writeUint(8);

        // DocType (0x4282)
        this.writeElementId(0x4282);
        this.writeVint(4);
        this.writeString('webm');

        // DocTypeVersion (0x4287)
        this.writeElementId(0x4287);
        this.writeVint(1);
        this.writeUint(2);

        // DocTypeReadVersion (0x4285)
        this.writeElementId(0x4285);
        this.writeVint(1);
        this.writeUint(2);
    }

    /**
     * Write segment info
     */
    writeSegmentInfo() {
        // SegmentInfo element (0x1549A966)
        this.writeElementId(0x1549A966);
        this.writeVint(20); // Size

        // TimecodeScale (0x2AD7B1)
        this.writeElementId(0x2AD7B1);
        this.writeVint(4);
        this.writeUint(this.timecodeScale, 4);

        // Duration (0x4489) - placeholder, will be updated when finalizing
        this.writeElementId(0x4489);
        this.writeVint(8);
        this.writeFloat64(0); // Placeholder
    }

    /**
     * Write tracks
     */
    writeTracks() {
        // Tracks element (0x1654AE6B)
        this.writeElementId(0x1654AE6B);
        let tracksSize = 0;

        // Calculate size of all tracks
        for (const track of this.tracks) {
            tracksSize += this.calculateTrackSize(track);
        }

        this.writeVint(tracksSize);

        // Write each track
        for (const track of this.tracks) {
            this.writeTrack(track);
        }
    }

    /**
     * Calculate the size of a track entry
     */
    calculateTrackSize(track) {
        let size = 0;
        // TrackEntry (0xAE)
        size += 1; // Element ID
        size += 1; // Vint size

        // TrackNumber (0xD7)
        size += 1 + 1 + 1; // ID + size + value

        // TrackType (0x83)
        size += 1 + 1 + 1; // ID + size + value

        // CodecID (0x86)
        size += 1 + 1 + track.codecId.length; // ID + size + string

        // Name (0x536E)
        size += 1 + 1 + track.name.length; // ID + size + string

        if (track.type === WebMTrackType.VIDEO) {
            // Video element (0xE0)
            size += 1 + 1; // ID + size
            // Width (0xB0)
            size += 1 + 1 + 2; // ID + size + value
            // Height (0xBA)
            size += 1 + 1 + 2; // ID + size + value
        } else if (track.type === WebMTrackType.AUDIO) {
            // Audio element (0xE1)
            size += 1 + 1; // ID + size
            // SamplingFrequency (0xB5)
            size += 1 + 1 + 8; // ID + size + value
            // Channels (0x9F)
            size += 1 + 1 + 1; // ID + size + value
        }

        return size;
    }

    /**
     * Write a track entry
     */
    writeTrack(track) {
        // TrackEntry (0xAE)
        this.writeElementId(0xAE);
        this.writeVint(this.calculateTrackSize(track) - 2); // Size minus ID and size bytes

        // TrackNumber (0xD7)
        this.writeElementId(0xD7);
        this.writeVint(1);
        this.writeUint(track.id);

        // TrackType (0x83)
        this.writeElementId(0x83);
        this.writeVint(1);
        this.writeUint(track.type);

        // CodecID (0x86)
        this.writeElementId(0x86);
        this.writeVint(track.codecId.length);
        this.writeString(track.codecId);

        // Name (0x536E)
        this.writeElementId(0x536E);
        this.writeVint(track.name.length);
        this.writeString(track.name);

        if (track.type === WebMTrackType.VIDEO) {
            // Video element (0xE0)
            this.writeElementId(0xE0);
            this.writeVint(8); // Size

            // Width (0xB0)
            this.writeElementId(0xB0);
            this.writeVint(2);
            this.writeUint(track.width, 2);

            // Height (0xBA)
            this.writeElementId(0xBA);
            this.writeVint(2);
            this.writeUint(track.height, 2);
        } else if (track.type === WebMTrackType.AUDIO) {
            // Audio element (0xE1)
            this.writeElementId(0xE1);
            this.writeVint(13); // Size

            // SamplingFrequency (0xB5)
            this.writeElementId(0xB5);
            this.writeVint(8);
            this.writeFloat64(track.samplingFrequency);

            // Channels (0x9F)
            this.writeElementId(0x9F);
            this.writeVint(1);
            this.writeUint(track.channels);
        }
    }

    /**
     * Write a video frame
     */
    writeVideoFrame(trackId, frameData, timestampNs, isKeyframe) {
        if (!this.writtenHeader) {
            this.writeHeader();
        }

        // Ensure we have a cluster for this timestamp
        const clusterTimecode = Math.floor(timestampNs / this.timecodeScale);
        if (!this.currentCluster || clusterTimecode >= this.currentCluster.timecode + 32768) {
            this.finalizeCurrentCluster();
            this.startNewCluster(clusterTimecode);
        }

        // Write SimpleBlock
        this.writeElementId(0xA3);
        const blockSize = 4 + frameData.length; // Track number + timecode + flags + data
        this.writeVint(blockSize);

        // Track number (with keyframe flag)
        const flags = isKeyframe ? 0x80 : 0x00;
        this.writeUint(trackId | (isKeyframe ? 0x00 : 0x80)); // Set MSB for non-keyframe

        // Relative timecode
        const relativeTimecode = clusterTimecode - this.currentCluster.timecode;
        this.writeUint(relativeTimecode, 2);

        // Flags
        this.writeUint(flags);

        // Frame data
        this.writeData(frameData);
    }

    /**
     * Write an audio frame
     */
    writeAudioFrame(trackId, frameData, timestampNs) {
        if (!this.writtenHeader) {
            this.writeHeader();
        }

        // Ensure we have a cluster for this timestamp
        const clusterTimecode = Math.floor(timestampNs / this.timecodeScale);
        if (!this.currentCluster || clusterTimecode >= this.currentCluster.timecode + 32768) {
            this.finalizeCurrentCluster();
            this.startNewCluster(clusterTimecode);
        }

        // Write SimpleBlock for audio
        this.writeElementId(0xA3);
        const blockSize = 4 + frameData.length;
        this.writeVint(blockSize);

        // Track number
        this.writeUint(trackId);

        // Relative timecode
        const relativeTimecode = clusterTimecode - this.currentCluster.timecode;
        this.writeUint(relativeTimecode, 2);

        // Flags (audio frames are typically not keyframes in the same way)
        this.writeUint(0x00);

        // Frame data
        this.writeData(frameData);
    }

    /**
     * Write the WebM header
     */
    writeHeader() {
        this.writeEBMLHeader();
        this.writeSegmentInfo();
        this.writeTracks();
        this.writtenHeader = true;
    }

    /**
     * Start a new cluster
     */
    startNewCluster(timecode) {
        this.currentCluster = {
            timecode: timecode,
            startPos: this.buffer.length,
            size: 0
        };
        this.clusters.push(this.currentCluster);

        // Cluster element (0x1F43B675)
        this.writeElementId(0x1F43B675);
        this.writeVint(0); // Placeholder size, will be updated

        // Timecode (0xE7)
        this.writeElementId(0xE7);
        this.writeVint(2);
        this.writeUint(timecode, 2);
    }

    /**
     * Finalize the current cluster
     */
    finalizeCurrentCluster() {
        if (this.currentCluster) {
            const clusterEnd = this.buffer.length;
            const clusterSize = clusterEnd - this.currentCluster.startPos - 6; // Subtract ID and size bytes

            // Update cluster size (big endian)
            const sizePos = this.currentCluster.startPos + 4; // Position after cluster ID
            this.buffer[sizePos] = (clusterSize >> 24) & 0xFF;
            this.buffer[sizePos + 1] = (clusterSize >> 16) & 0xFF;
            this.buffer[sizePos + 2] = (clusterSize >> 8) & 0xFF;
            this.buffer[sizePos + 3] = clusterSize & 0xFF;
        }
    }

    /**
     * Finalize the WebM file and return the data
     */
    finalize() {
        // Finalize current cluster
        this.finalizeCurrentCluster();

        // Update duration in SegmentInfo
        if (this.clusters.length > 0) {
            const lastCluster = this.clusters[this.clusters.length - 1];
            const duration = (lastCluster.timecode + 1000) * (this.timecodeScale / 1000000000); // Convert to seconds

            // Find duration position (after TimecodeScale)
            const durationPos = 4 + 30 + 4 + 4 + 4 + 8; // EBML + SegmentInfo + TimecodeScale + Duration ID + size
            this.buffer[durationPos] = (duration >> 56) & 0xFF;
            this.buffer[durationPos + 1] = (duration >> 48) & 0xFF;
            this.buffer[durationPos + 2] = (duration >> 40) & 0xFF;
            this.buffer[durationPos + 3] = (duration >> 32) & 0xFF;
            this.buffer[durationPos + 4] = (duration >> 24) & 0xFF;
            this.buffer[durationPos + 5] = (duration >> 16) & 0xFF;
            this.buffer[durationPos + 6] = (duration >> 8) & 0xFF;
            this.buffer[durationPos + 7] = duration & 0xFF;
        }

        return new Uint8Array(this.buffer);
    }

    /**
     * Get current WebM data (before finalization)
     */
    getData() {
        return new Uint8Array(this.buffer);
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
            trackCount: metadata.tracks ? metadata.tracks.length : 0,
            tracks: metadata.tracks || [],
            frameCount: metadata.frames ? metadata.frames.length : 0
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
        this.frameIndex = 0;
        this.muxer = null; // For writing mode
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
     * Create new WebM file for writing
     */
    static forWriting(module) {
        const file = new WebMFile();
        file.muxer = new MinimalWebMMuxer();
        return file;
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
            console.warn('WebMFile.getTrackCount(): No metadata available - file not parsed');
            return 0;
        }

        if (!Array.isArray(this.metadata.tracks)) {
            console.warn('WebMFile.getTrackCount(): metadata.tracks is not an array', this.metadata.tracks);
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

    /**
     * Get the number of frames in the file
     */
    getFrameCount() {
        if (!this.metadata) return 0;
        return this.metadata.frames ? this.metadata.frames.length : 0;
    }

    /**
     * Read next video frame for a specific track
     */
    readNextVideoFrame(trackIndex) {
        if (!this.metadata || !this.metadata.frames) return null;

        // Initialize frame reading position if not exists
        if (typeof this.frameIndex === 'undefined') {
            this.frameIndex = 0;
        }

        if (this.frameIndex >= this.metadata.frames.length) {
            return null;
        }

        // Find next frame for the specified track
        while (this.frameIndex < this.metadata.frames.length) {
            const frame = this.metadata.frames[this.frameIndex];
            this.frameIndex++;

            // Check if this frame belongs to the requested track
            if (frame.trackNumber === trackIndex + 1) { // trackIndex is 0-based
                return {
                    timestampNs: frame.timestampNs,
                    data: frame.data,
                    isKeyframe: frame.isKeyframe,
                    trackNumber: frame.trackNumber
                };
            }
        }

        return null; // No more frames for this track
    }

    /**
     * Reset frame reading position
     */
    resetFramePosition() {
        this.frameIndex = 0;
    }

    /**
     * Get all frames for a specific track
     */
    getFramesForTrack(trackIndex) {
        if (!this.metadata || !this.metadata.frames) return [];
        return this.metadata.frames.filter(frame => frame.trackNumber === trackIndex + 1);
    }

    /**
     * Add video track (muxing mode)
     */
    addVideoTrack(width, height, codecId) {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        return this.muxer.addVideoTrack(width, height, codecId);
    }

    /**
     * Add audio track (muxing mode)
     */
    addAudioTrack(samplingFrequency, channels, codecId) {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        return this.muxer.addAudioTrack(samplingFrequency, channels, codecId);
    }

    /**
     * Write video frame (muxing mode)
     */
    writeVideoFrame(trackId, frameData, timestampNs, isKeyframe) {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        this.muxer.writeVideoFrame(trackId, frameData, timestampNs, isKeyframe);
    }

    /**
     * Write audio frame (muxing mode)
     */
    writeAudioFrame(trackId, frameData, timestampNs) {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        this.muxer.writeAudioFrame(trackId, frameData, timestampNs);
    }

    /**
     * Finalize and get WebM data (muxing mode)
     */
    finalize() {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        return this.muxer.finalize();
    }

    /**
     * Get current WebM data (muxing mode)
     */
    getData() {
        if (!this.muxer) throw new Error('No muxer available - file not in writing mode');
        return this.muxer.getData();
    }
}

/**
 * WebMParser compatible class for worker environments
 * Provides the same interface as the full WebMParser but uses WebMFile internally
 */
class WebMParserWorker {
    constructor(webmFile) {
        this.webmFile = webmFile;
    }

    /**
     * Create parser from buffer (static method)
     */
    static async createFromBuffer(buffer) {
        const webmFile = await WebMFile.fromBuffer(buffer);
        return new WebMParserWorker(webmFile);
    }

    /**
     * Parse headers (no-op in worker mode since parsing is done during construction)
     */
    parseHeaders() {
        // Parsing is already done during WebMFile.fromBuffer()
        // This method exists for API compatibility
    }

    /**
     * Get duration
     */
    getDuration() {
        return this.webmFile.getDuration();
    }

    /**
     * Get track count
     */
    getTrackCount() {
        console.log('WebMParserWorker.getTrackCount(): Called');
        const result = this.webmFile.getTrackCount();
        console.log(`WebMParserWorker.getTrackCount(): Returning ${result}`);
        return result;
    }

    /**
     * Get track info
     */
    getTrackInfo(trackIndex) {
        return this.webmFile.getTrackInfo(trackIndex);
    }

    /**
     * Read next video frame
     */
    readNextVideoFrame(trackIndex) {
        return this.webmFile.readNextVideoFrame(trackIndex);
    }

    /**
     * Reset frame position
     */
    resetFramePosition() {
        return this.webmFile.resetFramePosition();
    }

    /**
     * Get frame count
     */
    getFrameCount() {
        return this.webmFile.getFrameCount();
    }

    /**
     * Get frames for track
     */
    getFramesForTrack(trackIndex) {
        return this.webmFile.getFramesForTrack(trackIndex);
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

    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

    if (isCloudflareWorker || isWebWorker || isBrowser || isNode) {
        console.log('LibWebM running in worker/browser/Node.js mode with minimal parser and muxer support.');

        return {
            WebMErrorCode,
            WebMTrackType,
            WebMUtils,
            WebMFile,

            // For compatibility
            WebMParser: {
                createFromBuffer: (buffer) => WebMParserWorker.createFromBuffer(buffer)
            },
            WebMMuxer: () => new MinimalWebMMuxer(),

            // Indicate this is a worker implementation
            _isWorker: true,
            _isFallback: false,
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
                createFromBuffer: (buffer) => WebMParserWorker.createFromBuffer(buffer)
            },
            WebMMuxer: () => new MinimalWebMMuxer(),

            _isFallback: true,
            _module: null
        };
    }
}

export default createLibWebM;
