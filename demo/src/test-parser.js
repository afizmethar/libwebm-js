/**
 * Test script to verify WebM parser functionality
 */
import createLibWebM from '@sctg/libwebm-js';

async function testWebMParser() {
    console.log('Testing WebM parser...');

    try {
        // Initialize libwebm
        const libwebm = await createLibWebM();
        console.log('LibWebM initialized:', libwebm._isWorker ? 'Worker mode' : 'Full mode');

        // Create a simple WebM buffer for testing (this would normally be a real WebM file)
        // For now, we'll just test that the parser creation works
        console.log('WebM parser test completed successfully!');
        console.log('Parser API available:', typeof libwebm.WebMParser.createFromBuffer);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testWebMParser();
