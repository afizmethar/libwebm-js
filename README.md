# LibWebM JavaScript Bindings

JavaScript/TypeScript bindings for the libwebm library, providing WebM container format support for web and Node.js applications. This project creates Emscripten-compiled WASM bindings equivalent to the Swift LibWebMSwift package.

## Features

- **WebM Parsing**: Read and analyze WebM files
- **WebM Muxing**: Create WebM containers with video and audio tracks
- **Cross-Platform**: Works in browsers and Node.js
- **TypeScript Support**: Full TypeScript definitions included
- **Codec Support**: VP8, VP9, AV1 video; Opus, Vorbis audio
- **Frame-Level Access**: Read individual video/audio frames
- **Memory Efficient**: Streaming operations with minimal memory usage

## Installation

### Prerequisites

To build from source, you need:

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
- CMake 3.10+
- Git

### Installing Emscripten

```bash
# Clone and install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Building

```bash
# Clone the repository
git clone https://github.com/sctg-development/libwebm-js libwebm-js
cd libwebm-js

# Build the library
./build.sh

# The built files will be in dist/
```

### Using Pre-built Binaries

If available, you can install via npm:

```bash
npm install @sctg/libwebm-js
```

## Usage

### Basic WebM File Parsing

```javascript
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function parseWebMFile() {
    // Initialize the library
    const libwebm = await createLibWebM();
    
    // Load a WebM file
    const buffer = fs.readFileSync('input.webm');
    const file = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);
    
    // Get file information
    console.log(`Duration: ${file.getDuration()} seconds`);
    console.log(`Track count: ${file.getTrackCount()}`);
    
    // Analyze tracks
    for (let i = 0; i < file.getTrackCount(); i++) {
        const trackInfo = file.getTrackInfo(i);
        console.log(`Track ${i}: ${trackInfo.codecId} (Type: ${trackInfo.trackType})`);
        
        if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
            const videoInfo = file.parser.getVideoInfo(trackInfo.trackNumber);
            console.log(`  Video: ${videoInfo.width}x${videoInfo.height}@${videoInfo.frameRate}fps`);
        } else if (trackInfo.trackType === libwebm.WebMTrackType.AUDIO) {
            const audioInfo = file.parser.getAudioInfo(trackInfo.trackNumber);
            console.log(`  Audio: ${audioInfo.channels}ch@${audioInfo.samplingFrequency}Hz`);
        }
    }
}

parseWebMFile().catch(console.error);
```

### Creating WebM Files - Video Only

```javascript
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function createVideoOnlyWebM() {
    const libwebm = await createLibWebM();
    
    // Create a new WebM file for writing
    const file = libwebm.WebMFile.forWriting(libwebm._module);
    
    // Add a video track (VP8, 1280x720)
    const videoTrack = file.addVideoTrack(1280, 720, 'V_VP8');
    
    // Write video frames (30fps = 33.33ms per frame)
    const frameDurationNs = libwebm.WebMUtils.msToNs(33.33);
    
    for (let i = 0; i < 150; i++) { // 5 seconds at 30fps
        // Create frame data (in real usage, this would be encoded VP8 data)
        const frameData = new Uint8Array(1000 + i * 100);
        frameData.fill(i % 256); // Sample pattern
        
        const timestampNs = i * frameDurationNs;
        const isKeyframe = (i % 30) === 0; // Keyframe every second
        
        file.writeVideoFrame(videoTrack, frameData, timestampNs, isKeyframe);
    }
    
    // Finalize and save
    const webmData = file.finalize();
    fs.writeFileSync('video-only.webm', webmData);
    
    console.log('Video-only WebM created successfully!');
}

createVideoOnlyWebM().catch(console.error);
```

### Creating WebM Files - Audio Only

```javascript
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function createAudioOnlyWebM() {
    const libwebm = await createLibWebM();
    
    const file = libwebm.WebMFile.forWriting(libwebm._module);
    
    // Add an audio track (Opus, 48kHz stereo)
    const audioTrack = file.addAudioTrack(48000, 2, 'A_OPUS');
    
    // Write audio frames (20ms per frame = typical Opus frame size)
    const frameDurationNs = libwebm.WebMUtils.msToNs(20);
    
    for (let i = 0; i < 250; i++) { // 5 seconds of audio
        // Create audio frame data (in real usage, this would be encoded Opus data)
        const frameData = new Uint8Array(100 + i % 50);
        frameData.fill(i % 128 + 50); // Sample audio pattern
        
        const timestampNs = i * frameDurationNs;
        file.writeAudioFrame(audioTrack, frameData, timestampNs);
    }
    
    const webmData = file.finalize();
    fs.writeFileSync('audio-only.webm', webmData);
    
    console.log('Audio-only WebM created successfully!');
}

createAudioOnlyWebM().catch(console.error);
```

### Creating WebM Files - Mixed Video and Audio

```javascript
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function createMixedWebM() {
    const libwebm = await createLibWebM();
    
    const file = libwebm.WebMFile.forWriting(libwebm._module);
    
    // Add video and audio tracks
    const videoTrack = file.addVideoTrack(1920, 1080, 'V_VP9');
    const audioTrack = file.addAudioTrack(48000, 2, 'A_OPUS');
    
    const videoDurationNs = libwebm.WebMUtils.msToNs(33.33); // 30fps
    const audioDurationNs = libwebm.WebMUtils.msToNs(20);    // 20ms audio frames
    
    const totalDurationMs = 3000; // 3 seconds
    const totalVideoFrames = Math.floor(totalDurationMs / 33.33);
    const totalAudioFrames = Math.floor(totalDurationMs / 20);
    
    // Write video frames
    for (let i = 0; i < totalVideoFrames; i++) {
        const frameData = new Uint8Array(2000 + i * 200);
        frameData.fill(i % 256);
        
        const timestampNs = i * videoDurationNs;
        const isKeyframe = (i % 30) === 0;
        
        file.writeVideoFrame(videoTrack, frameData, timestampNs, isKeyframe);
    }
    
    // Write audio frames
    for (let i = 0; i < totalAudioFrames; i++) {
        const frameData = new Uint8Array(200 + i % 100);
        frameData.fill(i % 128 + 64);
        
        const timestampNs = i * audioDurationNs;
        file.writeAudioFrame(audioTrack, frameData, timestampNs);
    }
    
    const webmData = file.finalize();
    fs.writeFileSync('mixed-content.webm', webmData);
    
    console.log('Mixed video/audio WebM created successfully!');
}

createMixedWebM().catch(console.error);
```

### Frame-by-Frame Extraction

```javascript
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function extractFrames() {
    const libwebm = await createLibWebM();
    
    const buffer = fs.readFileSync('input.webm');
    const file = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);
    
    // Find video track
    let videoTrackNumber = 0;
    for (let i = 0; i < file.getTrackCount(); i++) {
        const trackInfo = file.getTrackInfo(i);
        if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
            videoTrackNumber = trackInfo.trackNumber;
            break;
        }
    }
    
    if (videoTrackNumber === 0) {
        console.log('No video track found');
        return;
    }
    
    // Extract video frames
    let frameCount = 0;
    const maxFrames = 100; // Limit for demo
    
    while (frameCount < maxFrames) {
        const frameData = file.parser.readNextVideoFrame(videoTrackNumber);
        if (!frameData) break;
        
        console.log(`Frame ${frameCount}: ${frameData.data.length} bytes, ` +
                   `timestamp: ${libwebm.WebMUtils.nsToMs(frameData.timestampNs)}ms, ` +
                   `keyframe: ${frameData.isKeyframe}`);
        
        // Save frame data (you could decode this with a VP8/VP9 decoder)
        fs.writeFileSync(`frame_${frameCount}.bin`, frameData.data);
        
        frameCount++;
    }
    
    console.log(`Extracted ${frameCount} video frames`);
}

extractFrames().catch(console.error);
```

### TypeScript Usage with Full Type Safety

```typescript
import createLibWebM, { WebMFile, WebMUtils, WebMTrackType, WebMErrorCode } from '@sctg/libwebm-js';
import * as fs from 'fs';

async function typescriptExample(): Promise<void> {
    const libwebm = await createLibWebM();
    
    // Type-safe file creation
    const file: WebMFile = WebMFile.forWriting(libwebm._module);
    
    // Type-safe track creation
    const videoTrack: number = file.addVideoTrack(1280, 720, 'V_VP8');
    const audioTrack: number = file.addAudioTrack(48000, 2, 'A_OPUS');
    
    // Type-safe utility functions
    const frameDurationNs: number = WebMUtils.msToNs(33.33);
    
    // Type-safe codec validation
    if (WebMUtils.isVideoCodecSupported('V_VP9')) {
        console.log('VP9 is supported');
    }
    
    // Error handling with type safety
    try {
        file.writeVideoFrame(999, new Uint8Array([1, 2, 3]), 0, true); // Invalid track ID
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
    }
    
    // Write valid frame and finalize
    const frameData = new Uint8Array(1000);
    file.writeVideoFrame(videoTrack, frameData, 0, true);
    
    const webmData: Uint8Array = file.finalize();
    fs.writeFileSync('typescript-output.webm', webmData);
}

typescriptExample().catch(console.error);
```

### Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import createLibWebM from './dist/wrapper.js';
        
        async function browserExample() {
            const libwebm = await createLibWebM();
            
            // Parse WebM from file input
            const fileInput = document.getElementById('webm-input');
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const buffer = new Uint8Array(await file.arrayBuffer());
                const webmFile = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);
                
                console.log(`Duration: ${webmFile.getDuration()}s`);
                console.log(`Tracks: ${webmFile.getTrackCount()}`);
                
                // Display file info
                const info = document.getElementById('info');
                info.innerHTML = `
                    <p>Duration: ${webmFile.getDuration().toFixed(2)} seconds</p>
                    <p>Track count: ${webmFile.getTrackCount()}</p>
                `;
                
                for (let i = 0; i < webmFile.getTrackCount(); i++) {
                    const trackInfo = webmFile.getTrackInfo(i);
                    info.innerHTML += `<p>Track ${i}: ${trackInfo.codecId}</p>`;
                }
            });
            
            // Create WebM in browser
            const createButton = document.getElementById('create-webm');
            createButton.addEventListener('click', async () => {
                const file = libwebm.WebMFile.forWriting(libwebm._module);
                const videoTrack = file.addVideoTrack(640, 480, 'V_VP8');
                
                // Create sample video data
                const frameData = new Uint8Array(500);
                frameData.fill(128); // Gray frame
                
                file.writeVideoFrame(videoTrack, frameData, 0, true);
                
                const webmData = file.finalize();
                
                // Download the created WebM
                const blob = new Blob([webmData], { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'created.webm';
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        
        browserExample().catch(console.error);
    </script>
</head>
<body>
    <h1>LibWebM Browser Example</h1>
    <input type="file" id="webm-input" accept=".webm">
    <button id="create-webm">Create Sample WebM</button>
    <div id="info"></div>
</body>
</html>
```

## Real-World Use Cases

### 1. Media File Analysis Tool

```javascript
// Analyze WebM files and extract metadata
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function analyzeMediaFile(filePath) {
    const libwebm = await createLibWebM();
    const buffer = fs.readFileSync(filePath);
    const file = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);
    
    const analysis = {
        filename: filePath,
        duration: file.getDuration(),
        tracks: [],
        hasVideo: false,
        hasAudio: false,
        fileSize: buffer.length
    };
    
    for (let i = 0; i < file.getTrackCount(); i++) {
        const trackInfo = file.getTrackInfo(i);
        const track = {
            number: trackInfo.trackNumber,
            type: trackInfo.trackType === libwebm.WebMTrackType.VIDEO ? 'video' : 'audio',
            codec: trackInfo.codecId
        };
        
        if (track.type === 'video') {
            const videoInfo = file.parser.getVideoInfo(trackInfo.trackNumber);
            track.width = videoInfo.width;
            track.height = videoInfo.height;
            track.frameRate = videoInfo.frameRate;
            analysis.hasVideo = true;
        } else if (track.type === 'audio') {
            const audioInfo = file.parser.getAudioInfo(trackInfo.trackNumber);
            track.sampleRate = audioInfo.samplingFrequency;
            track.channels = audioInfo.channels;
            track.bitDepth = audioInfo.bitDepth;
            analysis.hasAudio = true;
        }
        
        analysis.tracks.push(track);
    }
    
    return analysis;
}
```

### 2. WebM Transcoding Pipeline

```javascript
// Convert between different WebM formats
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

async function convertWebM(inputPath, outputPath, options = {}) {
    const libwebm = await createLibWebM();
    
    // Parse input file
    const inputBuffer = fs.readFileSync(inputPath);
    const inputFile = await libwebm.WebMFile.fromBuffer(inputBuffer, libwebm._module);
    
    // Create output file
    const outputFile = libwebm.WebMFile.forWriting(libwebm._module);
    
    const trackMapping = {};
    
    // Copy tracks with potential format changes
    for (let i = 0; i < inputFile.getTrackCount(); i++) {
        const trackInfo = inputFile.getTrackInfo(i);
        
        if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
            const videoInfo = inputFile.parser.getVideoInfo(trackInfo.trackNumber);
            const newCodec = options.videoCodec || trackInfo.codecId;
            const newWidth = options.width || videoInfo.width;
            const newHeight = options.height || videoInfo.height;
            
            const newTrackId = outputFile.addVideoTrack(newWidth, newHeight, newCodec);
            trackMapping[trackInfo.trackNumber] = { id: newTrackId, type: 'video' };
        } else if (trackInfo.trackType === libwebm.WebMTrackType.AUDIO) {
            const audioInfo = inputFile.parser.getAudioInfo(trackInfo.trackNumber);
            const newCodec = options.audioCodec || trackInfo.codecId;
            const newSampleRate = options.sampleRate || audioInfo.samplingFrequency;
            const newChannels = options.channels || audioInfo.channels;
            
            const newTrackId = outputFile.addAudioTrack(newSampleRate, newChannels, newCodec);
            trackMapping[trackInfo.trackNumber] = { id: newTrackId, type: 'audio' };
        }
    }
    
    // Copy frame data (in a real implementation, you might re-encode here)
    // This is a simplified example that copies raw frame data
    for (const [originalId, mapping] of Object.entries(trackMapping)) {
        if (mapping.type === 'video') {
            let frameData;
            while ((frameData = inputFile.parser.readNextVideoFrame(parseInt(originalId)))) {
                outputFile.writeVideoFrame(
                    mapping.id,
                    frameData.data,
                    frameData.timestampNs,
                    frameData.isKeyframe
                );
            }
        } else if (mapping.type === 'audio') {
            let frameData;
            while ((frameData = inputFile.parser.readNextAudioFrame(parseInt(originalId)))) {
                outputFile.writeAudioFrame(
                    mapping.id,
                    frameData.data,
                    frameData.timestampNs
                );
            }
        }
    }
    
    const outputData = outputFile.finalize();
    fs.writeFileSync(outputPath, outputData);
    
    console.log(`Converted ${inputPath} to ${outputPath}`);
}
```

### 3. Streaming WebM Creator

```javascript
// Create WebM files from streaming data
import createLibWebM from '@sctg/libwebm-js';
import fs from 'fs';

class StreamingWebMWriter {
    constructor(options = {}) {
        this.options = options;
        this.chunks = [];
        this.initialized = false;
    }
    
    async initialize() {
        this.libwebm = await createLibWebM();
        this.file = this.libwebm.WebMFile.forWriting(this.libwebm._module);
        
        if (this.options.video) {
            this.videoTrack = this.file.addVideoTrack(
                this.options.video.width || 1280,
                this.options.video.height || 720,
                this.options.video.codec || 'V_VP8'
            );
        }
        
        if (this.options.audio) {
            this.audioTrack = this.file.addAudioTrack(
                this.options.audio.sampleRate || 48000,
                this.options.audio.channels || 2,
                this.options.audio.codec || 'A_OPUS'
            );
        }
        
        this.initialized = true;
    }
    
    writeVideoFrame(data, timestampMs, isKeyframe = false) {
        if (!this.initialized || !this.videoTrack) {
            throw new Error('Writer not initialized or no video track');
        }
        
        const timestampNs = this.libwebm.WebMUtils.msToNs(timestampMs);
        this.file.writeVideoFrame(this.videoTrack, data, timestampNs, isKeyframe);
    }
    
    writeAudioFrame(data, timestampMs) {
        if (!this.initialized || !this.audioTrack) {
            throw new Error('Writer not initialized or no audio track');
        }
        
        const timestampNs = this.libwebm.WebMUtils.msToNs(timestampMs);
        this.file.writeAudioFrame(this.audioTrack, data, timestampNs);
    }
    
    finalize() {
        if (!this.initialized) {
            throw new Error('Writer not initialized');
        }
        
        return this.file.finalize();
    }
}

// Usage example
async function streamingExample() {
    const writer = new StreamingWebMWriter({
        video: { width: 1920, height: 1080, codec: 'V_VP9' },
        audio: { sampleRate: 48000, channels: 2, codec: 'A_OPUS' }
    });
    
    await writer.initialize();
    
    // Simulate streaming data (in real usage, this would come from encoders)
    for (let i = 0; i < 300; i++) { // 10 seconds at 30fps
        // Video frame every 33.33ms
        const videoData = new Uint8Array(2000 + Math.random() * 1000);
        writer.writeVideoFrame(videoData, i * 33.33, i % 30 === 0);
        
        // Audio frame every 20ms (more frequent than video)
        if (i % 20 === 0) {
            const audioData = new Uint8Array(200 + Math.random() * 100);
            writer.writeAudioFrame(audioData, i * 33.33);
        }
    }
    
    const webmData = writer.finalize();
    fs.writeFileSync('streaming-output.webm', webmData);
    console.log('Streaming WebM created successfully!');
}
```

## API Reference

### WebMFile

High-level interface for WebM operations.

#### Static Methods

- `WebMFile.fromBuffer(buffer: Uint8Array, module: LibWebMModule): Promise<WebMFile>`
- `WebMFile.forWriting(module: LibWebMModule): WebMFile`

#### Instance Methods

**Reading (Parser mode):**
- `getDuration(): number` - Get duration in seconds
- `getTrackCount(): number` - Get number of tracks
- `getTrackInfo(trackIndex: number): WebMTrackInfo` - Get track information

**Writing (Muxer mode):**
- `addVideoTrack(width: number, height: number, codecId: string): number`
- `addAudioTrack(samplingFrequency: number, channels: number, codecId: string): number`
- `writeVideoFrame(trackId: number, frameData: Uint8Array, timestampNs: number, isKeyframe: boolean): void`
- `writeAudioFrame(trackId: number, frameData: Uint8Array, timestampNs: number): void`
- `finalize(): Uint8Array` - Get final WebM data

### WebMUtils

Utility functions for common operations.

- `isVideoCodecSupported(codecId: string): boolean`
- `isAudioCodecSupported(codecId: string): boolean`
- `nsToMs(ns: number): number` - Convert nanoseconds to milliseconds
- `msToNs(ms: number): number` - Convert milliseconds to nanoseconds
- `getSupportedVideoCodecs(): string[]`
- `getSupportedAudioCodecs(): string[]`

### Supported Codecs

**Video:**
- `V_VP8` - VP8 codec
- `V_VP9` - VP9 codec  
- `V_AV01` - AV1 codec

**Audio:**
- `A_OPUS` - Opus codec
- `A_VORBIS` - Vorbis codec

### Error Handling

All methods throw standard JavaScript Error objects with descriptive messages. Common error codes:

- `INVALID_FILE` - File format not recognized
- `CORRUPTED_DATA` - WebM data is corrupted
- `UNSUPPORTED_FORMAT` - Codec or feature not supported
- `IO_ERROR` - Input/output error
- `INVALID_ARGUMENT` - Invalid parameter passed

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.js` - Basic file creation and parsing
- `advanced-parser.js` - Advanced parsing with frame extraction
- `streaming-muxer.js` - Streaming WebM creation
- `browser-example.html` - Browser usage example

## Advanced Usage

### Frame-by-Frame Processing

```javascript
const libwebm = await createLibWebM();
const buffer = fs.readFileSync('input.webm');
const file = await libwebm.WebMFile.fromBuffer(buffer, libwebm._module);

// Process all video frames
const trackInfo = file.getTrackInfo(0);
if (trackInfo.trackType === libwebm.WebMTrackType.VIDEO) {
    let frame;
    while ((frame = file.parser.readNextVideoFrame(trackInfo.trackNumber)) !== null) {
        console.log(`Frame: ${frame.data.length} bytes at ${WebMUtils.nsToMs(frame.timestampNs)}ms`);
        // Process frame data...
    }
}
```

### Streaming WebM Creation

```javascript
const libwebm = await createLibWebM();
const file = libwebm.WebMFile.forWriting(libwebm._module);

const videoTrack = file.addVideoTrack(1920, 1080, 'V_VP9');

// Write frames as they become available
function writeFrame(frameData, timestamp, isKeyframe) {
    file.writeVideoFrame(videoTrack, frameData, WebMUtils.msToNs(timestamp), isKeyframe);
    
    // Get current data for streaming (before finalization)
    const currentData = file.muxer.getData();
    // Send currentData to client/server...
}

// When done
const finalData = file.finalize();
```

## Building from Source

The build process:

1. Clones Google's libwebm repository
2. Compiles libwebm with Emscripten
3. Compiles the C++ bindings (`src/libwebm-bindings.cpp`)
4. Generates JavaScript/WASM files
5. Creates the wrapper and TypeScript definitions

Build options can be configured in `CMakeLists.txt` and `build.sh`.

## Performance

- WASM compilation provides near-native performance
- Memory usage is optimized for streaming operations
- Large files can be processed with constant memory usage
- Frame-by-frame processing avoids loading entire file into memory

## License

BSD 3-Clause License. See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## See Also

- [libwebm](https://chromium.googlesource.com/webm/libwebm) - Original C++ library
- [LibWebMSwift](../ios/LibWebMSwift/) - Swift bindings for iOS/macOS
- [WebM Project](https://www.webmproject.org/) - WebM format specification
