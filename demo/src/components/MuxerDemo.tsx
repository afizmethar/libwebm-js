/**
 * BSD 3-Clause License
 *
 * * Copyright (c) 2025, SCTG Développement
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *  contributors may be used to endorse or promote products derived from
 *  this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from '@heroui/table';
import {
    Button,
} from '@heroui/button';
import {
    Card,
    CardBody,
    CardHeader,
} from '@heroui/card';
import {
    Progress,
} from '@heroui/progress';
import {
    Chip,
} from '@heroui/chip';
import {
    Badge,
} from '@heroui/badge';
import {
    Alert,
} from '@heroui/alert';
import {
    Input,
} from '@heroui/input';

// Import libwebm-js
import createLibWebM from '@sctg/libwebm-js';
/**
 * Props for the MuxerDemo component
 */
interface MuxerDemoProps {
    /** Callback function called when an error occurs */
    onError: (error: string) => void;
    /** Callback function called when loading state changes */
    onLoading: (loading: boolean) => void;
}

/**
 * Represents a track being created in the muxer
 */
interface MuxerTrack {
    /** Track ID assigned by the muxer */
    trackId: number;
    /** Track type */
    type: 'video' | 'audio';
    /** Codec ID */
    codecId: string;
    /** Video parameters (if video track) */
    videoParams?: {
        width: number;
        height: number;
    };
    /** Audio parameters (if audio track) */
    audioParams?: {
        sampleRate: number;
        channels: number;
    };
}

/**
 * Represents a frame written to the muxer
 */
interface WrittenFrame {
    /** Track ID */
    trackId: number;
    /** Frame number */
    frameNumber: number;
    /** Timestamp in nanoseconds */
    timestampNs: number;
    /** Frame data size */
    dataSize: number;
    /** Whether this is a keyframe */
    isKeyframe: boolean;
}

/**
 * Component for demonstrating WebM muxing capabilities
 * Shows how to create WebM files by adding tracks and writing frames
 */
export const MuxerDemo: React.FC<MuxerDemoProps> = ({
    onError,
    onLoading
}) => {
    const [tracks, setTracks] = useState<MuxerTrack[]>([]);
    const [frames, setFrames] = useState<WrittenFrame[]>([]);
    const [isMuxing, setIsMuxing] = useState(false);
    const [muxingProgress, setMuxingProgress] = useState(0);
    const [outputFileSize, setOutputFileSize] = useState<number | null>(null);
    const [libwebm, setLibwebm] = useState<any>(null);

    // Initialize libwebm-js on component mount
    useEffect(() => {
        const initializeLibWebM = async () => {
            try {
                const libwebmInstance = await createLibWebM();
                setLibwebm(libwebmInstance);
            } catch (error) {
                onError(`Failed to initialize libwebm-js: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };

        initializeLibWebM();
    }, [onError]);

    // Form state for adding tracks
    const [videoWidth, setVideoWidth] = useState('1920');
    const [videoHeight, setVideoHeight] = useState('1080');
    const [audioSampleRate, setAudioSampleRate] = useState('48000');
    const [audioChannels, setAudioChannels] = useState('2');

    /**
     * Adds a video track to the muxer
     */
    const addVideoTrack = useCallback(() => {
        const width = parseInt(videoWidth);
        const height = parseInt(videoHeight);

        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            onError('Invalid video dimensions');
            return;
        }

        const newTrack: MuxerTrack = {
            trackId: tracks.length + 1,
            type: 'video',
            codecId: 'V_VP9',
            videoParams: { width, height }
        };

        setTracks(prev => [...prev, newTrack]);
    }, [videoWidth, videoHeight, tracks.length, onError]);

    /**
     * Adds an audio track to the muxer
     */
    const addAudioTrack = useCallback(() => {
        const sampleRate = parseInt(audioSampleRate);
        const channels = parseInt(audioChannels);

        if (isNaN(sampleRate) || isNaN(channels) || sampleRate <= 0 || channels <= 0) {
            onError('Invalid audio parameters');
            return;
        }

        const newTrack: MuxerTrack = {
            trackId: tracks.length + 1,
            type: 'audio',
            codecId: 'A_OPUS',
            audioParams: { sampleRate, channels }
        };

        setTracks(prev => [...prev, newTrack]);
    }, [audioSampleRate, audioChannels, tracks.length, onError]);

    /**
     * Creates a WebM file by muxing tracks using libwebm-js
     */
    const startMuxing = useCallback(async () => {
        if (!libwebm) {
            onError('libwebm-js is not initialized');
            return;
        }

        if (tracks.length === 0) {
            onError('Add at least one track before muxing');
            return;
        }

        setIsMuxing(true);
        setMuxingProgress(0);
        setFrames([]);
        setOutputFileSize(null);
        onLoading(true);

        try {
            // Create a new WebM muxer
            const muxer = new libwebm.WebMMuxer();

            // Add tracks to the muxer
            const trackIds: number[] = [];
            for (const track of tracks) {
                let trackId;
                if (track.type === 'video' && track.videoParams) {
                    trackId = muxer.addVideoTrack(
                        track.videoParams.width,
                        track.videoParams.height,
                        track.codecId
                    );
                } else if (track.type === 'audio' && track.audioParams) {
                    trackId = muxer.addAudioTrack(
                        track.audioParams.sampleRate,
                        track.audioParams.channels,
                        track.codecId
                    );
                }
                if (trackId !== undefined) {
                    trackIds.push(trackId);
                }
            }

            const totalFrames = 60; // 2 seconds at 30fps
            const writtenFrames: WrittenFrame[] = [];

            // Generate and write frames for each track
            for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
                for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
                    const track = tracks[trackIndex];
                    const trackId = trackIds[trackIndex];

                    // Generate sample frame data (in real usage, this would be actual encoded data)
                    const frameSize = track.type === 'video'
                        ? Math.floor(Math.random() * 50000) + 10000 // 10-60KB for video
                        : Math.floor(Math.random() * 1000) + 500;   // 0.5-1.5KB for audio

                    const frameData = new Uint8Array(frameSize);
                    // Fill with random data for demo
                    for (let i = 0; i < frameSize; i++) {
                        frameData[i] = Math.floor(Math.random() * 256);
                    }

                    // Write frame to muxer
                    const timestamp = frameNum * 33333333; // ~30fps
                    const isKeyframe = frameNum % 5 === 0;

                    if (track.type === 'video') {
                        muxer.writeVideoFrame(trackId, frameData, timestamp, isKeyframe);
                    } else if (track.type === 'audio') {
                        muxer.writeAudioFrame(trackId, frameData, timestamp);
                    }

                    const writtenFrame: WrittenFrame = {
                        trackId: track.trackId,
                        frameNumber: frameNum + 1,
                        timestampNs: timestamp,
                        dataSize: frameSize,
                        isKeyframe: isKeyframe
                    };

                    writtenFrames.push(writtenFrame);
                    setFrames([...writtenFrames]);

                    // Small delay to show progress
                    await new Promise(resolve => setTimeout(resolve, 30));
                }

                setMuxingProgress(((frameNum + 1) / totalFrames) * 100);
            }

            // Finalize the WebM file
            const outputBuffer = muxer.finalize();
            setOutputFileSize(outputBuffer.length);

            console.log(`WebM file created with ${writtenFrames.length} frames, size: ${outputBuffer.length} bytes`);

            onLoading(false);
        } catch (error) {
            onError(`Muxing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsMuxing(false);
            onLoading(false);
        }
    }, [tracks, libwebm, onError, onLoading]);    /**
     * Clears all tracks and frames
     */
    const clearAll = useCallback(() => {
        setTracks([]);
        setFrames([]);
        setMuxingProgress(0);
        setOutputFileSize(null);
    }, []);

    /**
     * Formats data size in human-readable format
     * @param bytes - Size in bytes
     * @returns Formatted size string
     */
    const formatDataSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    /**
     * Gets the appropriate color for track type
     * @param type - The type of track
     * @returns Color variant for the chip
     */
    const getTrackTypeColor = (type: 'video' | 'audio'): "primary" | "secondary" | "success" | "warning" | "danger" => {
        return type === 'video' ? 'primary' : 'secondary';
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <h3 className="text-xl font-semibold">WebM Muxer Demo</h3>
                </CardHeader>
                <CardBody className="space-y-6">
                    {/* Add Tracks Section */}
                    <Card>
                        <CardHeader>
                            <h4 className="text-lg font-semibold">Add Tracks</h4>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            {/* Video Track Form */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Video Width
                                    </label>
                                    <Input
                                        type="number"
                                        value={videoWidth}
                                        onChange={(e) => setVideoWidth(e.target.value)}
                                        placeholder="1920"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Video Height
                                    </label>
                                    <Input
                                        type="number"
                                        value={videoHeight}
                                        onChange={(e) => setVideoHeight(e.target.value)}
                                        placeholder="1080"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Button
                                        color="primary"
                                        onClick={addVideoTrack}
                                        disabled={isMuxing}
                                        className="w-full"
                                    >
                                        Add Video Track (VP9)
                                    </Button>
                                </div>
                            </div>

                            {/* Audio Track Form */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sample Rate
                                    </label>
                                    <Input
                                        type="number"
                                        value={audioSampleRate}
                                        onChange={(e) => setAudioSampleRate(e.target.value)}
                                        placeholder="48000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Channels
                                    </label>
                                    <Input
                                        type="number"
                                        value={audioChannels}
                                        onChange={(e) => setAudioChannels(e.target.value)}
                                        placeholder="2"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Button
                                        color="secondary"
                                        onClick={addAudioTrack}
                                        disabled={isMuxing}
                                        className="w-full"
                                    >
                                        Add Audio Track (Opus)
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Tracks List */}
                    {tracks.length > 0 && (
                        <Card>
                            <CardBody>
                                <h4 className="font-semibold mb-4">Configured Tracks</h4>
                                <Table aria-label="Tracks table">
                                    <TableHeader>
                                        <TableColumn>Track ID</TableColumn>
                                        <TableColumn>Type</TableColumn>
                                        <TableColumn>Codec</TableColumn>
                                        <TableColumn>Parameters</TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        {tracks.map((track) => (
                                            <TableRow key={track.trackId}>
                                                <TableCell>
                                                    <Badge color="primary" variant="flat">
                                                        {track.trackId}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        color={getTrackTypeColor(track.type)}
                                                        variant="flat"
                                                        size="sm"
                                                    >
                                                        {track.type.toUpperCase()}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip color="success" variant="flat" size="sm">
                                                        {track.codecId}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    {track.videoParams && (
                                                        <span className="text-sm">
                                                            {track.videoParams.width}×{track.videoParams.height}
                                                        </span>
                                                    )}
                                                    {track.audioParams && (
                                                        <span className="text-sm">
                                                            {track.audioParams.sampleRate}Hz, {track.audioParams.channels}ch
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardBody>
                        </Card>
                    )}

                    {/* Muxing Controls */}
                    {tracks.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                color="primary"
                                onClick={startMuxing}
                                isLoading={isMuxing}
                                disabled={isMuxing}
                            >
                                {isMuxing ? 'Muxing...' : 'Start Muxing'}
                            </Button>
                            <Button
                                color="secondary"
                                variant="flat"
                                onClick={clearAll}
                                disabled={isMuxing}
                            >
                                Clear All
                            </Button>
                        </div>
                    )}

                    {/* Muxing Progress */}
                    {isMuxing && (
                        <div className="space-y-2">
                            <Progress
                                value={muxingProgress}
                                color="primary"
                                className="w-full"
                            />
                            <p className="text-sm text-gray-600 text-center">
                                Muxing frames... {Math.round(muxingProgress)}%
                            </p>
                        </div>
                    )}

                    {/* Results */}
                    {outputFileSize !== null && (
                        <Card className="bg-green-50 border-green-200">
                            <CardBody>
                                <div className="flex items-center gap-2 mb-4">
                                    <Chip color="success" variant="flat">
                                        ✓ Muxing Complete
                                    </Chip>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-600">Output file size:</span>
                                        <p className="font-medium">{formatDataSize(outputFileSize)}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Total frames:</span>
                                        <p className="font-medium">{frames.length}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Tracks:</span>
                                        <p className="font-medium">{tracks.length}</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <span className="text-sm text-gray-600">Frames written:</span>
                                    <div className="mt-2 max-h-32 overflow-y-auto">
                                        <div className="text-xs font-mono bg-white p-2 rounded border">
                                            {frames.slice(-5).map((frame, index) => (
                                                <div key={index}>
                                                    Track {frame.trackId}, Frame {frame.frameNumber}, {formatDataSize(frame.dataSize)}
                                                    {frame.isKeyframe ? ' (Keyframe)' : ''}
                                                </div>
                                            ))}
                                            {frames.length > 5 && <div>... and {frames.length - 5} more frames</div>}
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Instructions */}
                    {tracks.length === 0 && (
                        <Alert
                            color="primary"
                            title="WebM Muxing"
                            description="Add video and audio tracks to create a WebM file. Configure track parameters and start muxing to see how frames are written to the output file."
                        />
                    )}
                </CardBody>
            </Card>
        </div>
    );
};
