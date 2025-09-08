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

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
    Alert,
} from '@heroui/alert';

// Import libwebm-js
import createLibWebM from '@sctg/libwebm-js';

/**
 * Props for the WebMFileParser component
 */
interface WebMFileParserProps {
  /** Callback function called when an error occurs */
  onError: (error: string) => void;
  /** Callback function called when loading state changes */
  onLoading: (loading: boolean) => void;
  /** Callback function to clear error state */
  onClearError: () => void;
}

/**
 * Component for parsing WebM files and displaying basic information
 * Allows users to upload WebM files and see parsing results
 */
export const WebMFileParser: React.FC<WebMFileParserProps> = ({
  onError,
  onLoading,
  onClearError
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [parseResult, setParseResult] = useState<{
    duration?: number;
    trackCount?: number;
    parsed: boolean;
  } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [libwebm, setLibwebm] = useState<any>(null);
  const [isLibwebmLoading, setIsLibwebmLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize libwebm-js on component mount
  useEffect(() => {
    const initializeLibWebM = async () => {
      try {
        setIsLibwebmLoading(true);
        const libwebmInstance = await createLibWebM();
        setLibwebm(libwebmInstance);
        setIsLibwebmLoading(false);
      } catch (error) {
        onError(`Failed to initialize libwebm-js: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLibwebmLoading(false);
      }
    };

    initializeLibWebM();
  }, [onError]);

  /**
   * Handles file selection from the input
   * @param event - The file input change event
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith('.webm')) {
        onError('Please select a valid WebM file (.webm extension)');
        return;
      }

      setFile(selectedFile);
      setFileInfo({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || 'application/octet-stream'
      });
      setParseResult(null);
      onClearError();
    }
  }, [onError, onClearError]);

  /**
   * Parses the selected WebM file using libwebm-js
   * Uses the real libwebm-js library for actual parsing
   */
  const handleParseFile = useCallback(async () => {
    if (!file || !libwebm) return;

    setIsParsing(true);
    onLoading(true);
    onClearError();

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Parse WebM file using libwebm-js
      const webmFile = await libwebm.WebMFile.fromBuffer(buffer, libwebm);

      // Get file information
      const duration = webmFile.getDuration();
      const trackCount = webmFile.getTrackCount();

      setParseResult({
        duration,
        trackCount,
        parsed: true
      });

      onLoading(false);
    } catch (error) {
      onError(`Failed to parse WebM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsParsing(false);
      onLoading(false);
    }
  }, [file, libwebm, onError, onLoading, onClearError]);

  /**
   * Clears the current file selection and results
   */
  const handleClearFile = useCallback(() => {
    setFile(null);
    setFileInfo(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClearError();
  }, [onClearError]);

  /**
   * Formats file size in human-readable format
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">WebM File Parser</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select WebM File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".webm"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {/* File Information */}
          {fileInfo && (
            <Card className="bg-gray-50">
              <CardBody>
                <h4 className="font-semibold mb-2">File Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{fileInfo.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Size:</span>
                    <p className="font-medium">{formatFileSize(fileInfo.size)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Type:</span>
                    <p className="font-medium">{fileInfo.type}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Action Buttons */}
          {file && (
            <div className="flex gap-2">
              <Button
                color="primary"
                onClick={handleParseFile}
                isLoading={isParsing}
                disabled={isParsing || isLibwebmLoading || !libwebm}
              >
                {isParsing ? 'Parsing...' : 'Parse File'}
              </Button>
              <Button
                color="secondary"
                variant="flat"
                onClick={handleClearFile}
                disabled={isParsing}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Library Loading State */}
          {isLibwebmLoading && (
            <Alert
              color="warning"
              title="Loading libwebm-js"
              description="Initializing WebAssembly module..."
            />
          )}

          {/* Parsing Progress */}
          {isParsing && (
            <div className="space-y-2">
              <Progress
                size="md"
                isIndeterminate
                color="primary"
                className="w-full"
              />
              <p className="text-sm text-gray-600 text-center">
                Parsing WebM file with libwebm-js...
              </p>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && (
            <Card className="bg-green-50 border-green-200">
              <CardBody>
                <div className="flex items-center gap-2 mb-4">
                  <Chip color="success" variant="flat">
                    ✓ Parsed Successfully
                  </Chip>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Duration:</span>
                    <p className="font-medium">{parseResult.duration?.toFixed(2)} seconds</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Track Count:</span>
                    <p className="font-medium">{parseResult.trackCount} tracks</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Instructions */}
          {!file && (
            <Alert
              color="primary"
              title="Getting Started"
              description="Select a WebM file to begin parsing. The parser will extract metadata and track information from the file."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
