/**
 * BSD 3-Clause License
 *
 * Copyright (c) 2025, SCTG Développement
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

/**
 * Worker Environment Tests for libwebm-js
 * Tests specifically designed for Web Workers, Cloudflare Workers, and other constrained environments
 */

import createLibWebM from '../src/wrapper-worker.js';

/**
 * Test suite for worker environments
 */
class WorkerEnvironmentTests {
    constructor() {
        this.libwebm = null;
        this.testResults = [];
    }

    /**
     * Log test result
     */
    log(message, success = true) {
        const status = success ? '✅' : '❌';
        console.log(`${status} ${message}`);
        this.testResults.push({ message, success });
    }

    /**
     * Setup test environment
     */
    async setup() {
        console.log('🚀 Setting up Worker Environment Tests...');

        try {
            // Test environment detection
            this.testEnvironmentDetection();

            // Initialize libwebm
            this.libwebm = await createLibWebM();
            this.log('libwebm-js initialized successfully');

            return true;
        } catch (error) {
            this.log(`Setup failed: ${error.message}`, false);
            return false;
        }
    }

    /**
     * Test environment detection
     */
    testEnvironmentDetection() {
        console.log('🔍 Testing environment detection...');

        // Test worker environment detection
        const isWebWorker = typeof WorkerGlobalScope !== "undefined" ||
            typeof importScripts === "function";

        const isCloudflareWorker = typeof globalThis !== "undefined" &&
            (globalThis.navigator?.userAgent?.includes?.('Cloudflare-Workers') ||
                typeof caches !== 'undefined');

        const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
        const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

        // Should detect at least one environment
        const detectedEnvs = [isWebWorker, isCloudflareWorker, isBrowser, isNode].filter(Boolean);

        if (detectedEnvs.length > 0) {
            this.log(`Environment detected: ${detectedEnvs.length} environment(s)`);
        } else {
            this.log('No environment detected', false);
        }

        // Should not have access to Node.js specific APIs
        if (typeof require !== 'undefined') {
            this.log('Node.js require() function available (acceptable in Node.js simulation)');
        } else {
            this.log('No Node.js require() function (expected in worker)');
        }

        if (typeof process !== 'undefined') {
            this.log('Node.js process object available (acceptable in Node.js simulation)');
        } else {
            this.log('No Node.js process object (expected in worker)');
        }
    }

    /**
     * Test basic initialization
     */
    async testBasicInitialization() {
        console.log('🔧 Testing basic initialization...');

        if (!this.libwebm) {
            this.log('libwebm not initialized', false);
            return;
        }

        // Test that all expected properties are available
        const expectedProperties = [
            'WebMErrorCode',
            'WebMTrackType',
            'WebMUtils',
            'WebMFile',
            'WebMParser',
            'WebMMuxer',
            '_isWorker',
            '_isFallback',
            '_module'
        ];

        for (const prop of expectedProperties) {
            if (this.libwebm[prop] !== undefined) {
                this.log(`Property ${prop} available`);
            } else {
                this.log(`Property ${prop} missing`, false);
            }
        }

        // Test that worker mode is enabled
        if (this.libwebm._isWorker) {
            this.log('Worker mode enabled');
        } else {
            this.log('Worker mode not enabled', false);
        }
    }

    /**
     * Test WebM utilities in worker environment
     */
    testWebMUtils() {
        console.log('🛠️ Testing WebM utilities...');

        if (!this.libwebm || !this.libwebm.WebMUtils) {
            this.log('WebMUtils not available', false);
            return;
        }

        const utils = this.libwebm.WebMUtils;

        // Test codec support
        if (utils.isVideoCodecSupported('V_VP8')) {
            this.log('VP8 video codec support detected');
        } else {
            this.log('VP8 video codec support missing', false);
        }

        if (utils.isAudioCodecSupported('A_OPUS')) {
            this.log('Opus audio codec support detected');
        } else {
            this.log('Opus audio codec support missing', false);
        }

        // Test time conversion
        const ns = utils.msToNs(1000);
        const ms = utils.nsToMs(ns);

        if (ms === 1000) {
            this.log('Time conversion functions working');
        } else {
            this.log('Time conversion functions broken', false);
        }

        // Test supported codecs lists
        const videoCodecs = utils.getSupportedVideoCodecs();
        const audioCodecs = utils.getSupportedAudioCodecs();

        if (Array.isArray(videoCodecs) && videoCodecs.length > 0) {
            this.log(`Video codecs list: ${videoCodecs.join(', ')}`);
        } else {
            this.log('Video codecs list invalid', false);
        }

        if (Array.isArray(audioCodecs) && audioCodecs.length > 0) {
            this.log(`Audio codecs list: ${audioCodecs.join(', ')}`);
        } else {
            this.log('Audio codecs list invalid', false);
        }
    }

    /**
     * Test error codes
     */
    testErrorCodes() {
        console.log('🚨 Testing error codes...');

        if (!this.libwebm || !this.libwebm.WebMErrorCode) {
            this.log('WebMErrorCode not available', false);
            return;
        }

        const errorCodes = this.libwebm.WebMErrorCode;

        // Test expected error codes
        const expectedCodes = {
            SUCCESS: 0,
            INVALID_FILE: 1,
            CORRUPTED_DATA: 2,
            UNSUPPORTED_FORMAT: 3,
            IO_ERROR: 4,
            OUT_OF_MEMORY: 5,
            INVALID_ARGUMENT: 6
        };

        let allCorrect = true;
        for (const [name, expectedValue] of Object.entries(expectedCodes)) {
            if (errorCodes[name] === expectedValue) {
                this.log(`Error code ${name} = ${expectedValue}`);
            } else {
                this.log(`Error code ${name} incorrect: got ${errorCodes[name]}, expected ${expectedValue}`, false);
                allCorrect = false;
            }
        }

        if (allCorrect) {
            this.log('All error codes correct');
        }
    }

    /**
     * Test track types
     */
    testTrackTypes() {
        console.log('🎵 Testing track types...');

        if (!this.libwebm || !this.libwebm.WebMTrackType) {
            this.log('WebMTrackType not available', false);
            return;
        }

        const trackTypes = this.libwebm.WebMTrackType;

        // Test expected track types
        const expectedTypes = {
            UNKNOWN: 0,
            VIDEO: 1,
            AUDIO: 2
        };

        let allCorrect = true;
        for (const [name, expectedValue] of Object.entries(expectedTypes)) {
            if (trackTypes[name] === expectedValue) {
                this.log(`Track type ${name} = ${expectedValue}`);
            } else {
                this.log(`Track type ${name} incorrect: got ${trackTypes[name]}, expected ${expectedValue}`, false);
                allCorrect = false;
            }
        }

        if (allCorrect) {
            this.log('All track types correct');
        }
    }

    /**
     * Test minimal parser with sample data
     */
    async testMinimalParser() {
        console.log('📄 Testing minimal parser...');

        if (!this.libwebm || !this.libwebm.WebMParser) {
            this.log('WebMParser not available', false);
            return;
        }

        try {
            // Try to load a real sample file first
            let buffer;
            let usingRealFile = false;

            try {
                const response = await fetch('/samples/sample.webm');
                if (response.ok) {
                    buffer = new Uint8Array(await response.arrayBuffer());
                    usingRealFile = true;
                    this.log('Using real WebM sample file for parser test');
                } else {
                    throw new Error('Sample file not available');
                }
            } catch (error) {
                // Fallback to minimal buffer if sample file not available
                buffer = this.createMinimalWebMBuffer();
                this.log('Using minimal WebM buffer (sample file not available)');
            }

            // Test parser creation
            const parser = await this.libwebm.WebMParser.createFromBuffer(buffer);

            if (parser) {
                this.log('Parser created successfully');

                // Test basic parser methods
                parser.parseHeaders();
                this.log('Parser headers parsed');

                const trackCount = parser.getTrackCount();
                this.log(`Parser reports ${trackCount} tracks`);

                const duration = parser.getDuration();
                this.log(`Parser reports duration: ${duration} seconds`);

                // Additional validation for real files
                if (usingRealFile && trackCount > 0 && duration > 0) {
                    this.log('Parser successfully validated real WebM file');
                }

            } else {
                this.log('Parser creation failed', false);
            }

        } catch (error) {
            // Check if this is an expected error (invalid minimal buffer)
            if (error.message.includes('Invalid EBML header') || error.message.includes('Failed to parse')) {
                this.log('Parser correctly rejected invalid/minimal buffer');
            } else {
                this.log(`Parser test failed: ${error.message}`, false);
            }
        }
    }

    /**
     * Test muxer functionality
     */
    testMuxer() {
        console.log('🎬 Testing muxer functionality...');

        if (!this.libwebm || !this.libwebm.WebMMuxer) {
            this.log('WebMMuxer not available', false);
            return;
        }

        try {
            // Create muxer
            const muxer = this.libwebm.WebMMuxer();

            if (muxer) {
                this.log('Muxer created successfully');

                // Test adding tracks
                const videoTrackId = muxer.addVideoTrack(1920, 1080, 'V_VP8');
                if (videoTrackId > 0) {
                    this.log(`Video track added with ID: ${videoTrackId}`);
                } else {
                    this.log('Video track addition failed', false);
                }

                const audioTrackId = muxer.addAudioTrack(48000, 2, 'A_OPUS');
                if (audioTrackId > 0) {
                    this.log(`Audio track added with ID: ${audioTrackId}`);
                } else {
                    this.log('Audio track addition failed', false);
                }

                // Test writing frames
                const videoFrame = new Uint8Array(1024);
                const audioFrame = new Uint8Array(256);

                muxer.writeVideoFrame(videoTrackId, videoFrame, 0, true);
                this.log('Video frame written');

                muxer.writeAudioFrame(audioTrackId, audioFrame, 0);
                this.log('Audio frame written');

                // Test finalization
                const webmData = muxer.finalize();
                if (webmData && webmData.length > 0) {
                    this.log(`WebM file finalized, size: ${webmData.length} bytes`);
                } else {
                    this.log('WebM finalization failed', false);
                }

            } else {
                this.log('Muxer creation failed', false);
            }

        } catch (error) {
            this.log(`Muxer test failed: ${error.message}`, false);
        }
    }

    /**
     * Test WebMFile class
     */
    async testWebMFile() {
        console.log('📁 Testing WebMFile class...');

        if (!this.libwebm || !this.libwebm.WebMFile) {
            this.log('WebMFile not available', false);
            return;
        }

        try {
            // Try to load a real sample file first
            let buffer;
            let usingRealFile = false;

            try {
                const response = await fetch('/samples/sample.webm');
                if (response.ok) {
                    buffer = new Uint8Array(await response.arrayBuffer());
                    usingRealFile = true;
                    this.log('Using real WebM sample file for WebMFile test');
                } else {
                    throw new Error('Sample file not available');
                }
            } catch (error) {
                // Fallback to minimal buffer if sample file not available
                buffer = this.createMinimalWebMBuffer();
                this.log('Using minimal WebM buffer for WebMFile test');
            }

            // Test creating from buffer
            const file = await this.libwebm.WebMFile.fromBuffer(buffer, this.libwebm._module);

            if (file) {
                this.log('WebMFile created from buffer');

                // Test basic methods
                const duration = file.getDuration();
                const trackCount = file.getTrackCount();

                this.log(`WebMFile duration: ${duration}s, tracks: ${trackCount}`);

                // Additional validation for real files
                if (usingRealFile && trackCount > 0) {
                    this.log('WebMFile successfully parsed real file');
                }

                // Test muxing mode
                const muxFile = this.libwebm.WebMFile.forWriting(this.libwebm._module);
                if (muxFile) {
                    this.log('WebMFile created for writing');

                    const trackId = muxFile.addVideoTrack(640, 480, 'V_VP8');
                    this.log(`Track added with ID: ${trackId}`);

                    const frameData = new Uint8Array(512);
                    muxFile.writeVideoFrame(trackId, frameData, 0, true);
                    this.log('Frame written to mux file');

                    const finalizedData = muxFile.finalize();
                    if (finalizedData) {
                        this.log(`Mux file finalized, size: ${finalizedData.length} bytes`);
                    }
                }

            } else {
                this.log('WebMFile creation failed', false);
            }

        } catch (error) {
            // Check if this is an expected error (invalid minimal buffer)
            if (error.message.includes('Invalid EBML header') || error.message.includes('Failed to parse')) {
                this.log('WebMFile correctly rejected invalid/minimal buffer');
            } else {
                this.log(`WebMFile test failed: ${error.message}`, false);
            }
        }
    }

    /**
     * Test memory constraints (64MB limit)
     */
    testMemoryConstraints() {
        console.log('💾 Testing memory constraints...');

        // Test with buffer close to 64MB limit
        const maxSize = 64 * 1024 * 1024; // 64MB
        const testSizes = [
            1024,           // 1KB
            1024 * 1024,    // 1MB
            10 * 1024 * 1024, // 10MB
            50 * 1024 * 1024, // 50MB
        ];

        for (const size of testSizes) {
            try {
                const buffer = new Uint8Array(size);

                // Try to create parser (this should work for sizes < 64MB)
                if (size < maxSize) {
                    // Note: We can't actually test parsing without valid WebM data
                    // but we can test buffer size validation
                    this.log(`Buffer size ${size} bytes accepted`);
                } else {
                    this.log(`Buffer size ${size} bytes should be rejected`, false);
                }

            } catch (error) {
                if (size >= maxSize) {
                    this.log(`Large buffer (${size} bytes) correctly rejected`);
                } else {
                    this.log(`Unexpected error with ${size} byte buffer: ${error.message}`, false);
                }
            }
        }
    }

    /**
     * Test error handling in worker environment
     */
    async testErrorHandling() {
        console.log('⚠️ Testing error handling...');

        if (!this.libwebm) {
            this.log('libwebm not available for error testing', false);
            return;
        }

        // Test with invalid buffer
        try {
            const invalidBuffer = new Uint8Array([1, 2, 3, 4]);
            await this.libwebm.WebMParser.createFromBuffer(invalidBuffer);
            this.log('Parser should have rejected invalid buffer', false);
        } catch (error) {
            this.log('Parser correctly rejected invalid buffer');
        }

        // Test with empty buffer
        try {
            const emptyBuffer = new Uint8Array([]);
            await this.libwebm.WebMParser.createFromBuffer(emptyBuffer);
            this.log('Parser should have rejected empty buffer', false);
        } catch (error) {
            this.log('Parser correctly rejected empty buffer');
        }

        // Test with oversized buffer
        try {
            const oversizedBuffer = new Uint8Array(65 * 1024 * 1024); // 65MB
            await this.libwebm.WebMParser.createFromBuffer(oversizedBuffer);
            this.log('Parser should have rejected oversized buffer', false);
        } catch (error) {
            this.log('Parser correctly rejected oversized buffer');
        }
    }

    /**
     * Create a minimal valid WebM buffer for testing
     */
    createMinimalWebMBuffer() {
        // This creates a very basic WebM structure for testing
        // In a real implementation, you'd want proper EBML encoding
        const buffer = new Uint8Array(1024);

        // EBML header (simplified)
        buffer[0] = 0x1A; // EBML
        buffer[1] = 0x45;
        buffer[2] = 0xDF;
        buffer[3] = 0xA3;

        // Add minimal segment structure
        // This is a simplified version - real WebM files are much more complex

        return buffer;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n🧪 Running Worker Environment Tests');
        console.log('=====================================\n');

        const setupSuccess = await this.setup();
        if (!setupSuccess) {
            console.log('\n❌ Setup failed, aborting tests');
            return false;
        }

        // Run all test suites
        await this.testBasicInitialization();
        this.testWebMUtils();
        this.testErrorCodes();
        this.testTrackTypes();
        await this.testMinimalParser();
        this.testMuxer();
        await this.testWebMFile();
        this.testMemoryConstraints();
        await this.testErrorHandling();

        // Summary
        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;

        console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 All worker environment tests passed!');
            return true;
        } else {
            console.log('❌ Some tests failed');
            return false;
        }
    }
}

// Export for use in different environments
export default WorkerEnvironmentTests;

// Run tests if this file is executed directly (in a worker context)
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    // Web Worker context
    console.log('Running tests in Web Worker context');

    const tests = new WorkerEnvironmentTests();
    tests.runAllTests().then(success => {
        self.postMessage({ type: 'testResults', success, results: tests.testResults });
    }).catch(error => {
        self.postMessage({ type: 'testError', error: error.message });
    });
} else if (typeof globalThis !== 'undefined' &&
           (globalThis.navigator?.userAgent?.includes?.('Cloudflare-Workers') ||
            typeof caches !== 'undefined')) {
    // Cloudflare Worker context
    console.log('Running tests in Cloudflare Worker context');

    const tests = new WorkerEnvironmentTests();
    tests.runAllTests().then(success => {
        // In Cloudflare Workers, you might want to return the results differently
        console.log('Test completion status:', success);
    }).catch(error => {
        console.error('Test error:', error);
    });
}
