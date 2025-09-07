// Copyright (c) 2025, Ronan LE MEILLAT - SCTG Development. All rights reserved.
// Licensed under the BSD 3-Clause License.

const createLibWebM = require('../src/wrapper.js');
const fs = require('fs');

async function main() {
    console.log('LibWebM JavaScript Example');
    console.log('==========================');

    try {
        // Initialize the library
        console.log('Loading LibWebM...');
        const libwebm = await createLibWebM();
        console.log('✓ LibWebM loaded successfully');

        // Example 1: Create a simple WebM file
        console.log('\n1. Creating a WebM file...');
        await createSimpleWebM(libwebm);

        // Example 2: Parse an existing WebM file (if available)
        console.log('\n2. Parsing WebM files...');
        await parseWebMFiles(libwebm);

        console.log('\n✓ All examples completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function createSimpleWebM(libwebm) {
    const file = libwebm.WebMFile.forWriting(libwebm._module);

    // Add tracks
    const videoTrack = file.addVideoTrack(1920, 1080, 'V_VP9');
    const audioTrack = file.addAudioTrack(48000, 2, 'A_OPUS');

    console.log(`✓ Added video track: ${videoTrack} (1920x1080, VP9)`);
    console.log(`✓ Added audio track: ${audioTrack} (48kHz, stereo, Opus)`);

    // Add some dummy frames
    const dummyVideoFrame = new Uint8Array(1024);
    const dummyAudioFrame = new Uint8Array(256);

    // Fill with some pattern
    for (let i = 0; i < dummyVideoFrame.length; i++) {
        dummyVideoFrame[i] = i % 256;
    }
    for (let i = 0; i < dummyAudioFrame.length; i++) {
        dummyAudioFrame[i] = (i * 3) % 256;
    }

    // Write frames
    for (let i = 0; i < 10; i++) {
        const timestamp = libwebm.WebMUtils.msToNs(i * 33.33); // 30 FPS
        file.writeVideoFrame(videoTrack, dummyVideoFrame, timestamp, i === 0);

        if (i % 2 === 0) { // Audio at 15 FPS (every other video frame)
            file.writeAudioFrame(audioTrack, dummyAudioFrame, timestamp);
        }
    }

    console.log('✓ Written 10 video frames and 5 audio frames');

    // Finalize and save
    const webmData = file.finalize();
    fs.writeFileSync('example-output.webm', webmData);

    console.log(`✓ Created WebM file: example-output.webm (${webmData.length} bytes)`);
}

async function parseWebMFiles(libwebm) {
    // Try to parse the file we just created
    const filename = 'example-output.webm';

    if (!fs.existsSync(filename)) {
        console.log('⚠️  No WebM file to parse');
        return;
    }

    const buffer = fs.readFileSync(filename);
    console.log(`Loading ${filename} (${buffer.length} bytes)...`);

    try {
        const file = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);

        // Get basic info
        const duration = file.getDuration();
        const trackCount = file.getTrackCount();

        console.log(`✓ Duration: ${duration.toFixed(2)} seconds`);
        console.log(`✓ Track count: ${trackCount}`);

        // Analyze tracks
        for (let i = 0; i < trackCount; i++) {
            const trackInfo = file.getTrackInfo(i);
            console.log(`✓ Track ${i}: ${trackInfo.name || 'unnamed'} (${trackInfo.codecId})`);

            if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
                try {
                    const videoInfo = file.parser.getVideoInfo(trackInfo.trackNumber);
                    console.log(`  └─ Video: ${videoInfo.width}x${videoInfo.height} @ ${videoInfo.frameRate} FPS`);
                } catch (e) {
                    console.log(`  └─ Video info not available: ${e.message}`);
                }
            } else if (trackInfo.trackType === libwebm.WebMTrackType.AUDIO) {
                try {
                    const audioInfo = file.parser.getAudioInfo(trackInfo.trackNumber);
                    console.log(`  └─ Audio: ${audioInfo.samplingFrequency} Hz, ${audioInfo.channels} channels`);
                } catch (e) {
                    console.log(`  └─ Audio info not available: ${e.message}`);
                }
            }
        }

        // Try to read some frames
        console.log('\nReading frames...');
        let frameCount = 0;

        for (let i = 0; i < trackCount && frameCount < 5; i++) {
            const trackInfo = file.getTrackInfo(i);

            if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
                try {
                    const frame = file.parser.readNextVideoFrame(trackInfo.trackNumber);
                    if (frame) {
                        console.log(`✓ Video frame: ${frame.data.length} bytes, timestamp: ${libwebm.WebMUtils.nsToMs(frame.timestampNs)}ms, keyframe: ${frame.isKeyframe}`);
                        frameCount++;
                    }
                } catch (e) {
                    console.log(`⚠️  Could not read video frame: ${e.message}`);
                }
            } else if (trackInfo.trackType === libwebm.WebMTrackType.AUDIO) {
                try {
                    const frame = file.parser.readNextAudioFrame(trackInfo.trackNumber);
                    if (frame) {
                        console.log(`✓ Audio frame: ${frame.data.length} bytes, timestamp: ${libwebm.WebMUtils.nsToMs(frame.timestampNs)}ms`);
                        frameCount++;
                    }
                } catch (e) {
                    console.log(`⚠️  Could not read audio frame: ${e.message}`);
                }
            }
        }

    } catch (error) {
        console.log(`❌ Failed to parse ${filename}: ${error.message}`);
    }
}

// Utility function to demonstrate codec support
function demonstrateCodecSupport(libwebm) {
    console.log('\nSupported Codecs:');
    console.log('=================');

    const videoCodecs = libwebm.WebMUtils.getSupportedVideoCodecs();
    const audioCodecs = libwebm.WebMUtils.getSupportedAudioCodecs();

    console.log('Video codecs:');
    videoCodecs.forEach(codec => {
        console.log(`  ✓ ${codec}`);
    });

    console.log('Audio codecs:');
    audioCodecs.forEach(codec => {
        console.log(`  ✓ ${codec}`);
    });

    // Test codec validation
    console.log('\nCodec Validation:');
    console.log(`V_VP9 supported: ${libwebm.WebMUtils.isVideoCodecSupported('V_VP9')}`);
    console.log(`A_OPUS supported: ${libwebm.WebMUtils.isAudioCodecSupported('A_OPUS')}`);
    console.log(`V_H264 supported: ${libwebm.WebMUtils.isVideoCodecSupported('V_H264')} (should be false)`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, createSimpleWebM, parseWebMFiles };
