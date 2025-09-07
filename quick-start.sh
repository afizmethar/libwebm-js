#!/bin/bash

# BSD 3-Clause License

# Copyright (c) 2025, SCTG Développement

# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:

# 1. Redistributions of source code must retain the above copyright notice, this
#    list of conditions and the following disclaimer.

# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.

# 3. Neither the name of the copyright holder nor the names of its
#    contributors may be used to endorse or promote products derived from
#    this software without specific prior written permission.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

echo "LibWebM-JS Quick Start"
echo "====================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "build.sh" ]; then
    echo "❌ Please run this script from the libwebm-js project root directory"
    exit 1
fi

echo "1. Testing project structure..."
if node test/structure-test.js; then
    echo "✓ Project structure is valid"
else
    echo "❌ Project structure test failed"
    exit 1
fi

echo ""
echo "2. Checking for Emscripten..."
if command -v emcc &> /dev/null; then
    echo "✓ Emscripten is available"
    emcc --version | head -1
    
    echo ""
    echo "3. Building the library..."
    if ./build.sh; then
        echo "✓ Build completed successfully"
        
        echo ""
        echo "4. Running example..."
        if [ -f "dist/libwebm.js" ] && [ -f "dist/wrapper.js" ]; then
            # Copy built files to examples directory for testing
            cp dist/libwebm.js examples/
            cp dist/libwebm.wasm examples/ 2>/dev/null || true
            cp dist/wrapper.js examples/
            
            cd examples
            if node basic-usage.js; then
                echo "✓ Example ran successfully"
                
                echo ""
                echo "🎉 LibWebM-JS is ready to use!"
                echo ""
                echo "Files created:"
                echo "- example-output.webm (WebM file created by the example)"
                echo ""
                echo "To use in your project:"
                echo "  const createLibWebM = require('./dist/wrapper.js');"
                echo "  const libwebm = await createLibWebM();"
                echo ""
                echo "See README.md for detailed usage instructions."
            else
                echo "⚠️  Example failed, but the library was built successfully"
                echo "You can still use the library from the dist/ directory"
            fi
        else
            echo "⚠️  Build files not found in expected location"
            echo "Check the build output for errors"
        fi
    else
        echo "❌ Build failed"
        echo "Please check the error messages above"
        exit 1
    fi
else
    echo "❌ Emscripten not found"
    echo ""
    echo "Please install Emscripten SDK:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest" 
    echo "  source ./emsdk_env.sh"
    echo ""
    echo "Then run this script again."
    exit 1
fi
