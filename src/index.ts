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
 * WebM Error Codes
 */
export enum WebMErrorCode {
    SUCCESS = 0,
    INVALID_FILE = 1,
    CORRUPTED_DATA = 2,
    UNSUPPORTED_FORMAT = 3,
    IO_ERROR = 4,
    OUT_OF_MEMORY = 5,
    INVALID_ARGUMENT = 6
}

/**
 * WebM Track Types
 */
export enum WebMTrackType {
    UNKNOWN = 0,
    VIDEO = 1,
    AUDIO = 2
}

/**
 * Track information structure
 */
export interface WebMTrackInfo {
    trackNumber: number;
    trackType: number;
    codecId: string;
    name: string;
}

/**
 * Video track information
 */
export interface WebMVideoInfo {
    width: number;
    height: number;
    frameRate: number;
}

/**
 * Audio track information
 */
export interface WebMAudioInfo {
    samplingFrequency: number;
    channels: number;
    bitDepth: number;
}

/**
 * Frame data with metadata
 */
export interface WebMFrameData {
    data: Uint8Array;
    timestampNs: number;
    isKeyframe: boolean;
}

/**
 * WebM Parser for reading WebM files
 */
export interface WebMParser {
    /**
     * Parse the WebM file headers
     * @throws Error if parsing fails
     */
    parseHeaders(): void;

    /**
     * Get the duration of the WebM file
     * @returns Duration in seconds
     * @throws Error if not available
     */
    getDuration(): number;

    /**
     * Get the number of tracks in the WebM file
     * @returns Number of tracks
     * @throws Error if not available
     */
    getTrackCount(): number;

    /**
     * Get information about a specific track
     * @param trackIndex Index of the track (0-based)
     * @returns Track information
     * @throws Error if track not found
     */
    getTrackInfo(trackIndex: number): WebMTrackInfo;

    /**
     * Get video information for a specific track
     * @param trackNumber Track number
     * @returns Video information
     * @throws Error if track is not video or not found
     */
    getVideoInfo(trackNumber: number): WebMVideoInfo;

    /**
     * Get audio information for a specific track
     * @param trackNumber Track number
     * @returns Audio information
     * @throws Error if track is not audio or not found
     */
    getAudioInfo(trackNumber: number): WebMAudioInfo;

    /**
     * Read the next video frame from the WebM file
     * @param trackId Track ID to read from
     * @returns Frame data or null if no more frames
     * @throws Error if reading fails
     */
    readNextVideoFrame(trackId: number): WebMFrameData | null;

    /**
     * Read the next audio frame from the WebM file
     * @param trackId Track ID to read from
     * @returns Frame data or null if no more frames
     * @throws Error if reading fails
     */
    readNextAudioFrame(trackId: number): WebMFrameData | null;
}

/**
 * WebM Muxer for creating WebM files
 */
export interface WebMMuxer {
    /**
     * Add a video track to the WebM file
     * @param width Video width in pixels
     * @param height Video height in pixels
     * @param codecId Codec identifier (e.g., "V_VP8", "V_VP9", "V_AV1")
     * @returns Track ID for the added track
     * @throws Error if track addition fails
     */
    addVideoTrack(width: number, height: number, codecId: string): number;

    /**
     * Add an audio track to the WebM file
     * @param samplingFrequency Audio sampling frequency in Hz
     * @param channels Number of audio channels
     * @param codecId Codec identifier (e.g., "A_OPUS", "A_VORBIS")
     * @returns Track ID for the added track
     * @throws Error if track addition fails
     */
    addAudioTrack(samplingFrequency: number, channels: number, codecId: string): number;

    /**
     * Write a video frame to the WebM file
     * @param trackId Track ID to write to
     * @param frameData Frame data bytes
     * @param timestampNs Frame timestamp in nanoseconds
     * @param isKeyframe Whether this frame is a keyframe
     * @throws Error if writing fails
     */
    writeVideoFrame(trackId: number, frameData: Uint8Array, timestampNs: number, isKeyframe: boolean): void;

    /**
     * Write an audio frame to the WebM file
     * @param trackId Track ID to write to
     * @param frameData Frame data bytes
     * @param timestampNs Frame timestamp in nanoseconds
     * @throws Error if writing fails
     */
    writeAudioFrame(trackId: number, frameData: Uint8Array, timestampNs: number): void;

    /**
     * Finalize the WebM file and get the data
     * @returns Complete WebM file data
     * @throws Error if finalization fails
     */
    finalize(): Uint8Array;

    /**
     * Get the current WebM data (before finalization)
     * @returns Current WebM file data
     */
    getData(): Uint8Array;
}

/**
 * WebM Parser Constructor
 */
export interface WebMParserConstructor {
    /**
     * Create a parser from file path (Node.js only)
     * @param filePath Path to WebM file
     */
    new(filePath: string): WebMParser;

    /**
     * Create a parser from buffer data
     * @param buffer WebM file data
     * @returns Parser instance
     */
    createFromBuffer(buffer: Uint8Array): WebMParser;
}

/**
 * WebM Muxer Constructor
 */
export interface WebMMuxerConstructor {
    /**
     * Create a new WebM muxer
     */
    new(): WebMMuxer;
}

/**
 * LibWebM Module interface (generated by Emscripten)
 */
export interface LibWebMModule {
    WebMErrorCode: typeof WebMErrorCode;
    WebMTrackType: typeof WebMTrackType;
    WebMParser: WebMParserConstructor;
    WebMMuxer: WebMMuxerConstructor;
}

/**
 * LibWebM factory function (generated by Emscripten)
 */
export default function LibWebMFactory(options?: any): Promise<LibWebMModule>;

/**
 * Utility functions for common operations
 */
export namespace WebMUtils {
    /**
     * Check if a codec is supported for video tracks
     * @param codecId Codec identifier
     * @returns True if supported
     */
    export function isVideoCodecSupported(codecId: string): boolean;

    /**
     * Check if a codec is supported for audio tracks
     * @param codecId Codec identifier
     * @returns True if supported
     */
    export function isAudioCodecSupported(codecId: string): boolean;

    /**
     * Convert nanoseconds to milliseconds
     * @param ns Nanoseconds
     * @returns Milliseconds
     */
    export function nsToMs(ns: number): number;

    /**
     * Convert milliseconds to nanoseconds
     * @param ms Milliseconds
     * @returns Nanoseconds
     */
    export function msToNs(ms: number): number;

    /**
     * Get supported video codecs
     * @returns Array of supported video codec IDs
     */
    export function getSupportedVideoCodecs(): string[];

    /**
     * Get supported audio codecs
     * @returns Array of supported audio codec IDs
     */
    export function getSupportedAudioCodecs(): string[];
}

/**
 * High-level WebM operations
 */
export class WebMFile {
    private parser: WebMParser | null = null;
    private muxer: WebMMuxer | null = null;

    /**
     * Load WebM file from buffer
     * @param buffer WebM file data
     * @param module LibWebM module instance
     */
    static async fromBuffer(buffer: Uint8Array, module: LibWebMModule): Promise<WebMFile> {
        const file = new WebMFile();
        file.parser = module.WebMParser.createFromBuffer(buffer);
        await file.parser.parseHeaders();
        return file;
    }

    /**
     * Create new WebM file for writing
     * @param module LibWebM module instance
     */
    static forWriting(module: LibWebMModule): WebMFile {
        const file = new WebMFile();
        file.muxer = new module.WebMMuxer();
        return file;
    }

    /**
     * Get file duration
     */
    getDuration(): number {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getDuration();
    }

    /**
     * Get track count
     */
    getTrackCount(): number {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getTrackCount();
    }

    /**
     * Get track information
     */
    getTrackInfo(trackIndex: number): WebMTrackInfo {
        if (!this.parser) throw new Error('No parser available');
        return this.parser.getTrackInfo(trackIndex);
    }

    /**
     * Add video track
     */
    addVideoTrack(width: number, height: number, codecId: string): number {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.addVideoTrack(width, height, codecId);
    }

    /**
     * Add audio track
     */
    addAudioTrack(samplingFrequency: number, channels: number, codecId: string): number {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.addAudioTrack(samplingFrequency, channels, codecId);
    }

    /**
     * Write video frame
     */
    writeVideoFrame(trackId: number, frameData: Uint8Array, timestampNs: number, isKeyframe: boolean): void {
        if (!this.muxer) throw new Error('No muxer available');
        this.muxer.writeVideoFrame(trackId, frameData, timestampNs, isKeyframe);
    }

    /**
     * Write audio frame
     */
    writeAudioFrame(trackId: number, frameData: Uint8Array, timestampNs: number): void {
        if (!this.muxer) throw new Error('No muxer available');
        this.muxer.writeAudioFrame(trackId, frameData, timestampNs);
    }

    /**
     * Finalize and get WebM data
     */
    finalize(): Uint8Array {
        if (!this.muxer) throw new Error('No muxer available');
        return this.muxer.finalize();
    }
}
