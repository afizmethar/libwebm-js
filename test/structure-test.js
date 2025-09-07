// Copyright (c) 2025, Ronan LE MEILLAT - SCTG Development. All rights reserved.
// Licensed under the BSD 3-Clause License.

/**
 * Simple test to validate the libwebm-js setup
 * This test doesn't require the actual compiled WASM module
 */

const path = require('path');
const fs = require('fs');

// Test the wrapper logic
async function testWrapper() {
    console.log('Testing libwebm-js wrapper structure...');

    try {
        // Test that the wrapper file exists and has the right structure
        const wrapperPath = path.join(__dirname, '..', 'src', 'wrapper.js');
        const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');

        // Check for key components in the wrapper
        const requiredElements = [
            'WebMErrorCode',
            'WebMTrackType',
            'WebMUtils',
            'WebMParser',
            'WebMMuxer',
            'WebMFile',
            'createLibWebM'
        ];

        let missingElements = [];
        for (const element of requiredElements) {
            if (!wrapperContent.includes(element)) {
                missingElements.push(element);
            }
        }

        if (missingElements.length > 0) {
            console.log(`❌ Missing elements in wrapper: ${missingElements.join(', ')}`);
            return false;
        }

        console.log('✓ Wrapper file structure is valid');

        // Test TypeScript definitions
        const tsPath = path.join(__dirname, '..', 'src', 'index.ts');
        const tsContent = fs.readFileSync(tsPath, 'utf8');

        const requiredTypes = [
            'WebMErrorCode',
            'WebMTrackType',
            'WebMTrackInfo',
            'WebMVideoInfo',
            'WebMAudioInfo',
            'WebMFrameData',
            'WebMParser',
            'WebMMuxer'
        ];

        let missingTypes = [];
        for (const type of requiredTypes) {
            if (!tsContent.includes(type)) {
                missingTypes.push(type);
            }
        }

        if (missingTypes.length > 0) {
            console.log(`❌ Missing types in TypeScript definitions: ${missingTypes.join(', ')}`);
            return false;
        }

        console.log('✓ TypeScript definitions are complete');

        // Test C++ bindings file
        const cppPath = path.join(__dirname, '..', 'src', 'libwebm-bindings.cpp');
        const cppContent = fs.readFileSync(cppPath, 'utf8');

        const requiredCppElements = [
            '#include <emscripten/bind.h>',
            'class WebMParser',
            'class WebMMuxer',
            'EMSCRIPTEN_BINDINGS'
        ];

        let missingCppElements = [];
        for (const element of requiredCppElements) {
            if (!cppContent.includes(element)) {
                missingCppElements.push(element);
            }
        }

        if (missingCppElements.length > 0) {
            console.log(`❌ Missing elements in C++ bindings: ${missingCppElements.join(', ')}`);
            return false;
        }

        console.log('✓ C++ bindings file structure is valid');

        console.log('\n🎉 All wrapper structure tests passed!');
        return true;

    } catch (error) {
        console.error('❌ Wrapper structure test failed:', error.message);
        return false;
    }
}

// Test file structure
function testFileStructure() {
    console.log('\nTesting file structure...');

    const expectedFiles = [
        'package.json',
        'CMakeLists.txt',
        'build.sh',
        'src/libwebm-bindings.cpp',
        'src/wrapper.js',
        'src/index.ts',
        'examples/basic-usage.js',
        'README.md'
    ];

    const baseDir = path.join(__dirname, '..');
    let allExists = true;

    for (const file of expectedFiles) {
        const fullPath = path.join(baseDir, file);
        if (fs.existsSync(fullPath)) {
            console.log(`✓ ${file}`);
        } else {
            console.log(`❌ ${file} (missing)`);
            allExists = false;
        }
    }

    return allExists;
}

// Main test function
async function runTests() {
    console.log('LibWebM-JS Structure Tests');
    console.log('==========================\n');

    const structureOk = testFileStructure();
    const wrapperOk = await testWrapper();

    console.log('\nTest Summary:');
    console.log(`File Structure: ${structureOk ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`Wrapper Logic: ${wrapperOk ? '✓ PASS' : '❌ FAIL'}`);

    if (structureOk && wrapperOk) {
        console.log('\n🎉 All tests passed! The project structure is ready.');
        console.log('\nNext steps:');
        console.log('1. Install Emscripten SDK');
        console.log('2. Run ./build.sh to compile the library');
        console.log('3. Test with examples/basic-usage.js');
    } else {
        console.log('\n❌ Some tests failed. Please check the errors above.');
        process.exit(1);
    }
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testWrapper, testFileStructure };
