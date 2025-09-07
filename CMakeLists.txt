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

cmake_minimum_required(VERSION 3.10)
project(LIBWEBM_WASM)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define the dist directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/dist)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/dist)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/dist)

# Check if emscripten is used
if(NOT DEFINED EMSCRIPTEN)
    message(FATAL_ERROR "You must use Emscripten to compile this project")
endif()

# Add libwebm subdirectory
add_subdirectory(src/libwebm)

# Include directories for libwebm
include_directories(
    ${CMAKE_SOURCE_DIR}/src/libwebm
    ${CMAKE_SOURCE_DIR}/src/libwebm/common
    ${CMAKE_SOURCE_DIR}/src/libwebm/mkvparser
    ${CMAKE_SOURCE_DIR}/src/libwebm/mkvmuxer
)

# Sources
set(SOURCES
    src/libwebm-bindings.cpp
)

# Compiler flags
set(CMAKE_EXECUTABLE_SUFFIX ".js")
set(WASM_LINK_FLAGS
    "-s WASM=1"
    "-s EXPORT_ES6=1"
    "-s MODULARIZE=1"
    "-s ALLOW_MEMORY_GROWTH=1"
    "-s NO_EXIT_RUNTIME=1"
    "-lembind"
    "-O3"
)

# Target definition
add_executable(libwebm ${SOURCES})

# Link with libwebm
target_link_libraries(libwebm webm)

target_link_options(libwebm PRIVATE
  --emit-tsd "libwebm.d.ts"
)

# Link flags
string(JOIN " " WASM_LINK_FLAGS_STR ${WASM_LINK_FLAGS})
set_target_properties(libwebm PROPERTIES LINK_FLAGS "${WASM_LINK_FLAGS_STR}")

# Installation
install(TARGETS libwebm
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/dist
)
install(FILES 
    ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/libwebm.wasm
    ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/libwebm.d.ts
    ${CMAKE_SOURCE_DIR}/src/wrapper.js
    ${CMAKE_SOURCE_DIR}/src/wrapper-worker.js
    DESTINATION ${CMAKE_SOURCE_DIR}/dist
    OPTIONAL
)

add_custom_command(
    TARGET libwebm POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_SOURCE_DIR}/dist
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/src/wrapper.js ${CMAKE_SOURCE_DIR}/dist/wrapper.js
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/src/wrapper-worker.js ${CMAKE_SOURCE_DIR}/dist/wrapper-worker.js
    COMMENT "Copying wrapper files to dist directory"
    VERBATIM
)