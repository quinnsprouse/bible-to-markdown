import * as cheerio from 'cheerio';
import { BibleVersion, ParsedChapter, ParsedSection, ParsedVerse } from '../types/index.js';

export class BibleParser {
  private version: BibleVersion;

  constructor(version: BibleVersion) {
    this.version = version;
  }

  parseChapters(html: string): ParsedChapter[] {
    const $ = cheerio.load(html);
    const chapters: ParsedChapter[] = [];
    
    // Find all chapter chunks
    $('.chunk').each((_, chunkEl) => {
      const chunkId = $(chunkEl).attr('id');
      if (!chunkId) return;
      
      const match = chunkId.match(/(\w+)_(.+?)_(\d+)$/);
      if (!match) return;
      
      const [, , bookName, chapterNum] = match;
      const book = bookName.replace(/_/g, ' ');
      const chapter = parseInt(chapterNum);
      
      const sections = this.parseSections($, chunkEl);
      
      chapters.push({
        book,
        chapter,
        sections
      });
    });
    
    return chapters;
  }

  private parseSections($: cheerio.CheerioAPI, chunkEl: any): ParsedSection[] {
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    
    $(chunkEl).children().each((_, el) => {
      const $el = $(el);
      
      // Check for section title
      if ($el.hasClass('paragraphtitle')) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        const title = $el.find('h3').text().trim();
        currentSection = {
          title: title || undefined,
          verses: []
        };
      } else if ($el.hasClass('bodytext')) {
        // Parse verses in this paragraph
        const verses = this.parseVerses($, el);
        
        if (!currentSection) {
          currentSection = { verses: [] };
        }
        
        currentSection.verses.push(...verses);
      }
    });
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private parseVerses($: cheerio.CheerioAPI, bodyEl: any): ParsedVerse[] {
    const verses: ParsedVerse[] = [];
    
    $(bodyEl).find('.netVerse').each((_, verseEl) => {
      const $verse = $(verseEl);
      const id = $verse.attr('id') || '';
      
      // Extract verse number from ID (format: netText_Book_Chapter_Verse)
      let verseNumber: number;
      const idMatch = id.match(/netText_\w+_\d+_(\d+)$/);
      
      if (idMatch) {
        verseNumber = parseInt(idMatch[1]);
      } else {
        // Fallback to checking for explicit verse number elements
        const verseNumEl = $verse.find('.verseNumber');
        if (verseNumEl.length) {
          verseNumber = parseInt(verseNumEl.text().trim());
        } else {
          // Check for chapter number (verse 1)
          const chapterNumEl = $verse.find('.chapterNumber');
          if (chapterNumEl.length) {
            verseNumber = parseInt(chapterNumEl.text().trim());
          } else {
            return; // Skip if no verse number found
          }
        }
      }
      
      // Extract clean text and footnote references
      const text = this.extractCleanText($verse);
      const footnoteNumbers = this.extractFootnoteNumbers($, $verse);
      
      if (text.trim()) {
        verses.push({
          number: verseNumber,
          text: text.trim(),
          id,
          footnoteNumbers
        });
      }
    });
    
    return verses;
  }

  private extractFootnoteNumbers($: cheerio.CheerioAPI, $verse: cheerio.Cheerio<any>): number[] {
    const footnoteNumbers: number[] = [];
    
    // Find all footnote references in this verse
    $verse.find('a.netNoteSuper').each((_, el) => {
      const footnoteNum = parseInt($(el).text().trim());
      if (!isNaN(footnoteNum)) {
        footnoteNumbers.push(footnoteNum);
      }
    });
    
    return footnoteNumbers;
  }

  private extractCleanText($verse: cheerio.Cheerio<any>): string {
    // Get a fresh copy of the verse HTML
    let html = $verse.html() || '';
    
    // Remove verse/chapter number spans
    html = html.replace(/<span class="vref">.*?<\/span>/g, '');
    
    // Remove footnote markers
    html = html.replace(/<sup>.*?<\/sup>/g, '');
    html = html.replace(/<a[^>]*class="netNoteSuper"[^>]*>.*?<\/a>/g, '');
    
    // Remove Strong's number wrapper but keep text
    html = html.replace(/<st[^>]*>(.*?)<\/st>/g, '$1');
    
    // Load clean HTML and extract text
    const $ = cheerio.load(html);
    let text = $.text();
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove any remaining artifacts
    text = text.replace(/^\d+\s*/, ''); // Remove leading numbers
    
    return text;
  }

  getVersionHtml(bible1: string, bible2: string): string {
    return this.version === 'NET' ? bible1 : bible2;
  }
}

export function createParser(version: BibleVersion): BibleParser {
  return new BibleParser(version);
}