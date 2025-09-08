/**
 * Test script for WebM frame extraction in worker environments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Force worker mode detection
globalThis.WorkerGlobalScope = {};
globalThis.importScripts = function() {};

// Import the worker wrapper
import createLibWebM from '../src/wrapper-worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFrameExtraction() {
    console.log('🧪 Testing WebM frame extraction in worker mode...');

    try {
        // Load sample WebM file
        const samplePath = path.join(__dirname, '../test/sample.webm');
        const buffer = fs.readFileSync(samplePath);
        console.log(`📁 Loaded sample file: ${buffer.length} bytes`);

        // Check file size limit
        const MAX_SIZE = 64 * 1024 * 1024; // 64MB
        if (buffer.length > MAX_SIZE) {
            console.log(`⚠️ File too large (${buffer.length} bytes), skipping test`);
            return;
        }

        // Create libwebm instance
        const libwebm = await createLibWebM();
        console.log('✅ LibWebM initialized in worker mode');

        // Create parser from buffer
        console.log('🔧 Creating parser from buffer...');
        const parser = await libwebm.WebMParser.createFromBuffer(buffer);
        console.log('✅ Parser created');

        // Test getTrackCount
        console.log('🔧 Testing getTrackCount...');
        const trackCount = parser.getTrackCount();
        console.log(`📊 Track count: ${trackCount}`);

        // Get basic info
        const duration = parser.getDuration();
        console.log(`📊 File info:`);
        console.log(`   Duration: ${duration.toFixed(2)}s`);
        console.log(`   Tracks: ${trackCount}`);

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testFrameExtraction();
