# Bible to Markdown Converter 📖

A high-performance command-line tool for converting Bible text to Markdown format, optimized for use with Obsidian and other Markdown-based note-taking applications.

## ✨ Features

- **📚 Complete Bible Conversion**: Converts all 66 books (1,189 chapters) from Genesis to Revelation
- **⚡ Ultra-Fast Performance**: Complete Bible conversion in 1-2 minutes (fast mode) or 3-4 minutes (balanced mode)
- **🔗 Smart Cross-References**: Inline footnote cross-references with wiki-style linking
- **📝 Multiple Output Styles**:
  - **Study**: Includes verse numbers, headings, footnotes, and navigation
  - **Simple**: Clean text with minimal formatting
  - **Manual**: Full control over formatting options
- **🎯 Obsidian Optimized**: Wiki-style links, verse anchors, and proper navigation
- **🌐 Multiple Bible Versions**: Support for NET and NASB translations

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bible-to-markdown.git
cd bible-to-markdown

# Install dependencies
npm install

# Build the project
npm run build

# Run the converter
npm start
```

### Usage

The tool provides an interactive CLI interface:

1. **Select Bible Version**: Choose between NET or NASB
2. **Choose Output Style**: Study, Simple, or Manual
3. **Set Output Directory**: Default is `./output`
4. **Select Speed Mode**:
   - **Fast** (~1-2 minutes): Maximum speed, skips footnotes
   - **Balanced** (~3-4 minutes): Full features with optimized performance

## 📂 Output Structure

```
output/
├── NET/
│   ├── index.md          # Master index of all books
│   ├── README.md         # Generated documentation
│   ├── Genesis/
│   │   ├── index.md      # Book index
│   │   ├── Genesis 1.md  # Chapter files
│   │   ├── Genesis 2.md
│   │   └── ...
│   └── ...
```

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript

### Scripts

```bash
npm run dev        # Run in development mode
npm run build      # Build TypeScript to JavaScript
npm run test       # Run tests
npm run test:watch # Run tests in watch mode
```

### Project Structure

```
src/
├── index.ts           # Entry point
├── cli.ts            # CLI interface
├── commands/         # CLI commands
├── services/         # Core services
│   ├── api.ts       # Bible API client
│   ├── parser.ts    # HTML parser
│   ├── markdown.ts  # Markdown generator
│   ├── footnotes.ts # Footnote parser
│   └── converter.ts # Main converter
├── types/           # TypeScript types
└── utils/          # Utilities
```

## ⚡ Performance Optimizations

The converter uses several optimization techniques:

- **Parallel Processing**: Up to 20 books processed simultaneously
- **Concurrent Chapter Fetching**: 50 chapters processed in parallel (fast mode)
- **Batch API Requests**: Fetches 20 chapters per API call
- **Optional Footnote Skipping**: Fast mode skips footnotes for maximum speed

## 🔗 Cross-Reference Features

- **Inline Footnote Links**: Cross-references appear inline within footnote text
- **Verse Range Support**: Handles ranges like "John 1:4-10" linking to the first verse
- **Smart Reference Detection**: Automatically detects and links Bible references
- **Wiki-Style Navigation**: Uses `[[Book Chapter#verse|display]]` format

## 📝 Example Output

### Study Style
```markdown
# John 1

[[John|John]] | [[John 2|John 2 →]]

### 1
In the beginning was the Word, and the Word was with God, and the Word was God.[^1][^2] ^1

[^1]: **TN** The Greek word λόγος (logos) is traditionally translated "Word"...
```

### Simple Style
```markdown
# John 1

**1** In the beginning was the Word, and the Word was with God, and the Word was God.
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Bible text sourced from [NET Bible](https://netbible.org)
- Built with TypeScript, Node.js, and ❤️

---

**Note**: This tool requires an active internet connection to fetch Bible text from online sources.