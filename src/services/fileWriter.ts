import fs from 'fs-extra';
import path from 'path';
import { ParsedChapter, BibleVersion, OutputStyle } from '../types/index.js';

export class FileWriter {
  private outputDir: string;
  private version: BibleVersion;
  private style: OutputStyle;

  constructor(outputDir: string, version: BibleVersion, style: OutputStyle) {
    this.outputDir = outputDir;
    this.version = version;
    this.style = style;
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, this.version));
  }

  async writeChapter(chapter: ParsedChapter, markdown: string): Promise<void> {
    const { book, chapter: chapterNum } = chapter;
    const bookDir = path.join(this.outputDir, this.version, this.sanitizeFileName(book));
    const fileName = `${book} ${chapterNum}.md`;
    const filePath = path.join(bookDir, fileName);
    
    await fs.ensureDir(bookDir);
    await fs.writeFile(filePath, markdown, 'utf8');
  }

  async writeBookIndex(bookName: string, markdown: string): Promise<void> {
    const bookDir = path.join(this.outputDir, this.version, this.sanitizeFileName(bookName));
    const filePath = path.join(bookDir, 'index.md');
    
    await fs.ensureDir(bookDir);
    await fs.writeFile(filePath, markdown, 'utf8');
  }

  async writeMasterIndex(markdown: string): Promise<void> {
    const filePath = path.join(this.outputDir, this.version, 'index.md');
    await fs.writeFile(filePath, markdown, 'utf8');
  }

  async writeReadme(): Promise<void> {
    const readme = this.generateReadme();
    const filePath = path.join(this.outputDir, this.version, 'README.md');
    await fs.writeFile(filePath, readme, 'utf8');
  }

  private generateReadme(): string {
    return `# Bible in Markdown (${this.version})

This directory contains the Bible converted to Markdown format.

## Structure

- \`index.md\` - Master index of all books
- \`[Book Name]/\` - Directory for each book
  - \`index.md\` - Index of chapters in the book
  - \`[Book Name] [Chapter].md\` - Individual chapter files

## Format

- **Version**: ${this.version}
- **Style**: ${this.style}
- **Generated**: ${new Date().toISOString()}

## Navigation

Use the Obsidian-style links to navigate between chapters and books. Each chapter file contains:

${this.getStyleDescription()}

## Usage

This format is optimized for use with Obsidian and other Markdown-based note-taking applications that support Wiki-style linking.
`;
  }

  private getStyleDescription(): string {
    switch (this.style) {
      case 'study':
        return `- YAML frontmatter with metadata
- Chapter and verse numbers
- Section headings
- Navigation links
- Verse anchors for linking`;
      
      case 'simple':
        return `- Clean, minimal formatting
- Bold verse numbers
- No extra navigation or metadata`;
      
      case 'manual':
        return `- Full control formatting
- Numbered verses
- Cross-reference anchors`;
      
      default:
        return '- Standard formatting';
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getFileStats(): Promise<{ files: number; size: number }> {
    const versionDir = path.join(this.outputDir, this.version);
    
    if (!await fs.pathExists(versionDir)) {
      return { files: 0, size: 0 };
    }
    
    let files = 0;
    let size = 0;
    
    const processDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files++;
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
    };
    
    await processDirectory(versionDir);
    
    return { files, size };
  }
}

export function createFileWriter(outputDir: string, version: BibleVersion, style: OutputStyle): FileWriter {
  return new FileWriter(outputDir, version, style);
}