# LibWebM-JS Demo

A comprehensive demonstration of libwebm-js capabilities built with modern web technologies.

## 🚀 Features

This demo showcases the following libwebm-js functionalities:

### 📁 File Parser
- Upload and parse WebM files
- Display basic file information (size, type, duration)
- Validate WebM file structure

### 🎵 Track Information
- Display detailed track metadata
- Show codec information (VP8, VP9, AV1, Opus, Vorbis)
- Video resolution and frame rate details
- Audio sampling frequency and channel information

### 🎬 Frame Extraction
- Extract individual frames from WebM files
- Display frame timing and data size information
- Show keyframe detection
- Performance metrics for frame extraction

### 🎞️ Muxer Demo
- Create WebM files by adding video and audio tracks
- Configure track parameters (resolution, sample rate, channels)
- Simulate frame writing process
- Generate output file statistics

### ⚡ Performance Testing
- Comprehensive performance benchmarks
- Memory usage monitoring
- Concurrent operation testing
- Detailed performance metrics and ratings

## 🛠️ Technology Stack

- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.5
- **UI Library**: HeroUI 2.8.0
- **Styling**: Tailwind CSS 4.1.12
- **Language**: TypeScript with JSDoc documentation

## 📦 Installation

```bash
# Navigate to the demo directory
cd demo

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Usage

1. **Start the development server** using `npm run dev`
2. **Open your browser** and navigate to `http://localhost:5173`
3. **Explore different tabs** to test various libwebm-js features:
   - Upload WebM files for parsing
   - View detailed track information
   - Extract and analyze individual frames
   - Experiment with WebM muxing
   - Run performance benchmarks

## 📋 Component Architecture

The demo is built with a modular component architecture:

```
src/
├── components/
│   ├── WebMFileParser.tsx     # File upload and basic parsing
│   ├── TrackInfoDisplay.tsx   # Track metadata display
│   ├── FrameExtractor.tsx     # Frame extraction demo
│   ├── MuxerDemo.tsx         # WebM muxing demonstration
│   ├── PerformanceTester.tsx # Performance benchmarking
│   └── index.ts              # Component exports
├── App.tsx                   # Main application component
├── main.tsx                  # Application entry point
└── index.css                 # Global styles with Tailwind
```

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS v4 with the new `@import "tailwindcss"` directive in `src/index.css`.

### HeroUI
HeroUI is configured as the main UI component library with the `HeroUIProvider` wrapper in `src/main.tsx`.

## 📚 API Documentation

All components are fully documented with JSDoc comments including:
- Component descriptions
- Props interfaces with detailed type information
- Method documentation with parameter and return type descriptions
- Usage examples and best practices

## 🎨 UI/UX Features

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, professional interface using HeroUI components
- **Real-time Feedback**: Progress indicators and loading states
- **Error Handling**: Comprehensive error messages and recovery options
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## 🔬 Technical Implementation

### State Management
- React hooks for local component state
- Callback functions for inter-component communication
- Error boundary patterns for robust error handling

### Performance Optimizations
- Memoized callbacks to prevent unnecessary re-renders
- Efficient data structures for large frame datasets
- Background processing simulation for realistic performance testing

### Type Safety
- Full TypeScript coverage with strict type checking
- Comprehensive interface definitions
- Generic type constraints for flexible component APIs

## 🚀 Future Enhancements

Potential improvements for the demo:
- Real libwebm-js integration (currently uses simulation)
- Web Workers for heavy processing
- Drag-and-drop file upload
- Real-time video preview
- Advanced codec support visualization
- Export functionality for generated WebM files

## 📄 License

This demo is part of the libwebm-js project and follows the same BSD 3-Clause License.

## 🤝 Contributing

Contributions to improve the demo are welcome! Please ensure:
- Code follows TypeScript best practices
- Components are fully documented with JSDoc
- UI/UX improvements maintain accessibility standards
- New features include comprehensive testing
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
