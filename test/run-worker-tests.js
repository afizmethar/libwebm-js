#!/usr/bin/env node

/**
 * Node.js Worker Environment Simulator for libwebm-js Tests
 * Simulates a worker environment in Node.js for testing purposes
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Simulate worker environment globals (only define if not already present)
if (typeof global.WorkerGlobalScope === 'undefined') {
    global.WorkerGlobalScope = undefined;
}
if (typeof global.importScripts === 'undefined') {
    global.importScripts = undefined;
}
if (typeof global.self === 'undefined') {
    global.self = global;
}
if (typeof global.caches === 'undefined') {
    global.caches = undefined;
}

// Simulate navigator for Cloudflare Workers detection
try {
    // Try to define navigator property
    Object.defineProperty(global, 'navigator', {
        value: {
            userAgent: 'Cloudflare-Workers'
        },
        writable: false,
        configurable: true
    });
} catch (e) {
    // If we can't define navigator, try to modify existing one
    try {
        if (global.navigator && typeof global.navigator === 'object') {
            // Create a proxy to intercept userAgent access
            global.navigator = new Proxy(global.navigator, {
                get(target, prop) {
                    if (prop === 'userAgent') {
                        return 'Cloudflare-Workers';
                    }
                    return target[prop];
                }
            });
        }
    } catch (e2) {
        console.warn('⚠️ Could not simulate navigator for Cloudflare Workers detection');
        console.warn('Some Cloudflare Worker specific tests may not work correctly');
    }
}

// Mock fetch for testing (if needed)
global.fetch = async (url) => {
    if (typeof url === 'string' && url.startsWith('/samples/')) {
        // Mock sample file fetch
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const samplePath = join(__dirname, '..', 'demo', 'public', url);

            const buffer = readFileSync(samplePath);
            return {
                ok: true,
                arrayBuffer: async () => buffer
            };
        } catch (error) {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
        }
    }

    throw new Error(`Unsupported fetch URL: ${url}`);
};

// Mock performance API
global.performance = {
    now: () => Date.now(),
    memory: {
        usedJSHeapSize: 1024 * 1024, // 1MB
        totalJSHeapSize: 10 * 1024 * 1024, // 10MB
        jsHeapSizeLimit: 64 * 1024 * 1024 // 64MB
    }
};

// Import and run tests
async function runWorkerTests() {
    console.log('🚀 Starting libwebm-js Worker Environment Tests (Node.js simulation)');
    console.log('=================================================================\n');

    try {
        // Check if test file exists
        const { readFileSync } = await import('fs');
        const { fileURLToPath } = await import('url');
        const { dirname, join } = await import('path');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const testFilePath = join(__dirname, 'worker-environment-tests.js');

        try {
            readFileSync(testFilePath);
        } catch (error) {
            console.error(`❌ Test file not found: ${testFilePath}`);
            console.error('Please ensure worker-environment-tests.js exists in the test directory');
            process.exit(1);
        }

        // Dynamically import the test suite
        const { default: WorkerEnvironmentTests } = await import('./worker-environment-tests.js');

        const tests = new WorkerEnvironmentTests();
        const success = await tests.runAllTests();

        console.log(`\n${success ? '🎉' : '❌'} Worker tests ${success ? 'completed successfully' : 'failed'}`);

        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('❌ Failed to run worker tests:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
libwebm-js Worker Environment Test Runner

Usage:
  node run-worker-tests.js [options]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose output
  --json              Output results as JSON
  --filter <pattern>  Run only tests matching pattern

Examples:
  node run-worker-tests.js
  node run-worker-tests.js --verbose
  node run-worker-tests.js --filter "parser"
`);
    process.exit(0);
}

if (args.includes('--json')) {
    // JSON output mode would require modifying the test suite
    console.log('JSON output mode not yet implemented');
    process.exit(1);
}

// Run the tests
runWorkerTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
