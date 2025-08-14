# ClipMark - Markdown Web Clipper

## Project Overview

ClipMark is a powerful browser extension designed to convert web content into clean, formatted Markdown. Built as an upgrade to the excellent MarkDownload extension, it is fully adapted to the Manifest V3 specification, meeting the latest requirements of the Chrome Extension Store.

### Key Features

- **Smart Content Extraction**: Uses Mozilla Readability.js technology
- **Precise Markdown Conversion**: Based on the Turndown engine
- **Table Formatting**: Customizable table styles
- **Code Block Handling**: Automatic language detection and syntax highlighting
- **Image Management**: Automatic download and path management
- **Batch Processing**: Support for converting multiple URLs simultaneously
- **Link Selection Mode**: Visual selection of page links for batch conversion
- **Obsidian Integration**: Direct import to Obsidian notes
- **Custom Templates**: Support for pre and post templates
- **Keyboard Shortcuts**: Efficient operation experience
- **Dark Mode**: Eye-friendly interface design

### Technologies Used

- **Manifest V3**: Modern extension architecture
- **Readability.js**: Mozilla content extraction engine
- **Turndown.js**: HTML to Markdown conversion
- **CodeMirror**: Code editor
- **Highlight.js**: Syntax highlighting
- **Service Worker**: Background processing

## Project Structure

```
ClipMark/
├── 📄 manifest.json          # Extension configuration file
├── 🔧 service-worker.js      # Background service worker
├── 📁 popup/                 # Popup interface
│   ├── popup.html           # Interface structure
│   ├── popup.js             # Interaction logic
│   └── popup.css            # Stylesheet
├── 📁 options/               # Settings page
├── 📁 contentScript/         # Content scripts
├── 📁 preview/               # Preview page
├── 📁 offscreen/             # Offscreen document processing
├── 📁 background/            # Third-party libraries
│   ├── Readability.js       # Mozilla content extraction
│   ├── turndown.js          # HTML to Markdown
│   └── ...                  # Other dependencies
├── 📁 shared/                # Shared configuration
└── 📁 icons/                 # Icon resources
```

## Building and Running

### Development Environment Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/tangjie502/clipmark-extension.git
   cd clipmark-extension
   ```

2. **Install Dependencies**
   ```bash
   cd src
   npm install
   ```

3. **Load Development Version**
   - Chrome: `chrome://extensions/` → Developer mode → Load unpacked extension
   - Firefox: `about:debugging` → This Firefox → Load Temporary Add-on
   - Select the project's `src` directory

4. **Development and Debugging**
   - Reload the extension after code changes by clicking "Reload" on the extension management page
   - Use the browser's developer tools for debugging

### Key Scripts

- `npm run npminstall`: Install dependencies
- `npm run build`: Build the extension
- `npm run start:firefoxdeveloper`: Run in Firefox Developer Edition
- `npm run start:chromedevwin`: Run in Chrome Dev on Windows
- `npm run start:waveboxwin`: Run in Wavebox on Windows
- `npm run start:androidwin11`: Run on Android via ADB on Windows 11

## Development Conventions

### Code Style

- Follow the existing code style in the project
- Use descriptive variable and function names
- Add comments for complex logic

### Testing

- Ensure compatibility tests pass
- Test across different browsers (Chrome, Firefox, Edge, Safari)

### Contribution

1. Fork the project repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Create a Pull Request

## External Dependencies

- [Readability.js](https://github.com/mozilla/readability) - Content extraction (Apache-2.0)
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown (MIT)
- [CodeMirror](https://codemirror.net/) - Editor (MIT)
- [Highlight.js](https://highlightjs.org/) - Syntax highlighting (BSD-3-Clause)

## License

This project is licensed under the GPL-3.0 License. See the [LICENSE](LICENSE) file for details.