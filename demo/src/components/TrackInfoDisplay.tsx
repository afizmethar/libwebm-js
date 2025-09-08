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

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    Chip,
} from '@heroui/chip';
import {
    Badge,
} from '@heroui/badge';
import {
    Alert,
} from '@heroui/alert';

// Import libwebm-js
import createLibWebM from '@sctg/libwebm-js';

/**
 * Props for the TrackInfoDisplay component
 */
interface TrackInfoDisplayProps {
  /** Callback function called when an error occurs */
  onError: (error: string) => void;
  /** Callback function called when loading state changes */
  onLoading: (loading: boolean) => void;
}

/**
 * Represents information about a WebM track
 */
interface TrackInfo {
  /** Track number */
  trackNumber: number;
  /** Track type (VIDEO, AUDIO, etc.) */
  trackType: string;
  /** Codec ID (V_VP8, A_OPUS, etc.) */
  codecId: string;
  /** Track name (optional) */
  name?: string;
  /** Track language (optional) */
  language?: string;
  /** Video-specific information */
  videoInfo?: {
    width: number;
    height: number;
    frameRate?: number;
  };
  /** Audio-specific information */
  audioInfo?: {
    samplingFrequency: number;
    channels: number;
    bitDepth?: number;
  };
}

/**
 * Component for displaying detailed track information from parsed WebM files
 * Shows track metadata, codec information, and media-specific details
 */
export const TrackInfoDisplay: React.FC<TrackInfoDisplayProps> = ({
  onError,
  onLoading
}) => {
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [libwebm, setLibwebm] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  /**
   * Loads track information from a WebM buffer
   * @param buffer - The WebM file buffer to parse
   */
  const loadTracksFromBuffer = useCallback(async (buffer: Uint8Array) => {
    if (!libwebm) {
      onError('libwebm-js is not initialized');
      return;
    }

    setIsLoadingTracks(true);
    onLoading(true);

    try {
      // Parse WebM file using libwebm-js
      const webmFile = await libwebm.WebMFile.fromBuffer(buffer, libwebm);

      // Extract track information
      const trackCount = webmFile.getTrackCount();
      const sampleTracks: TrackInfo[] = [];

      for (let i = 0; i < trackCount; i++) {
        const trackInfo = webmFile.getTrackInfo(i);

        const track: TrackInfo = {
          trackNumber: trackInfo.trackNumber,
          trackType: trackInfo.trackType === 1 ? 'VIDEO' :
                    trackInfo.trackType === 2 ? 'AUDIO' : 'UNKNOWN',
          codecId: trackInfo.codecId,
          name: trackInfo.name || `Track ${trackInfo.trackNumber}`,
          language: 'und' // Default language
        };

        // Add video-specific information if it's a video track
        if (trackInfo.trackType === 1) {
          try {
            const videoInfo = webmFile.parser.getVideoInfo(trackInfo.trackNumber);
            track.videoInfo = {
              width: videoInfo.width,
              height: videoInfo.height,
              frameRate: videoInfo.frameRate
            };
          } catch (error) {
            console.warn(`Could not get video info for track ${trackInfo.trackNumber}:`, error);
          }
        }

        // Add audio-specific information if it's an audio track
        if (trackInfo.trackType === 2) {
          try {
            const audioInfo = webmFile.parser.getAudioInfo(trackInfo.trackNumber);
            track.audioInfo = {
              samplingFrequency: audioInfo.samplingFrequency,
              channels: audioInfo.channels,
              bitDepth: audioInfo.bitDepth
            };
          } catch (error) {
            console.warn(`Could not get audio info for track ${trackInfo.trackNumber}:`, error);
          }
        }

        sampleTracks.push(track);
      }

      setTracks(sampleTracks);
      onLoading(false);
    } catch (error) {
      onError(`Failed to load track information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingTracks(false);
      onLoading(false);
    }
  }, [libwebm, onError, onLoading]);

  /**
   * Loads track information from the sample WebM file
   */
  const loadSampleTracks = useCallback(async () => {
    try {
      // Load sample WebM file from public/samples directory
      const response = await fetch(`${__BASE_PATH__}/samples/sample.webm`);
      if (!response.ok) {
        throw new Error(`Failed to load sample file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await loadTracksFromBuffer(buffer);
    } catch (error) {
      onError(`Failed to load sample file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadTracksFromBuffer, onError]);

  /**
   * Loads track information from a selected file
   */
  const loadTracksFromFile = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await loadTracksFromBuffer(buffer);
    } catch (error) {
      onError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadTracksFromBuffer, onError]);

  /**
   * Handles file selection
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.webm')) {
        onError('Please select a WebM file (.webm)');
        return;
      }
      setSelectedFile(file);
      loadTracksFromFile(file);
    }
  }, [onError, loadTracksFromFile]);

  /**
   * Opens the file selector
   */
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Clears the selected file and tracks
   */
  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setTracks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Gets the appropriate color for track type chips
   * @param trackType - The type of track
   * @returns Color variant for the chip
   */
  const getTrackTypeColor = (trackType: string): "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (trackType) {
      case 'VIDEO': return 'primary';
      case 'AUDIO': return 'secondary';
      default: return 'warning';
    }
  };

  /**
   * Gets the appropriate color for codec chips
   * @param codecId - The codec identifier
   * @returns Color variant for the chip
   */
  const getCodecColor = (codecId: string): "primary" | "secondary" | "success" | "warning" | "danger" => {
    if (codecId.startsWith('V_')) return 'success'; // Video codecs
    if (codecId.startsWith('A_')) return 'warning'; // Audio codecs
    return 'primary';
  };

  /**
   * Formats codec ID for better readability
   * @param codecId - The codec identifier
   * @returns Formatted codec name
   */
  const formatCodecName = (codecId: string): string => {
    const codecMap: Record<string, string> = {
      'V_VP8': 'VP8',
      'V_VP9': 'VP9',
      'V_AV01': 'AV1',
      'A_OPUS': 'Opus',
      'A_VORBIS': 'Vorbis'
    };
    return codecMap[codecId] || codecId;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Track Information</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            {!selectedFile ? (
              <>
                <Button
                  color="primary"
                  onClick={openFileSelector}
                  disabled={isLoadingTracks}
                >
                  Select WebM File
                </Button>
                <Button
                  color="secondary"
                  variant="flat"
                  onClick={loadSampleTracks}
                  isLoading={isLoadingTracks}
                  disabled={isLoadingTracks}
                >
                  {isLoadingTracks ? 'Loading...' : 'Load Sample'}
                </Button>
              </>
            ) : (
              <Button
                color="primary"
                onClick={openFileSelector}
                disabled={isLoadingTracks}
              >
                Change File
              </Button>
            )}
            {(tracks.length > 0 || selectedFile) && (
              <Button
                color="danger"
                variant="flat"
                onClick={clearFile}
                disabled={isLoadingTracks}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Selected file:</span>
              <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
              <span className="text-xs text-blue-600">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".webm"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Track Information Table */}
          {tracks.length > 0 && (
            <Card>
              <CardBody>
                <Table aria-label="Track information table">
                  <TableHeader>
                    <TableColumn>Track #</TableColumn>
                    <TableColumn>Type</TableColumn>
                    <TableColumn>Codec</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Details</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {tracks.map((track) => (
                      <TableRow key={track.trackNumber}>
                        <TableCell>
                          <Badge color="primary" variant="flat">
                            {track.trackNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getTrackTypeColor(track.trackType)}
                            variant="flat"
                            size="sm"
                          >
                            {track.trackType}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getCodecColor(track.codecId)}
                            variant="flat"
                            size="sm"
                          >
                            {formatCodecName(track.codecId)}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{track.name || 'Unnamed'}</span>
                          {track.language && track.language !== 'und' && (
                            <div className="text-xs text-gray-500">
                              Language: {track.language.toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {track.videoInfo && (
                            <div className="text-sm">
                              <div>{track.videoInfo.width}×{track.videoInfo.height}</div>
                              {track.videoInfo.frameRate && (
                                <div className="text-gray-500">
                                  {track.videoInfo.frameRate} fps
                                </div>
                              )}
                            </div>
                          )}
                          {track.audioInfo && (
                            <div className="text-sm">
                              <div>{track.audioInfo.channels} channels</div>
                              <div className="text-gray-500">
                                {track.audioInfo.samplingFrequency} Hz
                                {track.audioInfo.bitDepth && `, ${track.audioInfo.bitDepth} bit`}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Summary Statistics */}
          {tracks.length > 0 && (
            <Card className="bg-blue-50">
              <CardBody>
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {tracks.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Tracks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {tracks.filter(t => t.trackType === 'VIDEO').length}
                    </div>
                    <div className="text-sm text-gray-600">Video Tracks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {tracks.filter(t => t.trackType === 'AUDIO').length}
                    </div>
                    <div className="text-sm text-gray-600">Audio Tracks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(tracks.map(t => t.codecId)).size}
                    </div>
                    <div className="text-sm text-gray-600">Codecs Used</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Instructions */}
          {tracks.length === 0 && (
            <Alert
              color="primary"
              title="Track Information"
              description="Load sample track data to see detailed information about WebM tracks including codec details, resolution, and audio parameters."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
