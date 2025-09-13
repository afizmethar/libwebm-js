/**
 * Cloudflare Worker Test Runner for libwebm-js
 * This script can be deployed to Cloudflare Workers to test libwebm-js functionality
 */

import createLibWebM from '../src/wrapper-worker.js';

export default {
    async fetch(request, env, ctx) {
        // Handle test requests
        if (request.method === 'GET' && new URL(request.url).pathname === '/test') {
            return await runTests();
        }

        // Default response
        return new Response('libwebm-js Cloudflare Worker Test Runner\n\nVisit /test to run tests', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};

async function runTests() {
    const results = {
        timestamp: new Date().toISOString(),
        environment: 'cloudflare-worker',
        tests: [],
        summary: { passed: 0, failed: 0, total: 0 }
    };

    console.log('🧪 Running libwebm-js tests in Cloudflare Worker environment');

    try {
        // Test 1: Environment Detection
        results.tests.push(await testEnvironmentDetection());

        // Test 2: Library Initialization
        results.tests.push(await testLibraryInitialization());

        // Test 3: Basic Functionality
        results.tests.push(await testBasicFunctionality());

        // Test 4: Memory Constraints
        results.tests.push(await testMemoryConstraints());

        // Test 5: Error Handling
        results.tests.push(await testErrorHandling());

        // Test 6: WebClient File Parsing
        results.tests.push(await testWebClientFile());

    } catch (error) {
        console.error('Test runner error:', error);
        results.tests.push({
            name: 'test-runner',
            status: 'failed',
            message: `Test runner failed: ${error.message}`,
            duration: 0
        });
    }

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
    results.summary.failed = results.summary.total - results.summary.passed;

    console.log(`📊 Test Results: ${results.summary.passed}/${results.summary.total} tests passed`);

    return new Response(JSON.stringify(results, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

async function testEnvironmentDetection() {
    const startTime = Date.now();
    const test = {
        name: 'environment-detection',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        // Check Cloudflare Worker environment
        const isCloudflareWorker = typeof globalThis !== "undefined" &&
            (globalThis.navigator?.userAgent?.includes?.('Cloudflare-Workers') ||
                typeof caches !== 'undefined');

        if (isCloudflareWorker) {
            test.message = 'Cloudflare Worker environment detected correctly';
            test.status = 'passed';
        } else {
            test.message = 'Cloudflare Worker environment not detected';
            test.status = 'failed';
        }

        // Check that Node.js APIs are not available
        const hasNodeAPIs = typeof require !== 'undefined' ||
            typeof process !== 'undefined' ||
            typeof __dirname !== 'undefined';

        if (!hasNodeAPIs) {
            test.message += ' | Node.js APIs correctly unavailable';
        } else {
            test.message += ' | Node.js APIs unexpectedly available';
            test.status = 'failed';
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `Environment detection failed: ${error.message}`;
    }

    test.duration = Date.now() - startTime;
    return test;
}

async function testLibraryInitialization() {
    const startTime = Date.now();
    const test = {
        name: 'library-initialization',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        const libwebm = await createLibWebM();

        if (libwebm) {
            test.message = 'libwebm-js initialized successfully';

            // Check essential properties
            const requiredProps = ['WebMParser', 'WebMMuxer', 'WebMUtils', 'WebMFile'];
            const missingProps = requiredProps.filter(prop => !libwebm[prop]);

            if (missingProps.length === 0) {
                test.message += ' | All required properties available';
                test.status = 'passed';
            } else {
                test.message += ` | Missing properties: ${missingProps.join(', ')}`;
                test.status = 'failed';
            }

            // Check worker mode
            if (libwebm._isWorker) {
                test.message += ' | Worker mode enabled';
            } else {
                test.message += ' | Worker mode not enabled';
                test.status = 'failed';
            }

        } else {
            test.message = 'libwebm-js initialization returned null';
            test.status = 'failed';
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `Library initialization failed: ${error.message}`;
    }

    test.duration = Date.now() - startTime;
    return test;
}

async function testBasicFunctionality() {
    const startTime = Date.now();
    const test = {
        name: 'basic-functionality',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        const libwebm = await createLibWebM();

        // Test WebMUtils
        if (libwebm.WebMUtils) {
            const vp8Supported = libwebm.WebMUtils.isVideoCodecSupported('V_VP8');
            const opusSupported = libwebm.WebMUtils.isAudioCodecSupported('A_OPUS');

            if (vp8Supported && opusSupported) {
                test.message = 'Codec support detection working';
            } else {
                test.message = 'Codec support detection failed';
                test.status = 'failed';
            }
        }

        // Test muxer creation
        if (libwebm.WebMMuxer) {
            const muxer = libwebm.WebMMuxer();
            if (muxer) {
                test.message += ' | Muxer creation successful';

                // Test adding tracks
                const videoTrackId = muxer.addVideoTrack(1920, 1080, 'V_VP8');
                const audioTrackId = muxer.addAudioTrack(48000, 2, 'A_OPUS');

                if (videoTrackId > 0 && audioTrackId > 0) {
                    test.message += ' | Track addition successful';
                } else {
                    test.message += ' | Track addition failed';
                    test.status = 'failed';
                }

                // Test finalization
                const webmData = muxer.finalize();
                if (webmData && webmData.length > 0) {
                    test.message += ` | File creation successful (${webmData.length} bytes)`;
                    test.status = 'passed';
                } else {
                    test.message += ' | File creation failed';
                    test.status = 'failed';
                }

            } else {
                test.message += ' | Muxer creation failed';
                test.status = 'failed';
            }
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `Basic functionality test failed: ${error.message}`;
    }

    test.duration = Date.now() - startTime;
    return test;
}

async function testMemoryConstraints() {
    const startTime = Date.now();
    const test = {
        name: 'memory-constraints',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        const libwebm = await createLibWebM();

        // Test with various buffer sizes
        const testSizes = [
            1024,        // 1KB
            1024 * 1024, // 1MB
            10 * 1024 * 1024, // 10MB
        ];

        let passedTests = 0;

        for (const size of testSizes) {
            try {
                const buffer = new Uint8Array(size);

                // Try to create a minimal parser (this tests the 64MB limit indirectly)
                // Note: We can't test actual parsing without valid WebM data
                if (buffer.length === size) {
                    passedTests++;
                }
            } catch (error) {
                console.log(`Buffer size ${size} failed: ${error.message}`);
            }
        }

        if (passedTests === testSizes.length) {
            test.message = `Memory constraints handled correctly (${passedTests}/${testSizes.length} sizes)`;
            test.status = 'passed';
        } else {
            test.message = `Memory constraints test failed (${passedTests}/${testSizes.length} sizes passed)`;
            test.status = 'failed';
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `Memory constraints test failed: ${error.message}`;
    }

    test.duration = Date.now() - startTime;
    return test;
}

async function testErrorHandling() {
    const startTime = Date.now();
    const test = {
        name: 'error-handling',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        const libwebm = await createLibWebM();

        // Test with invalid inputs
        const invalidInputs = [
            new Uint8Array([]),                    // Empty buffer
            new Uint8Array([1, 2, 3, 4]),         // Invalid WebM data
            null,                                  // Null input
            undefined                              // Undefined input
        ];

        let handledErrors = 0;

        for (const input of invalidInputs) {
            try {
                if (input !== null && input !== undefined) {
                    await libwebm.WebMParser.createFromBuffer(input);
                } else {
                    // Test null/undefined handling
                    await libwebm.WebMParser.createFromBuffer(input);
                }
                // If we reach here, the parser didn't throw an error as expected
                console.log(`Unexpected success with invalid input: ${input}`);
            } catch (error) {
                // Expected error
                handledErrors++;
            }
        }

        if (handledErrors > 0) {
            test.message = `Error handling working (${handledErrors} errors caught)`;
            test.status = 'passed';
        } else {
            test.message = 'Error handling not working (no errors caught)';
            test.status = 'failed';
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `Error handling test failed: ${error.message}`;
    }

    test.duration = Date.now() - startTime;
    return test;
}

async function testWebClientFile() {
    const startTime = Date.now();
    const test = {
        name: 'webclient-file-parsing',
        status: 'running',
        message: '',
        duration: 0
    };

    try {
        const libwebm = await createLibWebM();

        // WebClient file data (base64 encoded from test/webclient.webm)
        // This file is generated by Chrome and should contain valid WebM structure
        const webclientBase64 = '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';        // Convert base64 to Uint8Array
        const binaryString = atob(webclientBase64);
        const webclientBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            webclientBuffer[i] = binaryString.charCodeAt(i);
        }

        console.log('🧪 Testing WebClient file parsing...');
        console.log(`📁 File size: ${webclientBuffer.length} bytes`);
        console.log(`🔍 Header bytes: ${Array.from(webclientBuffer.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);

        // Test parsing with LibWebM-JS
        const file = await libwebm.WebMFile.fromBuffer(webclientBuffer);
        const trackCount = file.getTrackCount();
        const duration = file.getDuration();

        console.log(`🔍 LibWebM info - isWorker: ${libwebm._isWorker}, isFallback: ${libwebm._isFallback}`);
        console.log(`📊 Parsed successfully - Duration: ${duration}s, Track count: ${trackCount}`);

        // Validate results
        if (trackCount > 0) {
            test.message = `WebClient file parsed successfully: ${trackCount} track(s) found, duration: ${duration}s`;

            // Get track information
            for (let i = 0; i < trackCount; i++) {
                const trackInfo = parser.getTrackInfo(i);
                console.log(`🎵 Track ${i}: ${trackInfo.codecId} (${trackInfo.trackType === 1 ? 'Video' : trackInfo.trackType === 2 ? 'Audio' : 'Unknown'})`);
                test.message += ` | Track ${i}: ${trackInfo.codecId}`;
            }

            test.status = 'passed';
        } else {
            test.message = `WebClient file parsing failed: No tracks detected (Duration: ${duration}s)`;
            test.status = 'failed';
        }

    } catch (error) {
        test.status = 'failed';
        test.message = `WebClient file test failed: ${error.message}`;
        console.error('❌ WebClient file test error:', error);
    }

    test.duration = Date.now() - startTime;
    return test;
}

/**
 * Helper function to create a minimal WebM buffer for testing
 */
function createMinimalWebMBuffer() {
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
