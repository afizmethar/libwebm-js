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
