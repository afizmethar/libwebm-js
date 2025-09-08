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

// Import libwebm-js
import createLibWebM from '@sctg/libwebm-js';


/**
 * Props for the PerformanceTester component
 */
interface PerformanceTesterProps {
  /** Callback function called when an error occurs */
  onError: (error: string) => void;
  /** Callback function called when loading state changes */
  onLoading: (loading: boolean) => void;
}

/**
 * Represents the result of a performance test
 */
interface PerformanceResult {
  /** Test name */
  testName: string;
  /** Duration in milliseconds */
  duration: number;
  /** Number of operations performed */
  operations: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Memory usage in MB (if available) */
  memoryUsage?: number;
}

/**
 * Component for testing and demonstrating the performance of libwebm-js operations
 * Measures parsing speed, frame extraction performance, and memory usage
 */
export const PerformanceTester: React.FC<PerformanceTesterProps> = ({
  onError,
  onLoading
}) => {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [libwebm, setLibwebm] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize libwebm-js on component mount
  useEffect(() => {
    const initializeLibWebM = async () => {
      try {
        setIsInitializing(true);
        const libwebmInstance = await createLibWebM();
        setLibwebm(libwebmInstance);
      } catch (error) {
        onError(`Failed to initialize libwebm-js: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeLibWebM();
  }, [onError]);

  /**
   * Runs a comprehensive performance test suite
   */
  const runPerformanceTests = useCallback(async () => {
    if (!libwebm) {
      onError('Performance test failed: libwebm-js not initialized');
      return;
    }

    setIsRunning(true);
    setResults([]);
    onLoading(true);

    try {
      const testResults: PerformanceResult[] = [];

      // Test 1: File Parsing Performance
      setCurrentTest('File Parsing');
      const parseResult = await testFileParsing();
      testResults.push(parseResult);

      // Test 2: Frame Extraction Performance
      setCurrentTest('Frame Extraction');
      const frameResult = await testFrameExtraction();
      testResults.push(frameResult);

      // Test 3: Memory Usage Test
      setCurrentTest('Memory Usage');
      const memoryResult = await testMemoryUsage();
      testResults.push(memoryResult);

      // Test 4: Concurrent Operations
      setCurrentTest('Concurrent Operations');
      const concurrentResult = await testConcurrentOperations();
      testResults.push(concurrentResult);

      setResults(testResults);
      setCurrentTest('');
      onLoading(false);
    } catch (error) {
      onError(`Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      onLoading(false);
    }
  }, [onError, onLoading, libwebm]);

  /**
   * Tests file parsing performance using real libwebm-js
   */
  const testFileParsing = async (): Promise<PerformanceResult> => {
    if (!libwebm) {
      throw new Error('libwebm-js not initialized');
    }

    const iterations = 10;
    const startTime = performance.now();

    // Load sample WebM file
    const response = await fetch(`${__BASE_PATH__}/samples/sample.webm`);
    if (!response.ok) {
      throw new Error(`Failed to load sample file: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse the file multiple times to measure performance
    for (let i = 0; i < iterations; i++) {
      const parser = await libwebm.WebMParser.createFromBuffer(buffer);
      parser.parseHeaders();
      // Access some properties to ensure parsing is complete
      parser.getTrackCount();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Get memory usage if available
    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : undefined;

    return {
      testName: 'File Parsing',
      duration,
      operations: iterations,
      opsPerSecond: (iterations / duration) * 1000,
      memoryUsage
    };
  };

  /**
   * Tests frame extraction performance using real libwebm-js
   */
  const testFrameExtraction = async (): Promise<PerformanceResult> => {
    if (!libwebm) {
      throw new Error('libwebm-js not initialized');
    }

    // Load sample WebM file
    const response = await fetch(`${__BASE_PATH__}/samples/sample.webm`);
    if (!response.ok) {
      throw new Error(`Failed to load sample file: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Create parser directly from buffer
    const parser = await libwebm.WebMParser.createFromBuffer(buffer);
    parser.parseHeaders();

    // Find the first video track
    const trackCount = parser.getTrackCount();
    let videoTrackIndex = -1;
    for (let i = 0; i < trackCount; i++) {
      const trackInfo = parser.getTrackInfo(i);
      if (trackInfo.trackType === 1) { // VIDEO
        videoTrackIndex = i;
        break;
      }
    }

    if (videoTrackIndex === -1) {
      throw new Error('No video track found in sample file');
    }

    const startTime = performance.now();

    let frameCount = 0;
    const maxFrames = 100;
    let frame: any = null;

    // Extract frames using readNextVideoFrame
    do {
      frame = parser.readNextVideoFrame(videoTrackIndex);
      if (frame) {
        frameCount++;
      }
    } while (frame && frameCount < maxFrames);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : undefined;

    return {
      testName: 'Frame Extraction',
      duration,
      operations: frameCount,
      opsPerSecond: (frameCount / duration) * 1000,
      memoryUsage
    };
  };

  /**
   * Tests memory usage during libwebm-js operations
   */
  const testMemoryUsage = async (): Promise<PerformanceResult> => {
    if (!libwebm) {
      throw new Error('libwebm-js not initialized');
    }

    const startTime = performance.now();
    const operations = 50;
    const parsers: any[] = [];

    // Load and parse multiple WebM files to test memory usage
    for (let i = 0; i < operations; i++) {
      const response = await fetch(`${__BASE_PATH__}/samples/sample.webm`);
      if (!response.ok) {
        throw new Error(`Failed to load sample file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const parser = await libwebm.WebMParser.createFromBuffer(buffer);
      parser.parseHeaders();
      parsers.push(parser);

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Clean up to test garbage collection
    parsers.length = 0;

    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : undefined;

    return {
      testName: 'Memory Usage',
      duration,
      operations,
      opsPerSecond: (operations / duration) * 1000,
      memoryUsage
    };
  };

  /**
   * Tests concurrent operations performance with libwebm-js
   */
  const testConcurrentOperations = async (): Promise<PerformanceResult> => {
    if (!libwebm) {
      throw new Error('libwebm-js not initialized');
    }

    const concurrentTasks = 5;
    const operationsPerTask = 20;
    const startTime = performance.now();

    // Run concurrent WebM parsing operations
    const promises = Array(concurrentTasks).fill(null).map(async () => {
      let operations = 0;

      for (let i = 0; i < operationsPerTask; i++) {
        const response = await fetch(`${__BASE_PATH__}/samples/sample.webm`);
        if (!response.ok) {
          throw new Error(`Failed to load sample file: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const parser = await libwebm.WebMParser.createFromBuffer(buffer);
        parser.parseHeaders();
        // Perform some operations on the file
        parser.getTrackCount();

        operations++;
        await new Promise(resolve => setTimeout(resolve, 15));
      }

      return operations;
    });

    const results = await Promise.all(promises);
    const totalOperations = results.reduce((sum, ops) => sum + ops, 0);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : undefined;

    return {
      testName: 'Concurrent Operations',
      duration,
      operations: totalOperations,
      opsPerSecond: (totalOperations / duration) * 1000,
      memoryUsage
    };
  };

  /**
   * Clears the performance test results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentTest('');
  }, []);

  /**
   * Formats duration in human-readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Formats operations per second
   * @param ops - Operations per second
   * @returns Formatted ops/sec string
   */
  const formatOpsPerSecond = (ops: number): string => {
    if (ops < 1000) return `${ops.toFixed(1)}/s`;
    return `${(ops / 1000).toFixed(1)}K/s`;
  };

  /**
   * Gets performance rating based on ops per second
   * @param opsPerSecond - Operations per second
   * @returns Performance rating
   */
  const getPerformanceRating = (opsPerSecond: number): "excellent" | "good" | "average" | "poor" => {
    if (opsPerSecond > 1000) return "excellent";
    if (opsPerSecond > 500) return "good";
    if (opsPerSecond > 100) return "average";
    return "poor";
  };

  /**
   * Gets color for performance rating
   * @param rating - Performance rating
   * @returns Color variant
   */
  const getRatingColor = (rating: string): "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (rating) {
      case "excellent": return "success";
      case "good": return "primary";
      case "average": return "warning";
      case "poor": return "danger";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Performance Testing</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Test Controls */}
          <div className="flex gap-2">
            <Button
              color="primary"
              onClick={runPerformanceTests}
              isLoading={isRunning}
              disabled={isRunning || isInitializing || !libwebm}
            >
              {isRunning ? 'Running Tests...' : isInitializing ? 'Initializing...' : 'Run Performance Tests'}
            </Button>
            {results.length > 0 && (
              <Button
                color="secondary"
                variant="flat"
                onClick={clearResults}
                disabled={isRunning}
              >
                Clear Results
              </Button>
            )}
          </div>

          {/* Initialization Status */}
          {isInitializing && (
            <div className="space-y-2">
              <Progress
                size="md"
                isIndeterminate
                color="secondary"
                className="w-full"
              />
              <p className="text-sm text-gray-600 text-center">
                Initializing libwebm-js...
              </p>
            </div>
          )}

          {/* Current Test Progress */}
          {isRunning && currentTest && (
            <div className="space-y-2">
              <Progress
                size="md"
                isIndeterminate
                color="primary"
                className="w-full"
              />
              <p className="text-sm text-gray-600 text-center">
                Running: {currentTest}
              </p>
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <Card>
              <CardBody>
                <h4 className="font-semibold mb-4">Performance Results</h4>
                <Table aria-label="Performance results table">
                  <TableHeader>
                    <TableColumn>Test</TableColumn>
                    <TableColumn>Duration</TableColumn>
                    <TableColumn>Operations</TableColumn>
                    <TableColumn>Performance</TableColumn>
                    <TableColumn>Memory</TableColumn>
                    <TableColumn>Rating</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium">{result.testName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatDuration(result.duration)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge color="primary" variant="flat">
                            {result.operations}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatOpsPerSecond(result.opsPerSecond)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {result.memoryUsage && (
                            <span className="font-mono text-sm">
                              {result.memoryUsage.toFixed(1)} MB
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getRatingColor(getPerformanceRating(result.opsPerSecond))}
                            variant="flat"
                            size="sm"
                          >
                            {getPerformanceRating(result.opsPerSecond).toUpperCase()}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Summary Statistics */}
          {results.length > 0 && (
            <Card className="bg-blue-50">
              <CardBody>
                <h4 className="font-semibold mb-3">Summary Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.length}
                    </div>
                    <div className="text-sm text-gray-600">Tests Run</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDuration(results.reduce((sum, r) => sum + r.duration, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.reduce((sum, r) => sum + r.operations, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Operations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.filter(r => getPerformanceRating(r.opsPerSecond) === "excellent").length}
                    </div>
                    <div className="text-sm text-gray-600">Excellent Results</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Average performance:</span>
                      <span className="font-medium ml-2">
                        {formatOpsPerSecond(results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Peak memory usage:</span>
                      <span className="font-medium ml-2">
                        {Math.max(...results.map(r => r.memoryUsage || 0)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Instructions */}
          {results.length === 0 && !isRunning && (
            <Alert
              color="primary"
              title="Performance Testing"
              description="Run comprehensive performance tests to measure libwebm-js parsing speed, frame extraction performance, memory usage, and concurrent operation capabilities."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
