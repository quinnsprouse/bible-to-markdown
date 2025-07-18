import { ParsedChapter, OutputStyle, BibleVersion, ParsedFootnote, VerseReference } from '../types/index.js';

export class MarkdownGenerator {
  private style: OutputStyle;
  private version: BibleVersion;

  constructor(style: OutputStyle, version: BibleVersion) {
    this.style = style;
    this.version = version;
  }

  generateChapterMarkdown(chapter: ParsedChapter, footnotes: ParsedFootnote[] = []): string {
    const { book, chapter: chapterNum, sections } = chapter;
    
    let markdown = this.generateFrontmatter(chapter);
    markdown += this.generateHeader(book, chapterNum);
    markdown += this.generateNavigation(book, chapterNum);
    markdown += '\n';
    
    sections.forEach(section => {
      if (section.title && this.style === 'study') {
        markdown += `## ${section.title}\n\n`;
      }
      
      section.verses.forEach(verse => {
        markdown += this.generateVerse(verse, book, chapterNum, footnotes);
      });
      
      markdown += '\n';
    });
    
    // Add footnotes section for study style
    if (this.style === 'study' && footnotes.length > 0) {
      markdown += this.generateFootnotesSection(footnotes, book, chapterNum);
    }
    
    markdown += this.generateFooterNavigation(book, chapterNum);
    
    return markdown.trim();
  }

  private generateFrontmatter(chapter: ParsedChapter): string {
    if (this.style === 'simple') return '';
    
    const { book, chapter: chapterNum, sections } = chapter;
    const totalVerses = sections.reduce((sum, section) => sum + section.verses.length, 0);
    
    return `---
book: ${book}
chapter: ${chapterNum}
verses: ${totalVerses}
version: ${this.version}
---

`;
  }

  private generateHeader(book: string, chapter: number): string {
    return `# ${book} ${chapter}\n\n`;
  }

  private generateNavigation(book: string, chapter: number): string {
    if (this.style === 'simple') return '';
    
    const prevChapter = chapter > 1 ? `[[${book} ${chapter - 1}|← ${book} ${chapter - 1}]]` : '';
    const nextChapter = `[[${book} ${chapter + 1}|${book} ${chapter + 1} →]]`;
    const bookIndex = `[[${book}|${book}]]`;
    
    let nav = '';
    if (prevChapter) {
      nav += `${prevChapter} | `;
    }
    nav += `${bookIndex}`;
    nav += ` | ${nextChapter}`;
    
    return `${nav}\n\n`;
  }

  private generateVerse(verse: any, book: string, chapter: number, _footnotes: ParsedFootnote[] = []): string {
    const { number, text, footnoteNumbers } = verse;
    const anchor = this.style === 'study' ? ` ^${number}` : '';
    
    // Add footnote markers to make footnotes visible in Obsidian reading mode
    let verseText = text;
    if (footnoteNumbers && footnoteNumbers.length > 0) {
      const footnoteMarkers = footnoteNumbers.map((num: number) => `[^${num}]`).join('');
      verseText += footnoteMarkers;
    }
    
    switch (this.style) {
      case 'study':
        return `### ${number}\n${verseText}${anchor}\n\n`;
      
      case 'simple':
        return `**${number}** ${verseText}\n\n`;
      
      case 'manual':
        return `${number}. ${verseText} ^[[${book} ${chapter}#${number}]]\n\n`;
      
      default:
        return `### ${number}\n${verseText}${anchor}\n\n`;
    }
  }

  private generateFooterNavigation(book: string, chapter: number): string {
    if (this.style === 'simple') return '';
    
    return `\n---\n\n${this.generateNavigation(book, chapter)}`;
  }

  generateBookIndex(book: string, chapters: ParsedChapter[]): string {
    let markdown = `# ${book}\n\n`;
    
    if (this.style === 'study') {
      markdown += `## Chapters\n\n`;
    }
    
    chapters.forEach(chapter => {
      const { chapter: chapterNum, sections } = chapter;
      const totalVerses = sections.reduce((sum, section) => sum + section.verses.length, 0);
      
      if (this.style === 'study') {
        markdown += `- [[${book} ${chapterNum}]] (${totalVerses} verses)\n`;
      } else {
        markdown += `- [[${book} ${chapterNum}]]\n`;
      }
    });
    
    return markdown;
  }

  generateMasterIndex(books: { name: string; chapters: number[] }[]): string {
    let markdown = `# Bible Index\n\n`;
    
    const oldTestament = books.filter(book => this.isOldTestament(book.name));
    const newTestament = books.filter(book => !this.isOldTestament(book.name));
    
    if (oldTestament.length > 0) {
      markdown += `## Old Testament\n\n`;
      oldTestament.forEach(book => {
        markdown += `- **[[${book.name}]]** `;
        book.chapters.forEach(chapter => {
          markdown += `[[${book.name} ${chapter}|${chapter}]] `;
        });
        markdown += '\n';
      });
      markdown += '\n';
    }
    
    if (newTestament.length > 0) {
      markdown += `## New Testament\n\n`;
      newTestament.forEach(book => {
        markdown += `- **[[${book.name}]]** `;
        book.chapters.forEach(chapter => {
          markdown += `[[${book.name} ${chapter}|${chapter}]] `;
        });
        markdown += '\n';
      });
    }
    
    return markdown;
  }

  private generateFootnotesSection(footnotes: ParsedFootnote[], book: string, chapter: number): string {
    if (footnotes.length === 0) return '';
    
    let markdown = '\n---\n\n## Footnotes\n\n';
    
    footnotes.forEach(footnote => {
      const verseLink = this.getFootnoteVerseLink(footnote, book, chapter);
      const processedContent = this.processFootnoteContent(footnote.content, footnote);
      
      markdown += `[^${footnote.number}]: **${footnote.type.toUpperCase()}** ${processedContent}`;
      
      // Add link back to originating verse (cross-references are now inline in processedContent)
      if (verseLink) {
        markdown += ` ${verseLink}`;
      }
      
      markdown += '\n\n';
    });
    
    return markdown;
  }
  
  // Note: This method is kept for testing purposes, but cross-references are now handled inline
  // @ts-ignore: Method used in tests
  private deduplicateReferences(references: VerseReference[]): VerseReference[] {
    const seen = new Set<string>();
    return references.filter(ref => {
      const key = `${ref.book}:${ref.chapter}:${ref.verse}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private getFootnoteVerseLink(footnote: ParsedFootnote, book: string, chapter: number): string {
    // Extract verse number from footnote ID (e.g., "note_1", "note_John_3_1")
    const idMatch = footnote.id.match(/(\d+)$/);
    if (idMatch) {
      const verseNumber = idMatch[1];
      return `[[${book} ${chapter}#${verseNumber}|↑]]`;
    }
    return '';
  }
  
  private processFootnoteContent(content: string, footnote?: ParsedFootnote): string {
    let processed = content;
    
    // First, process any data-ref elements (for backward compatibility)
    processed = processed.replace(
      /<data ref="Bible:([^"]+)">([^<]+)<\/data>/g,
      (_match, ref, display) => {
        // Parse the reference
        const refMatch = ref.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (refMatch) {
          const [, bookCode, chapterNum, verse] = refMatch;
          const book = this.expandBookCode(bookCode);
          
          return `[[${book} ${chapterNum}#${verse}|${display}]]`;
        }
        return display;
      }
    );
    
    // Remove any remaining HTML tags
    processed = processed.replace(/<[^>]+>/g, '');
    
    // Track which parts of the string have already been linked to avoid double-linking
    const linkedRanges: Array<{start: number, end: number}> = [];
    
    // If we have verse references, inject them as inline links
    if (footnote && footnote.verseReferences && footnote.verseReferences.length > 0) {
      // Sort references by length (longest first) to handle overlapping matches correctly
      const sortedRefs = [...footnote.verseReferences].sort((a, b) => 
        b.display.length - a.display.length
      );
      
      sortedRefs.forEach(ref => {
        const { book, chapter, verse, display } = ref;
        
        // Create the wiki link
        const wikiLink = `[[${book} ${chapter}#${verse}|${display}]]`;
        
        // Find all occurrences of the display text
        const regex = new RegExp(`\\b${display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        let match: RegExpExecArray | null;
        
        while ((match = regex.exec(processed)) !== null) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length;
          
          // Check if this range has already been linked
          const isAlreadyLinked = linkedRanges.some(range => 
            (matchStart >= range.start && matchStart < range.end) ||
            (matchEnd > range.start && matchEnd <= range.end)
          );
          
          if (!isAlreadyLinked) {
            // Replace this occurrence
            processed = processed.substring(0, matchStart) + wikiLink + processed.substring(matchEnd);
            
            // Track this range as linked
            linkedRanges.push({
              start: matchStart,
              end: matchStart + wikiLink.length
            });
            
            // Adjust existing ranges that come after this one
            linkedRanges.forEach(range => {
              if (range.start >= matchEnd) {
                const adjustment = wikiLink.length - match![0].length;
                range.start += adjustment;
                range.end += adjustment;
              }
            });
            
            // Reset regex lastIndex due to string modification
            regex.lastIndex = matchStart + wikiLink.length;
          }
        }
      });
    }
    
    // Handle same-chapter verse references (e.g., "1:4" in a John 1 footnote)
    // This should happen after the main verse reference processing
    const currentBook = this.extractBookFromFootnote(footnote);
    if (currentBook) {
      // Match patterns like "1:4", "3:16-17", etc. but not if already in a wiki link
      processed = processed.replace(
        /(?<!\[\[)(?<![#:])\b(\d+):(\d+)(?:-(\d+))?\b(?![^\[]*\]\])/g,
        (match, chapter, verse, endVerse) => {
          // Check if this is already part of a wiki link
          const beforeMatch = processed.substring(0, processed.indexOf(match));
          const afterMatch = processed.substring(processed.indexOf(match) + match.length);
          
          if (beforeMatch.lastIndexOf('[[') > beforeMatch.lastIndexOf(']]') ||
              afterMatch.indexOf(']]') < afterMatch.indexOf('[[')) {
            return match; // Already in a wiki link
          }
          
          if (endVerse) {
            return `[[${currentBook} ${chapter}#${verse}|${chapter}:${verse}-${endVerse}]]`;
          } else {
            return `[[${currentBook} ${chapter}#${verse}|${chapter}:${verse}]]`;
          }
        }
      );
    }
    
    return processed;
  }
  
  private extractBookFromFootnote(footnote?: ParsedFootnote): string | null {
    // Try to extract the book name from the footnote ID or verse references
    if (footnote && footnote.id) {
      // Check if ID contains book name pattern like "note_John_3_1"
      const bookMatch = footnote.id.match(/note_([A-Za-z]+)_\d+_\d+/);
      if (bookMatch) {
        return bookMatch[1];
      }
    }
    
    // Could also infer from verse references if needed
    // For now, return null if we can't determine the book
    return null;
  }
  
  private expandBookCode(code: string): string {
    const bookMap: { [key: string]: string } = {
      'Mt': 'Matthew',
      'Mk': 'Mark',
      'Lk': 'Luke',
      'Lu': 'Luke',
      'Jn': 'John',
      'Ac': 'Acts',
      'Ro': 'Romans',
      '1Co': '1 Corinthians',
      '2Co': '2 Corinthians',
      'Ga': 'Galatians',
      'Eph': 'Ephesians',
      'Php': 'Philippians',
      'Col': 'Colossians',
      '1Th': '1 Thessalonians',
      '2Th': '2 Thessalonians',
      '1Ti': '1 Timothy',
      '2Ti': '2 Timothy',
      'Tit': 'Titus',
      'Phm': 'Philemon',
      'Heb': 'Hebrews',
      'Jas': 'James',
      '1Pe': '1 Peter',
      '2Pe': '2 Peter',
      '1Jn': '1 John',
      '2Jn': '2 John',
      '3Jn': '3 John',
      'Jud': 'Jude',
      'Re': 'Revelation',
      'Ge': 'Genesis',
      'Ex': 'Exodus',
      'Le': 'Leviticus',
      'Nu': 'Numbers',
      'De': 'Deuteronomy',
      'Jos': 'Joshua',
      'Jdg': 'Judges',
      'Ru': 'Ruth',
      '1Sa': '1 Samuel',
      '2Sa': '2 Samuel',
      '1Ki': '1 Kings',
      '2Ki': '2 Kings',
      '1Ch': '1 Chronicles',
      '2Ch': '2 Chronicles',
      'Ezr': 'Ezra',
      'Ne': 'Nehemiah',
      'Es': 'Esther',
      'Job': 'Job',
      'Ps': 'Psalms',
      'Pr': 'Proverbs',
      'Ec': 'Ecclesiastes',
      'So': 'Song of Solomon',
      'Is': 'Isaiah',
      'Jer': 'Jeremiah',
      'La': 'Lamentations',
      'Eze': 'Ezekiel',
      'Da': 'Daniel',
      'Ho': 'Hosea',
      'Joe': 'Joel',
      'Am': 'Amos',
      'Ob': 'Obadiah',
      'Jon': 'Jonah',
      'Mic': 'Micah',
      'Na': 'Nahum',
      'Hab': 'Habakkuk',
      'Zep': 'Zephaniah',
      'Hag': 'Haggai',
      'Zec': 'Zechariah',
      'Mal': 'Malachi'
    };
    
    return bookMap[code] || code;
  }
  
  // Note: This method is kept for testing purposes, but cross-references are now handled inline
  // @ts-ignore: Method used in tests
  private generateVerseLink(ref: VerseReference): string {
    const { book, chapter, verse, endVerse } = ref;
    
    if (verse && endVerse) {
      return `[[${book} ${chapter}#${verse}|${ref.display}]]`;
    } else if (verse) {
      return `[[${book} ${chapter}#${verse}|${ref.display}]]`;
    } else {
      return `[[${book} ${chapter}|${ref.display}]]`;
    }
  }

  private isOldTestament(bookName: string): boolean {
    const newTestamentBooks = [
      'Matthew', 'Mark', 'Luke', 'John', 'Acts',
      'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
      'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
      '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
      'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
      '1 John', '2 John', '3 John', 'Jude', 'Revelation'
    ];
    
    return !newTestamentBooks.includes(bookName);
  }
}

export function createMarkdownGenerator(style: OutputStyle, version: BibleVersion): MarkdownGenerator {
  return new MarkdownGenerator(style, version);
}