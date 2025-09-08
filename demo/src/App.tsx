/**
 * BSD 3-Clause License
 *
 * * Copyright (c) 2025, SCTG Développement
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *  contributors may be used to endorse or promote products derived from
 *  this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { useState, useCallback } from 'react';

import {
    Card,
    CardBody,
    CardHeader,
} from '@heroui/card';
import {
    Chip,
} from '@heroui/chip';
import {
    Alert,
} from '@heroui/alert';
import { Spinner } from '@heroui/spinner';
import { Tabs, Tab } from '@heroui/tabs';
import {
  WebMFileParser,
  TrackInfoDisplay,
  FrameExtractor,
  MuxerDemo,
  PerformanceTester
} from './components';

/**
 * Main application component for libwebm-js demo
 * Demonstrates WebM file parsing, track analysis, frame extraction, and muxing capabilities
 */
function App() {
  const [activeTab, setActiveTab] = useState('parser');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles global error states
   * @param errorMessage - The error message to display
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  /**
   * Clears any existing error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sets the loading state for async operations
   * @param loading - Whether the app is in a loading state
   */
  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LibWebM-JS Demo
          </h1>
          <p className="text-lg text-gray-600">
            WebM file parsing and manipulation in the browser
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Chip color="primary" variant="flat">React {__REACT_VERSION__}</Chip>
            <Chip color="secondary" variant="flat">HeroUI {__HEROUI_VERSION__}</Chip>
            <Chip color="success" variant="flat">Tailwind CSS {__TAILWINDCSS_VERSION__}</Chip>
            <Chip color="warning" variant="flat">Vite {__VITE_VERSION__}</Chip>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            color="danger"
            title="Error"
            description={error}
            className="mb-6"
            onClose={clearError}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center mb-6">
            <Spinner size="lg" color="primary" />
          </div>
        )}

        {/* Main Content */}
        <Card className="shadow-xl">
          <CardHeader className="pb-0">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              className="w-full"
              color="primary"
              variant="underlined"
              size="lg"
            >
              <Tab key="parser" title="File Parser">
                <div className="py-4">
                  <WebMFileParser
                    onError={handleError}
                    onLoading={setLoadingState}
                    onClearError={clearError}
                  />
                </div>
              </Tab>
              <Tab key="tracks" title="Track Info">
                <div className="py-4">
                  <TrackInfoDisplay
                    onError={handleError}
                    onLoading={setLoadingState}
                  />
                </div>
              </Tab>
              <Tab key="frames" title="Frame Extraction">
                <div className="py-4">
                  <FrameExtractor
                    onError={handleError}
                    onLoading={setLoadingState}
                  />
                </div>
              </Tab>
              <Tab key="muxer" title="Muxer Demo">
                <div className="py-4">
                  <MuxerDemo
                    onError={handleError}
                    onLoading={setLoadingState}
                  />
                </div>
              </Tab>
              <Tab key="performance" title="Performance">
                <div className="py-4">
                  <PerformanceTester
                    onError={handleError}
                    onLoading={setLoadingState}
                  />
                </div>
              </Tab>
            </Tabs>
          </CardHeader>
          <CardBody>
            {/* Tab content is rendered above in the Tabs component */}
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Built with libwebm-js - WebM parsing and manipulation in TypeScript</p>
        </div>
      </div>
    </div>
  );
}

export default App;
