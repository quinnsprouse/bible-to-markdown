import * as cheerio from 'cheerio';
import { BibleVersion, ParsedChapter, ParsedSection, ParsedVerse } from '../types/index.js';

export class BibleParser {
  readonly version: BibleVersion;

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
      
      // IDs look like "netText_1_Chronicles_1" or "netText_Song_of_Solomon_1"
      const match = chunkId.match(/^(?:netText|nasb|net_strongs2)_(.+)_(\d+)$/);
      if (!match) return;
      
      const [, bookName, chapterNum] = match;
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
    let lastVerse: ParsedVerse | null = null;
    
    // Walk titles and verses in document order rather than relying on the
    // .bodytext wrappers: the API sometimes nests a .paragraphtitle <div>
    // inside a <p class="bodytext">, which the HTML parser closes early,
    // leaving the rest of that paragraph's verses outside any .bodytext
    $(chunkEl).find('.paragraphtitle, .netVerse').each((_, el) => {
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
      } else {
        const verse = this.parseVerse($, el);
        if (!verse) return;
        
        // Poetry splits one verse into several .netVerse spans sharing an
        // ID (one per line) - merge them back into a single verse
        if (lastVerse && lastVerse.id === verse.id && lastVerse.number === verse.number) {
          lastVerse.text += ' ' + verse.text;
          lastVerse.footnoteNumbers = [...(lastVerse.footnoteNumbers || []), ...(verse.footnoteNumbers || [])];
          return;
        }
        lastVerse = verse;
        
        if (!currentSection) {
          currentSection = { verses: [] };
        }
        
        currentSection.verses.push(verse);
      }
    });
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private parseVerse($: cheerio.CheerioAPI, verseEl: any): ParsedVerse | null {
    const $verse = $(verseEl);
    const id = $verse.attr('id') || '';
    
    // Extract verse number from the alt attribute (format: Book_Chapter_Verse)
    // or the ID (format: <prefix>_Book_Chapter_Verse)
    let verseNumber: number;
    const alt = $verse.attr('alt') || '';
    const idMatch = alt.match(/_\d+_(\d+)$/) || id.match(/_\d+_(\d+)$/);
    
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
          return null; // Skip if no verse number found
        }
      }
    }
    
    // Extract clean text and footnote references
    const text = this.extractCleanText($verse);
    const footnoteNumbers = this.extractFootnoteNumbers($, $verse);
    
    if (!text.trim()) {
      return null;
    }
    
    return {
      number: verseNumber,
      text: text.trim(),
      id,
      footnoteNumbers
    };
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

  getVersionHtml(bible1: string, _bible2: string): string {
    // The API always returns the translation requested as bible1Translation
    // in bible1, and the API service requests the selected version there
    return bible1;
  }
}

export function createParser(version: BibleVersion): BibleParser {
  return new BibleParser(version);
}